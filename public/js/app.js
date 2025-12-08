/**
 * Multifactor Clinical Reference - Frontend Application
 * 
 * All PK calculations happen on the backend.
 * This file handles UI, user input, and API calls.
 */

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let currentUser = null;
let currentProtocol = 'cyp';
let pkChart = null;
let isSignUpMode = false;

const state = {
    dose: 50,
    freq: 3.5,
    weight: 200,
    conc: 200
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════

// Listen for auth state changes
auth.onAuthStateChanged((user) => {
    currentUser = user;
    updateAuthUI();
    
    if (user) {
        // Unlock premium features
        unlockPremiumFeatures();
        // Re-fetch data with auth
        updateSimulation();
    } else {
        // Lock premium features
        lockPremiumFeatures();
    }
});

function updateAuthUI() {
    const authStatus = document.getElementById('auth-status');
    const loginBtn = document.getElementById('login-btn');
    
    if (currentUser) {
        authStatus.innerHTML = `
            <span class="text-green-400">●</span>
            <span class="text-gray-300">${currentUser.email}</span>
        `;
        loginBtn.textContent = 'Sign Out';
        loginBtn.onclick = signOut;
    } else {
        authStatus.innerHTML = '';
        loginBtn.textContent = 'Sign In';
        loginBtn.onclick = showLoginModal;
    }
}

function showLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
}

function hideLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('auth-error').classList.add('hidden');
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    
    try {
        errorEl.classList.add('hidden');
        
        if (isSignUpMode) {
            await auth.createUserWithEmailAndPassword(email, password);
        } else {
            await auth.signInWithEmailAndPassword(email, password);
        }
        
        hideLoginModal();
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
    }
}

async function handleGoogleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
        hideLoginModal();
    } catch (error) {
        const errorEl = document.getElementById('auth-error');
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
    }
}

async function signOut() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

function toggleSignUpMode() {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-submit').textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    document.getElementById('toggle-signup').textContent = isSignUpMode ? 'Sign in' : 'Sign up';
}

function unlockPremiumFeatures() {
    // Unlock protocol tabs
    document.querySelectorAll('.proto-tab.locked').forEach(tab => {
        tab.classList.remove('locked');
    });
    
    // Unlock legend buttons
    document.querySelectorAll('.legend-btn.locked').forEach(btn => {
        btn.classList.remove('locked');
        btn.innerHTML = btn.innerHTML.replace(' 🔒', '');
    });
}

