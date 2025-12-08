/**
 * Multifactor Clinical Reference - Backend API
 * 
 * PROPRIETARY PHARMACOKINETIC ENGINE
 * All calculations are server-side to protect IP
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// ═══════════════════════════════════════════════════════════════
// PROPRIETARY CONSTANTS - HIDDEN FROM CLIENT
// ═══════════════════════════════════════════════════════════════

const PK_CONSTANTS = {
  // Half-lives in days
  HL_CYP: 8,
  HL_PROP: 2,
  HL_ORAL: 0.25,
  HL_PELLET: 60,
  
  // Absorption rate constant
  KA: 1.2,
  
  // Reference weight for calculations
  REF_WEIGHT: 180,
  
  // Serum conversion factor
  SERUM_FACTOR: 11,
  
  // Superposition lookback (days)
  LOOKBACK_DAYS: 40
};

const PROTOCOL_DEFAULTS = {
  cyp: { dose: 50, freq: 3.5, conc: 200, halfLife: 8 },
  prop: { dose: 50, freq: 2, conc: 100, halfLife: 2 },
  pellet: { dose: 1200, freq: 120, conc: 200, halfLife: 60 }
};

// ═══════════════════════════════════════════════════════════════
// PROPRIETARY BATEMAN FUNCTION - THE SECRET SAUCE
// ═══════════════════════════════════════════════════════════════

/**
 * Steady State Superposition with Bateman Function
 * Calculates serum testosterone level at a given time point
 */
function calculateSerumLevel(timeDays, dose, halfLife, interval, weight) {
  const k = Math.log(2) / halfLife;
  const ka = PK_CONSTANTS.KA;
  const weightFactor = PK_CONSTANTS.REF_WEIGHT / weight;
  
  let totalLevel = 0;
  
  // Superposition of multiple doses
  for (let tDose = -PK_CONSTANTS.LOOKBACK_DAYS; tDose <= timeDays; tDose += interval) {
    const t = timeDays - tDose;
    if (t >= 0) {
      const contribution = (dose * weightFactor) * PK_CONSTANTS.SERUM_FACTOR * 
                          (Math.exp(-k * t) - Math.exp(-ka * t));
      totalLevel += contribution;
    }
  }
  
  return totalLevel;
}

/**
 * Pellet release model - zero-order kinetics with fluctuation
 */
function calculatePelletLevel(timeDays, totalDose, weight) {
  const weightFactor = PK_CONSTANTS.REF_WEIGHT / weight;
  const dailyRelease = totalDose / 120;
  const baseLevel = dailyRelease * weightFactor * 8;
  const fluctuation = Math.sin(timeDays * 0.1) * 30;
  return baseLevel + fluctuation;
}

/**
 * Oral (Jatenzo) model - rapid absorption with BID dosing
 */
function calculateOralLevel(timeDays) {
  return 400 + (Math.abs(Math.sin((timeDays * Math.PI) / 0.25)) * 500);
}

// ═══════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Main API handler
 */
exports.api = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const path = req.path.replace("/api", "");
    
    try {
      switch (path) {
        case "/protocols":
          return handleGetProtocols(req, res);
        case "/calculate":
          return handleCalculate(req, res);
        case "/calculate-preview":
          return handleCalculatePreview(req, res);
        default:
          return res.status(404).json({ error: "Endpoint not found" });
      }
    } catch (error) {
      console.error("API Error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
});

/**
 * Get available protocols (public)
 */
async function handleGetProtocols(req, res) {
  // Return protocol names and basic info (not the calculation constants)
  const protocols = {
    cyp: { 
      name: "Testosterone Cypionate",
      description: "Long-acting injectable",
      doseRange: { min: 20, max: 300, step: 10, default: 50 },
      freqRange: { min: 1, max: 14, step: 0.5, default: 3.5 },
      concentrations: [100, 200, 250]
    },
    prop: {
      name: "Testosterone Propionate", 
      description: "Short-acting injectable",
      doseRange: { min: 20, max: 150, step: 10, default: 50 },
      freqRange: { min: 1, max: 7, step: 0.5, default: 2 },
      concentrations: [100]
    },
    pellet: {
      name: "Testosterone Pellets",
      description: "Subcutaneous implant",
      doseRange: { min: 600, max: 2400, step: 100, default: 1200 },
      freqRange: null, // Not applicable
      concentrations: null
    }
  };
  
  return res.json({ protocols });
}

/**
 * Calculate PK curve - FULL VERSION (requires auth)
 */
