/**
 * Multifactor Clinical Reference - Backend Functions
 * 
 * ⚠️ PROPRIETARY - All PK calculations and constants are hidden here
 * This code never reaches the client browser
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';

admin.initializeApp();

const corsHandler = cors({ origin: true });

// ═══════════════════════════════════════════════════════════════════════════
// PROPRIETARY CONSTANTS - NEVER EXPOSED TO CLIENT
// ═══════════════════════════════════════════════════════════════════════════

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
  
  // Bioavailability multiplier
  BIOAVAILABILITY: 11,
  
  // Simulation parameters
  LOOKBACK_DAYS: 40,
  CHART_DURATION: 14,
  CHART_STEPS: 150,
};

const PROTOCOL_DEFAULTS = {
  cyp: { 
    dose: 50, 
    freq: 3.5, 
    conc: 200,
    halfLife: PK_CONSTANTS.HL_CYP,
    name: 'Testosterone Cypionate',
    color: '#10b981',
    isFree: true  // FREE PREVIEW
  },
  prop: { 
    dose: 50, 
    freq: 2, 
    conc: 100,
    halfLife: PK_CONSTANTS.HL_PROP,
    name: 'Testosterone Propionate',
    color: '#06b6d4',
    isFree: false
  },
  pellet: { 
    dose: 1200, 
    freq: 120, 
    conc: 200,
    halfLife: PK_CONSTANTS.HL_PELLET,
    name: 'Testosterone Pellets',
    color: '#3b82f6',
    isFree: false
  },
  oral: {
    dose: 237,
    freq: 0.5, // BID
    conc: 1,
    halfLife: PK_CONSTANTS.HL_ORAL,
    name: 'Jatenzo (Oral)',
    color: '#f59e0b',
    isFree: false
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PROPRIETARY PK CALCULATIONS - BATEMAN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate serum testosterone level using Bateman function
 * with steady-state superposition
 */
function calculateSerumLevel(
  timeDays: number,
  dose: number,
  halfLife: number,
  interval: number,
  weight: number
): number {
  const k = Math.log(2) / halfLife;
  const ka = PK_CONSTANTS.KA;
  const weightFactor = PK_CONSTANTS.REF_WEIGHT / weight;

  let totalLevel = 0;

  // Superposition of multiple doses for steady state
  for (let tDose = -PK_CONSTANTS.LOOKBACK_DAYS; tDose <= timeDays; tDose += interval) {
    const t = timeDays - tDose;
    if (t >= 0) {
      const contribution = (dose * weightFactor) * PK_CONSTANTS.BIOAVAILABILITY * 
        (Math.exp(-k * t) - Math.exp(-ka * t));
      totalLevel += contribution;
    }
  }

  return totalLevel;
}

/**
 * Calculate pellet release (zero-order kinetics with fluctuation)
 */
function calculatePelletLevel(
  timeDays: number,
  totalDose: number,
  weight: number
): number {
  const weightFactor = PK_CONSTANTS.REF_WEIGHT / weight;
  const dailyRelease = totalDose / 120;
  const baseLevel = dailyRelease * weightFactor * 8;
  const fluctuation = Math.sin(timeDays * 0.1) * 30;
  return baseLevel + fluctuation;
}

/**
 * Generate oral Jatenzo PK curve (high fluctuation BID dosing)
 */
function calculateOralLevel(timeDays: number): number {
  return 400 + (Math.abs(Math.sin((timeDays * Math.PI) / 0.25)) * 500);
}

// ═══════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate PK data for chart visualization
 * 
 * POST /api/calculatePK
 * Body: { protocol: string, dose: number, freq: number, weight: number, conc: number }
 * 
 * Returns: { data: [{x, y}], stats: {peak, trough, variance}, rx: {volume, weekly} }
 */
