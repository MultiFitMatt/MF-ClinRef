const functions = require("firebase-functions");

// Simple test function
exports.clinref = functions.https.onRequest((req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  
  const path = req.path.replace("/", "");
  
  if (path === "calculate-preview" || path === "api/calculate-preview") {
    const { dose = 50, freq = 3.5, weight = 200 } = req.body || {};
    
    // Simple PK calculation
    const clampedDose = Math.min(Math.max(dose, 20), 150);
    const clampedFreq = Math.min(Math.max(freq, 2), 7);
    const clampedWeight = Math.min(Math.max(weight, 150), 250);
    
    const HL = 8;
    const k = Math.log(2) / HL;
    const ka = 1.2;
    const weightFactor = 180 / clampedWeight;
    
    const cypData = [];
    let minLevel = Infinity, maxLevel = 0;
    
    for (let i = 0; i <= 75; i++) {
      const day = (i / 75) * 7;
      let level = 0;
      
      for (let tDose = -40; tDose <= day; tDose += clampedFreq) {
        const t = day - tDose;
        if (t >= 0) {
          level += (clampedDose * weightFactor) * 11 * (Math.exp(-k * t) - Math.exp(-ka * t));
        }
      }
      
      cypData.push({ x: day, y: level });
      if (level < minLevel) minLevel = level;
      if (level > maxLevel) maxLevel = level;
    }
    
    return res.json({
      curves: { cyp: cypData },
      stats: {
        peak: Math.round(maxLevel),
        trough: Math.round(minLevel),
        variance: Math.round(((maxLevel - minLevel) / maxLevel) * 100)
      }
    });
  }
  
  return res.json({ status: "ok", path });
});