function lockPremiumFeatures() {
    // Lock non-free protocol tabs
    ['tab-prop', 'tab-pellet'].forEach(id => {
        const tab = document.getElementById(id);
        if (tab && !tab.classList.contains('active')) {
            tab.classList.add('locked');
        }
    });
    
    // Lock legend buttons
    ['legend-prop', 'legend-pellet'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn && !btn.innerHTML.includes('🔒')) {
            btn.classList.add('locked');
            btn.innerHTML += ' 🔒';
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════════════════════════════════════════

async function getAuthToken() {
    if (currentUser) {
        return await currentUser.getIdToken();
    }
    return null;
}

async function fetchPKData() {
    const loadingEl = document.getElementById('chart-loading');
    loadingEl.classList.remove('hidden');
    
    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const token = await getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_BASE}/calculatePK`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                protocol: currentProtocol,
                dose: state.dose,
                freq: state.freq,
                weight: state.weight,
                conc: state.conc,
                includeComparison: !!currentUser
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API error');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        // Show error to user
        return null;
    } finally {
        loadingEl.classList.add('hidden');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CHART
// ═══════════════════════════════════════════════════════════════════════════

function initChart() {
    const ctx = document.getElementById('pkChart').getContext('2d');
    
    const gradCyp = ctx.createLinearGradient(0, 0, 0, 400);
    gradCyp.addColorStop(0, 'rgba(16,185,129,0.3)');
    gradCyp.addColorStop(1, 'rgba(16,185,129,0.0)');

    pkChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Cypionate',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: gradCyp,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                },
                {
                    label: 'Propionate',
                    data: [],
                    borderColor: '#06b6d4',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    fill: false,
                    pointRadius: 0,
                    hidden: true
                },
                {
                    label: 'Pellets',
                    data: [],
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false,
                    pointRadius: 0,
                    hidden: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#1a1a1a',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + Math.round(context.raw.y) + ' ng/dL';
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    grid: { color: '#1a1a1a' },
                    ticks: {
                        color: '#6b7280',
                        callback: function(val) { return 'Day ' + val; }
                    },
                    max: 14
                },
                y: {
                    grid: { color: '#1a1a1a' },
                    suggestedMin: 0,
                    suggestedMax: 1500,
                    ticks: {
                        color: '#6b7280',
                        stepSize: 500
                    }
                }
            }
        }
    });
}

function updateChart(data, comparison) {
    if (!pkChart) return;
    
    // Update main data
    pkChart.data.datasets[0].data = data;
    
    // Update comparison data if available
    if (comparison) {
        if (comparison.prop) {
            pkChart.data.datasets[1].data = comparison.prop;
        }
        if (comparison.pellet) {
            pkChart.data.datasets[2].data = comparison.pellet;
        }
    }
    
    pkChart.update();
}

function updateStats(stats) {
    document.getElementById('stat-peak').textContent = stats.peak + ' ng/dL';
    document.getElementById('stat-trough').textContent = stats.trough + ' ng/dL';
    
    const varianceEl = document.getElementById('stat-variance');
    varianceEl.textContent = stats.variance + '%';
    
    // Color code variance
    if (stats.variance < 20) {
        varianceEl.className = 'block text-2xl font-semibold text-green-400';
    } else if (stats.variance < 40) {
        varianceEl.className = 'block text-2xl font-semibold text-yellow-400';
    } else {
        varianceEl.className = 'block text-2xl font-semibold text-rose-400';
    }
}

function updateRx(rx) {
    document.getElementById('rx-vol').textContent = rx.volume + ' mL';
    document.getElementById('rx-weekly').textContent = rx.weekly + ' mg/wk';
}

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION UPDATE
// ═══════════════════════════════════════════════════════════════════════════

let updateTimeout = null;

async function updateSimulation() {
    // Debounce rapid updates
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    
    updateTimeout = setTimeout(async () => {
        const result = await fetchPKData();
        
        if (result) {
            updateChart(result.data, result.comparison);
            updateStats(result.stats);
            updateRx(result.rx);
        }
    }, 150);
}

function switchProtocol(protocol) {
    // Check if premium is required
    if (!currentUser && protocol !== 'cyp') {
        showLoginModal();
        return;
    }
    
    currentProtocol = protocol;
    
    // Update tab styling
    document.querySelectorAll('.proto-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById('tab-' + protocol).classList.add('active');
    
    // Update simulation
    updateSimulation();
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

function setupEventListeners() {
    // Sliders
    document.getElementById('sim-dose').addEventListener('input', (e) => {
        state.dose = parseFloat(e.target.value);
        document.getElementById('sim-dose-val').textContent = state.dose + ' mg';
        updateSimulation();
    });
    
    document.getElementById('sim-freq').addEventListener('input', (e) => {
        state.freq = parseFloat(e.target.value);
        
        let freqText = '';
        if (state.freq === 1) freqText = 'Daily';
        else if (state.freq === 2) freqText = 'Every Other Day';
        else if (state.freq === 3.5) freqText = 'Every 3.5 Days';
        else if (state.freq === 7) freqText = 'Weekly';
        else if (state.freq === 14) freqText = 'Every 2 Weeks';
        else freqText = 'Every ' + state.freq + ' Days';
        
        document.getElementById('sim-freq-val').textContent = freqText;
        updateSimulation();
    });
    
    document.getElementById('sim-weight').addEventListener('input', (e) => {
        state.weight = parseFloat(e.target.value);
        document.getElementById('sim-weight-val').textContent = state.weight + ' lbs';
        updateSimulation();
    });
    
    document.getElementById('sim-conc').addEventListener('change', (e) => {
        state.conc = parseFloat(e.target.value);
        updateSimulation();
    });
    
    // Protocol tabs
    document.querySelectorAll('.proto-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const protocol = tab.dataset.protocol;
            switchProtocol(protocol);
        });
    });
    
    // Auth modal
    document.getElementById('close-modal').addEventListener('click', hideLoginModal);
    document.getElementById('auth-submit').addEventListener('click', handleAuth);
    document.getElementById('google-signin').addEventListener('click', handleGoogleSignIn);
    document.getElementById('toggle-signup').addEventListener('click', toggleSignUpMode);
    document.getElementById('signup-pro-btn').addEventListener('click', showLoginModal);
    
    // Close modal on background click
    document.getElementById('login-modal').addEventListener('click', (e) => {
        if (e.target.id === 'login-modal') {
            hideLoginModal();
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', () => {
    initChart();
    setupEventListeners();
    updateSimulation();
});

