"use strict";
/**
 * Multifactor Clinical Reference - Backend Functions
 *
 * ⚠️ PROPRIETARY - All PK calculations and constants are hidden here
 * This code never reaches the client browser
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.health = exports.getProtocols = exports.calculatePK = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
admin.initializeApp();
const corsHandler = (0, cors_1.default)({ origin: true });
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
        isFree: true // FREE PREVIEW
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
function calculateSerumLevel(timeDays, dose, halfLife, interval, weight) {
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
function calculatePelletLevel(timeDays, totalDose, weight) {
    const weightFactor = PK_CONSTANTS.REF_WEIGHT / weight;
    const dailyRelease = totalDose / 120;
    const baseLevel = dailyRelease * weightFactor * 8;
    const fluctuation = Math.sin(timeDays * 0.1) * 30;
    return baseLevel + fluctuation;
}
/**
 * Generate oral Jatenzo PK curve (high fluctuation BID dosing)
 */
function calculateOralLevel(timeDays) {
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
exports.calculatePK = functions.https.onRequest((req, res) => {
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
            const protocolConfig = PROTOCOL_DEFAULTS[protocol];
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
                }
                catch (error) {
                    res.status(401).json({ error: 'Invalid authentication token' });
                    return;
                }
            }
            // Generate PK data
            const data = [];
            let minLevel = Infinity;
            let maxLevel = -Infinity;
            const halfLife = protocolConfig.halfLife;
            for (let i = 0; i <= PK_CONSTANTS.CHART_STEPS; i++) {
                const day = (i / PK_CONSTANTS.CHART_STEPS) * PK_CONSTANTS.CHART_DURATION;
                let level;
                if (protocol === 'pellet') {
                    level = calculatePelletLevel(day, dose, weight);
                }
                else if (protocol === 'oral') {
                    level = calculateOralLevel(day);
                }
                else {
                    level = calculateSerumLevel(day, dose, halfLife, freq, weight);
                }
                data.push({ x: day, y: level });
                if (level < minLevel)
                    minLevel = level;
                if (level > maxLevel)
                    maxLevel = level;
            }
            // Calculate stats
            const variance = ((maxLevel - minLevel) / maxLevel) * 100;
            // Calculate Rx info
            const volumePerDose = dose / (conc || protocolConfig.conc);
            const weeklyDose = (dose / freq) * 7;
            // Generate comparison data if requested (for authenticated users)
            let comparisonData;
            if (includeComparison) {
                comparisonData = {};
                for (const [key, config] of Object.entries(PROTOCOL_DEFAULTS)) {
                    if (key !== protocol) {
                        const compData = [];
                        for (let i = 0; i <= PK_CONSTANTS.CHART_STEPS; i++) {
                            const day = (i / PK_CONSTANTS.CHART_STEPS) * PK_CONSTANTS.CHART_DURATION;
                            let level;
                            if (key === 'pellet') {
                                level = calculatePelletLevel(day, config.dose, PK_CONSTANTS.REF_WEIGHT);
                            }
                            else if (key === 'oral') {
                                level = calculateOralLevel(day);
                            }
                            else {
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
        }
        catch (error) {
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
exports.getProtocols = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            const authHeader = req.headers.authorization;
            let isAuthenticated = false;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.split('Bearer ')[1];
                    await admin.auth().verifyIdToken(token);
                    isAuthenticated = true;
                }
                catch (error) {
                    // Not authenticated, continue with limited response
                }
            }
            const protocols = {};
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
                }
                else {
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
        }
        catch (error) {
            console.error('Error in getProtocols:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});
/**
 * Health check endpoint
 */
exports.health = functions.https.onRequest((req, res) => {
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
exports.api = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        const path = req.path.replace('/api', '');
        switch (path) {
            case '/calculatePK':
                return (0, exports.calculatePK)(req, res);
            case '/getProtocols':
                return (0, exports.getProtocols)(req, res);
            case '/health':
                return (0, exports.health)(req, res);
            default:
                res.status(404).json({ error: 'Endpoint not found' });
        }
    });
});
//# sourceMappingURL=index.js.map