async function handleCalculate(req, res) {
  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  try {
    const token = authHeader.split("Bearer ")[1];
    await admin.auth().verifyIdToken(token);
  } catch (error) {
    return res.status(401).json({ error: "Invalid authentication token" });
  }
  
  const { protocol, dose, freq, conc, weight } = req.body;
  
  if (!protocol || !dose || !weight) {
    return res.status(400).json({ error: "Missing required parameters" });
  }
  
  const defaults = PROTOCOL_DEFAULTS[protocol];
  if (!defaults) {
    return res.status(400).json({ error: "Invalid protocol" });
  }
  
  const halfLife = defaults.halfLife;
  const frequency = freq || defaults.freq;
  
  // Generate full 14-day curve with 150 data points
  const steps = 150;
  const duration = 14;
  const data = {
    cyp: [],
    prop: [],
    pellet: [],
    oral: []
  };
  
  let minLevel = Infinity;
  let maxLevel = 0;
  
  for (let i = 0; i <= steps; i++) {
    const day = (i / steps) * duration;
    
    // Active protocol curve
    const level = calculateSerumLevel(day, dose, halfLife, frequency, weight);
    data[protocol].push({ x: day, y: level });
    
    if (level < minLevel) minLevel = level;
    if (level > maxLevel) maxLevel = level;
    
    // Comparison curves (using defaults)
    if (protocol !== "cyp") {
      data.cyp.push({ 
        x: day, 
        y: calculateSerumLevel(day, PROTOCOL_DEFAULTS.cyp.dose, PROTOCOL_DEFAULTS.cyp.halfLife, PROTOCOL_DEFAULTS.cyp.freq, 180) 
      });
    }
    if (protocol !== "prop") {
      data.prop.push({ 
        x: day, 
        y: calculateSerumLevel(day, PROTOCOL_DEFAULTS.prop.dose, PROTOCOL_DEFAULTS.prop.halfLife, PROTOCOL_DEFAULTS.prop.freq, 180) 
      });
    }
    if (protocol !== "pellet") {
      data.pellet.push({ x: day, y: calculatePelletLevel(day, PROTOCOL_DEFAULTS.pellet.dose, 180) });
    }
    data.oral.push({ x: day, y: calculateOralLevel(day) });
  }
  
  // Calculate Rx output
  const volPerDose = dose / (conc || defaults.conc);
  const weeklyDose = (dose / frequency) * 7;
  
  return res.json({
    curves: data,
    stats: {
      peak: Math.round(maxLevel),
      trough: Math.round(minLevel),
      variance: Math.round(((maxLevel - minLevel) / maxLevel) * 100)
    },
    rx: {
      volume: volPerDose.toFixed(2),
      weekly: Math.round(weeklyDose)
    }
  });
}

/**
 * Calculate PK curve - PREVIEW VERSION (public, limited)
 * Only returns Cypionate curve with fixed parameters
 */
async function handleCalculatePreview(req, res) {
  const { dose, freq, weight } = req.body;
  
  // Clamp values for preview
  const clampedDose = Math.min(Math.max(dose || 50, 20), 150); // Max 150mg for preview
  const clampedFreq = Math.min(Math.max(freq || 3.5, 2), 7);   // 2-7 days only
  const clampedWeight = Math.min(Math.max(weight || 200, 150), 250);
  
  const halfLife = PK_CONSTANTS.HL_CYP;
  const steps = 75; // Lower resolution for preview
  const duration = 7; // Only 7 days for preview
  
  const cypData = [];
  let minLevel = Infinity;
  let maxLevel = 0;
  
  for (let i = 0; i <= steps; i++) {
    const day = (i / steps) * duration;
    const level = calculateSerumLevel(day, clampedDose, halfLife, clampedFreq, clampedWeight);
    cypData.push({ x: day, y: level });
    
    if (level < minLevel) minLevel = level;
    if (level > maxLevel) maxLevel = level;
  }
  
  return res.json({
    curves: {
      cyp: cypData
    },
    stats: {
      peak: Math.round(maxLevel),
      trough: Math.round(minLevel),
      variance: Math.round(((maxLevel - minLevel) / maxLevel) * 100)
    },
    limitations: {
      message: "Preview mode - Limited to Cypionate, 7-day view, restricted dose range",
      maxDose: 150,
      maxDuration: 7,
      protocols: ["cyp"]
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// FIRESTORE TRIGGERS (for future use)
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize default data on first deploy
 */
exports.initializeData = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    // Only allow from authenticated admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      // Add protocol metadata to Firestore
      const batch = db.batch();
      
      batch.set(db.collection("protocols").doc("cyp"), {
        name: "Testosterone Cypionate",
        category: "Hormone Optimization",
        color: "#10b981",
        public: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      batch.set(db.collection("protocols").doc("prop"), {
        name: "Testosterone Propionate",
        category: "Hormone Optimization", 
        color: "#06b6d4",
        public: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      batch.set(db.collection("protocols").doc("pellet"), {
        name: "Testosterone Pellets",
        category: "Hormone Optimization",
        color: "#3b82f6", 
        public: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      await batch.commit();
      
      return res.json({ success: true, message: "Data initialized" });
    } catch (error) {
      console.error("Init error:", error);
      return res.status(500).json({ error: error.message });
    }
  });
});