export const calculatePK = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Verify request method
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const { protocol, dose, freq, weight, conc, includeComparison } = req.body;

      // Validate inputs
      if (!protocol || !dose || !freq || !weight) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      // Check if this is a paid protocol and user is authenticated
      const protocolConfig = PROTOCOL_DEFAULTS[protocol as keyof typeof PROTOCOL_DEFAULTS];
      if (!protocolConfig) {
        res.status(400).json({ error: 'Invalid protocol' });
        return;
      }

      // For non-free protocols, verify authentication
      if (!protocolConfig.isFree) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ error: 'Authentication required for this protocol' });
          return;
        }
        
        try {
          const token = authHeader.split('Bearer ')[1];
          await admin.auth().verifyIdToken(token);
        } catch (error) {
          res.status(401).json({ error: 'Invalid authentication token' });
          return;
        }
      }

      // Generate PK data
      const data: Array<{x: number, y: number}> = [];
      let minLevel = Infinity;
      let maxLevel = -Infinity;

      const halfLife = protocolConfig.halfLife;

      for (let i = 0; i <= PK_CONSTANTS.CHART_STEPS; i++) {
        const day = (i / PK_CONSTANTS.CHART_STEPS) * PK_CONSTANTS.CHART_DURATION;
        
        let level: number;
        if (protocol === 'pellet') {
          level = calculatePelletLevel(day, dose, weight);
        } else if (protocol === 'oral') {
          level = calculateOralLevel(day);
        } else {
          level = calculateSerumLevel(day, dose, halfLife, freq, weight);
        }

        data.push({ x: day, y: level });

        if (level < minLevel) minLevel = level;
        if (level > maxLevel) maxLevel = level;
      }

      // Calculate stats
      const variance = ((maxLevel - minLevel) / maxLevel) * 100;

      // Calculate Rx info
      const volumePerDose = dose / (conc || protocolConfig.conc);
      const weeklyDose = (dose / freq) * 7;

      // Generate comparison data if requested (for authenticated users)
      let comparisonData: Record<string, Array<{x: number, y: number}>> | undefined;
      
      if (includeComparison) {
        comparisonData = {};
        
        for (const [key, config] of Object.entries(PROTOCOL_DEFAULTS)) {
          if (key !== protocol) {
            const compData: Array<{x: number, y: number}> = [];
            
            for (let i = 0; i <= PK_CONSTANTS.CHART_STEPS; i++) {
              const day = (i / PK_CONSTANTS.CHART_STEPS) * PK_CONSTANTS.CHART_DURATION;
              
              let level: number;
              if (key === 'pellet') {
                level = calculatePelletLevel(day, config.dose, PK_CONSTANTS.REF_WEIGHT);
              } else if (key === 'oral') {
                level = calculateOralLevel(day);
              } else {
                level = calculateSerumLevel(day, config.dose, config.halfLife, config.freq, PK_CONSTANTS.REF_WEIGHT);
              }
              
              compData.push({ x: day, y: level });
            }
            
            comparisonData[key] = compData;
          }
        }
      }

      res.json({
        data,
        stats: {
          peak: Math.round(maxLevel),
          trough: Math.round(minLevel),
          variance: Math.round(variance)
        },
        rx: {
          volume: volumePerDose.toFixed(2),
          weekly: Math.round(weeklyDose)
        },
        comparison: comparisonData
      });

    } catch (error) {
      console.error('Error in calculatePK:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

/**
 * Get available protocols
 * 
 * GET /api/getProtocols
 * 
 * Returns list of protocols with isFree flag
 * Full config only returned for authenticated users
 */
export const getProtocols = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const authHeader = req.headers.authorization;
      let isAuthenticated = false;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split('Bearer ')[1];
          await admin.auth().verifyIdToken(token);
          isAuthenticated = true;
        } catch (error) {
          // Not authenticated, continue with limited response
        }
      }

      const protocols: Record<string, any> = {};

      for (const [key, config] of Object.entries(PROTOCOL_DEFAULTS)) {
        if (isAuthenticated || config.isFree) {
          protocols[key] = {
            name: config.name,
            color: config.color,
            isFree: config.isFree,
            defaults: {
              dose: config.dose,
              freq: config.freq,
              conc: config.conc
            }
          };
        } else {
          // Show limited info for non-authenticated users
          protocols[key] = {
            name: config.name,
            color: config.color,
            isFree: config.isFree,
            locked: true
          };
        }
      }

      res.json({ protocols, authenticated: isAuthenticated });

    } catch (error) {
      console.error('Error in getProtocols:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

/**
 * Health check endpoint
 */
export const health = functions.https.onRequest((req, res) => {
  corsHandler(req, res, () => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED API HANDLER (for Firebase Hosting rewrites)
// ═══════════════════════════════════════════════════════════════════════════

export const api = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const path = req.path.replace('/api', '');
    
    switch (path) {
      case '/calculatePK':
        return calculatePK(req, res);
      case '/getProtocols':
        return getProtocols(req, res);
      case '/health':
        return health(req, res);
      default:
        res.status(404).json({ error: 'Endpoint not found' });
    }
  });
});

