// training.js — Medals, drills, daily run, challenge mode, generateNextRound, handleInput
// Auto-split from PokerCrusher monolith — do not reorder script tags

const SCENARIO_NAMES = { RFI: 'RFI (Unopened)', FACING_RFI: 'Defending vs RFI', RFI_VS_3BET: 'vs 3-Bet', VS_LIMP: 'Vs Limpers (1–3+)', SQUEEZE: 'Squeeze', SQUEEZE_2C: 'Squeeze vs 2C', PUSH_FOLD: 'Push / Fold (Short Stack)', POSTFLOP_CBET: 'Flop C-Bet (Postflop)' };
const MEDAL_THRESHOLDS = {
    bronze: { hands: 10, accuracy: 65 },
    silver: { hands: 25, accuracy: 80 },
    gold:   { hands: 40, accuracy: 90 }
};
const MEDAL_ICONS = { gold: '🥇', silver: '🥈', bronze: '🥉', none: '' };
const MEDAL_COLORS = { gold: 'text-yellow-400', silver: 'text-slate-300', bronze: 'text-amber-600', none: 'text-slate-600' };

let drillState = {
    mode: 'open', // 'open' | 'focused'
    active: false,
    scenario: 'RFI',
    handCount: 25,
    positions: [...ALL_POSITIONS],
    lockedLimperBucket: null  // set by challenge nodes to lock a specific bucket
};

// --- DAILY RUN (once per 24 hours) ---
const DAILY_RUN_KEY = 'pc_dailyRun_v1';
let dailyRunState = {
    active: false,
    option: null,           // 'easy' | 'medium' | 'hard'
    startedAt: 0,
    total: 0,               // attempts in this run
    correct: 0,             // correct answers in this run
    runStreak: 0,           // correct-in-a-row (score)
    ended: false,           // set true on first miss
    shownComplete: false,   // prevent double-modal
    bySpot: {},             // per-spot attempts in this run (for leak)
    allowedScenarios: [],   // scenario pool for this run
    _savedConfig: null,
    _rerollGuard: 0
};

// Daily Run difficulty registry.
//
// Keep all tier tuning in this one block so future node/tree additions only need:
// 1) add the scenario key to the appropriate tier array below
// 2) ensure the scenario is actually supported by the current codebase/range data
//
// Pools are cumulative:
// - easy   = foundational/common spots only
// - medium = easy + moderately complex spots
// - hard   = medium + highest-complexity currently supported spots
const DAILY_RUN_TIER_RULES = {
    easy: {
        order: 0,
        label: 'Warm-Up',
        scenarios: [
            'RFI',
            'FACING_RFI'
        ]
    },
    medium: {
        order: 1,
        label: 'Grind',
        scenarios: [
            'VS_LIMP',
            'RFI_VS_3BET'
        ]
    },
    hard: {
        order: 2,
        label: 'Boss',
        scenarios: [
            'SQUEEZE',
            'SQUEEZE_2C',
            'PUSH_FOLD',
            'POSTFLOP_CBET'
        ]
    }
};

function getDailyRunTierNamesUpTo(option) {
    const maxOrder = Number((DAILY_RUN_TIER_RULES[option] || {}).order);
    return Object.keys(DAILY_RUN_TIER_RULES)
        .filter(name => Number((DAILY_RUN_TIER_RULES[name] || {}).order) <= maxOrder)
        .sort((a, b) => Number(DAILY_RUN_TIER_RULES[a].order) - Number(DAILY_RUN_TIER_RULES[b].order));
}

function getDailyRunConfiguredScenariosForOption(option) {
    const seen = new Set();
    const ordered = [];
    getDailyRunTierNamesUpTo(option).forEach(tierName => {
        const list = (DAILY_RUN_TIER_RULES[tierName] && DAILY_RUN_TIER_RULES[tierName].scenarios) || [];
        list.forEach(sc => {
            if (!seen.has(sc)) {
                seen.add(sc);
                ordered.push(sc);
            }
        });
    });
    return ordered;
}

function applyDailyRunHUDState(active) {
    try {
        const dr = document.getElementById('dr-round-counter');
        const dc = document.getElementById('drill-counter');
        const sb = document.getElementById('streak-best-block');
        if (dr) dr.classList.toggle('hidden', !active);
        if (dc) dc.classList.toggle('hidden', !!active);
        if (sb) sb.classList.toggle('hidden', !active);
        if (active) {
            const bestEl = document.getElementById('streak-best');
            if (bestEl) bestEl.textContent = String(state.global.bestStreak || 0);
            updateDRRoundCounter();
        }
    } catch(_) {}
}

function restoreDailyRunConfigIfNeeded() {
    if (dailyRunState && dailyRunState._savedConfig) {
        try { state.config = dailyRunState._savedConfig; } catch(_) {}
    }
    if (dailyRunState) dailyRunState._savedConfig = null;
}

function resetDailyRunState(opts) {
    const options = Object.assign({ restoreConfig: true }, opts || {});
    if (options.restoreConfig) restoreDailyRunConfigIfNeeded();
    dailyRunState.active = false;
    dailyRunState.option = null;
    dailyRunState.startedAt = 0;
    dailyRunState.total = 0;
    dailyRunState.correct = 0;
    dailyRunState.runStreak = 0;
    dailyRunState.ended = false;
    dailyRunState.shownComplete = false;
    dailyRunState.bySpot = {};
    dailyRunState.allowedScenarios = [];
    dailyRunState._rerollGuard = 0;
    applyDailyRunHUDState(false);
}

function getDailyRunSupportedScenarios() {
    const supported = [];
    if (ALL_POSITIONS.some(p => rfiRanges && rfiRanges[p])) supported.push('RFI');
    if (typeof facingRfiRanges !== 'undefined' && Object.keys(facingRfiRanges).length) supported.push('FACING_RFI');
    if (typeof rfiVs3BetRanges !== 'undefined' && Object.keys(rfiVs3BetRanges).length) supported.push('RFI_VS_3BET');
    if (typeof allFacingLimps !== 'undefined' && Object.keys(allFacingLimps).length) supported.push('VS_LIMP');
    if (typeof squeezeRanges !== 'undefined' && Object.keys(squeezeRanges).length) supported.push('SQUEEZE');
    if (typeof squeezeVsRfiTwoCallers !== 'undefined' && Object.keys(squeezeVsRfiTwoCallers).length) supported.push('SQUEEZE_2C');
    if (typeof PF_PUSH !== 'undefined' && Object.keys(PF_PUSH).length) supported.push('PUSH_FOLD');
    if (typeof generatePostflopSpot === 'function') supported.push('POSTFLOP_CBET');
    return supported.filter(s => !!SCENARIO_NAMES[s]);
}

function getDailyRunScenarioPool(option) {
    const configured = getDailyRunConfiguredScenariosForOption(option);
    const supported = new Set(getDailyRunSupportedScenarios());
    return configured.filter(s => supported.has(s));
}

function installDailyRunExitPatch() {
    if (window.__dailyRunExitPatchInstalled) return;
    if (typeof window.exitToMenu !== 'function') {
        setTimeout(installDailyRunExitPatch, 0);
        return;
    }
    const original = window.exitToMenu;
    window.exitToMenu = function() {
        const shouldReset = !!(dailyRunState && (dailyRunState.active || dailyRunState.ended || dailyRunState._savedConfig));
        const result = original.apply(this, arguments);
        if (shouldReset) resetDailyRunState({ restoreConfig: true });
        return result;
    };
    window.__dailyRunExitPatchInstalled = true;
}
setTimeout(installDailyRunExitPatch, 0);

function loadDailyRunMeta() {
    const defaults = {
        // Day-based streak: count of consecutive days with ≥1 completed run
        streak: 0,
        bestStreak: 0,
        lastDayIndex: null,

        // Per-day cap — one slot per difficulty
        runsDayIndex: null,
        runsToday: 0,          // legacy; kept for backward compat
        completedToday: {},    // { easy: bool, medium: bool, hard: bool }

        // Lifetime
        totalRuns: 0,
        bestRun: 0,
        bestRunEasy: 0,
        bestRunMedium: 0,
        bestRunHard: 0,

        // Last run details
        lastCompletedAt: 0,
        lastOption: null,
        lastRun: 0,
        lastTotal: 0,
        lastCorrect: 0,
        lastLeakKey: null,

        // Rolling history (last ~60 days)
        history: []
    };
    try {
        const raw = localStorage.getItem(DAILY_RUN_KEY);
        if (!raw) return { ...defaults };
        const parsed = JSON.parse(raw);
        const merged = { ...defaults, ...(parsed || {}) };
        // Normalize types defensively
        merged.lastCompletedAt = Number(merged.lastCompletedAt || 0);
        merged.streak = Number(merged.streak || 0);
        merged.bestStreak = Number(merged.bestStreak || 0);

        merged.runsToday = Number(merged.runsToday || 0);
        if (merged.runsDayIndex !== null && merged.runsDayIndex !== undefined) merged.runsDayIndex = Number(merged.runsDayIndex);
        if (merged.runsDayIndex !== merged.runsDayIndex) merged.runsDayIndex = null;
        if (!merged.completedToday || typeof merged.completedToday !== 'object') merged.completedToday = {};

        merged.totalRuns = Number(merged.totalRuns || 0);
        merged.bestRun = Number(merged.bestRun || 0);
        merged.bestRunEasy = Number(merged.bestRunEasy || 0);
        merged.bestRunMedium = Number(merged.bestRunMedium || 0);
        merged.bestRunHard = Number(merged.bestRunHard || 0);

        merged.lastRun = Number(merged.lastRun || 0);
        merged.lastTotal = Number(merged.lastTotal || 0);
        merged.lastCorrect = Number(merged.lastCorrect || 0);

        if (merged.lastDayIndex !== null && merged.lastDayIndex !== undefined) merged.lastDayIndex = Number(merged.lastDayIndex);
        if (merged.lastDayIndex !== merged.lastDayIndex) merged.lastDayIndex = null;

        if (!Array.isArray(merged.history)) merged.history = [];
        // clamp history size
        if (merged.history.length > 120) merged.history = merged.history.slice(-120);
        return merged;
    } catch (_) {
        return { ...defaults };
    }
}

function saveDailyRunMeta(meta) {
    try { localStorage.setItem(DAILY_RUN_KEY, JSON.stringify(meta)); } catch (_) {}
}

function getLocalDayIndex(ts) {
    const d = new Date(ts);
    d.setHours(0,0,0,0);
    return Math.floor(d.getTime() / 86400000);
}

function getDailyRunLockInfo() {
    const meta = loadDailyRunMeta();
    const now = Date.now();
    const today = getLocalDayIndex(now);

    // reset daily slots if we've moved to a new local day
    if (meta.runsDayIndex === null || meta.runsDayIndex === undefined || meta.runsDayIndex !== today) {
        meta.runsDayIndex = today;
        meta.runsToday = 0;
        meta.completedToday = {};
        saveDailyRunMeta(meta);
    }
    if (!meta.completedToday || typeof meta.completedToday !== 'object') meta.completedToday = {};

    // Each difficulty has its own slot; "locked" means all three done
    const allDone = !!(meta.completedToday.easy && meta.completedToday.medium && meta.completedToday.hard);

    // ms left until next local midnight
    let msLeft = 0;
    if (allDone) {
        const d = new Date(now);
        d.setHours(24,0,0,0); // next midnight
        msLeft = Math.max(0, d.getTime() - now);
    }
    return { meta, locked: allDone, msLeft, completedToday: meta.completedToday };
}

function formatDuration(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = n => String(n).padStart(2,'0');
    return `${h}:${pad(m)}:${pad(ss)}`;
}

function hideAllScreens() {
    const ids = [
        'menu-screen','config-screen','trainer-screen','stats-screen','settings-screen',
        'challenge-screen','library-screen','daily-run-screen'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    // Hide modals if present
    const modals = ['chart-modal','drill-complete-screen','daily-run-complete-screen'];
    modals.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}


// Show main menu (alias used by several screens)
function showMenu() {
    applyDailyRunHUDState(false);
    hideAllScreens();
    const menu = document.getElementById('menu-screen');
    if (menu) menu.classList.remove('hidden');
    try { updateMenuUI(); } catch(_) {}
}

function showDailyRunMenu() {
    applyDailyRunHUDState(false);
    hideAllScreens();
    document.getElementById('daily-run-screen').classList.remove('hidden');
    updateDailyRunUI();
}

function updateDailyRunUI() {
    const { meta, locked, msLeft } = getDailyRunLockInfo();

    const streakDays = Number(meta.streak || 0);
    const runs = Number(meta.totalRuns || 0);
    const runsToday = Number(meta.runsToday || 0);
    const bestRun = Number(meta.bestRun || 0);

    const lastRun = Number(meta.lastRun || 0);
    const lastTotal = Number(meta.lastTotal || 0);
    const lastCorrect = Number(meta.lastCorrect || 0);
    const lastOpt = meta.lastOption || null;
    const lastWhen = meta.lastCompletedAt ? new Date(meta.lastCompletedAt) : null;
    const lastLeak = meta.lastLeakKey ? prettySpotName(meta.lastLeakKey) : null;

    const lastOptName = lastOpt === 'easy' ? 'Warm‑Up' : lastOpt === 'hard' ? 'Boss' : lastOpt === 'medium' ? 'Grind' : null;

    const subtitle = document.getElementById('daily-run-subtitle');
    if (subtitle) subtitle.textContent = 'One shot per difficulty · Score = correct in a row';

    const ct = meta.completedToday || {};
    const slotsDone = [ct.easy, ct.medium, ct.hard].filter(Boolean).length;

    const statusEl = document.getElementById('daily-run-status');
    if (statusEl) {
        const lockLine = locked
            ? `<div class="text-amber-300 font-black">All done for today!</div><div class="text-slate-400 text-xs font-semibold mt-1">Resets in ${formatDuration(msLeft)}</div>`
            : `<div class="text-emerald-300 font-black">${slotsDone}/3 completed today</div><div class="text-slate-400 text-xs font-semibold mt-1">One shot at each difficulty. First miss ends the run.</div>`;

        const slotRow = ['easy','medium','hard'].map(opt => {
            const done = !!ct[opt];
            const label = opt === 'easy' ? 'Warm-Up' : opt === 'medium' ? 'Grind' : 'Boss';
            const icon = opt === 'easy' ? '🟢' : opt === 'medium' ? '🟡' : '🔴';
            const bests = { easy: Number(meta.bestRunEasy||0), medium: Number(meta.bestRunMedium||0), hard: Number(meta.bestRunHard||0) };
            return `<div class="bg-slate-950/40 border ${done ? 'border-emerald-700/50' : 'border-slate-800'} rounded-2xl p-3 text-center">
                <div class="text-lg">${done ? '✅' : icon}</div>
                <div class="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-1">${label}</div>
                <div class="text-slate-500 text-[9px] mt-0.5">Best: ${bests[opt]}</div>
            </div>`;
        }).join('');

        statusEl.innerHTML = `
            <div class="flex items-start justify-between gap-4">
                <div>${lockLine}</div>
                <div class="text-right">
                    <div class="text-slate-300 text-xs font-bold uppercase tracking-widest">Day streak</div>
                    <div class="text-slate-100 font-black text-2xl">${streakDays}</div>
                </div>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-3">${slotRow}</div>
            <div id="dr-history-label" class="hidden mt-3 text-[9px] text-slate-600 uppercase font-bold tracking-widest">Recent runs (up to 14)</div>
            <div id="dr-history-sparkline" class="hidden mt-1 mb-2 rounded-lg overflow-hidden bg-slate-950/30 px-2 pt-2 pb-0.5"></div>
            <div class="mt-4 bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
                <div class="text-slate-400 text-xs font-bold uppercase tracking-widest">Last run</div>
                <div class="text-slate-100 font-black text-lg mt-1">${lastOptName ? `${lastRun} · ${lastOptName}` : '—'}</div>
                <div class="text-slate-500 text-xs mt-1">${lastWhen ? lastWhen.toLocaleString() : ''}</div>
                <div class="text-slate-400 text-xs mt-2">${lastOptName ? `Accuracy: ${lastCorrect}/${lastTotal}` : ''}</div>
                <div class="text-slate-400 text-xs mt-1">${lastLeak ? `Leak: ${lastLeak}` : ''}</div>
            </div>
        `;
    }

    // UX #17: render history sparkline
    try {
        const histEl = document.getElementById('dr-history-sparkline');
        const histLabel = document.getElementById('dr-history-label');
        if (histEl && meta.history && meta.history.length > 0) {
            const last14 = meta.history.slice(-14);
            const maxScore = Math.max(...last14.map(h => h.run || 0), 1);
            const bars = last14.map(h => {
                const pct = Math.max(8, Math.round(((h.run || 0) / maxScore) * 100));
                const col = h.option === 'hard' ? '#f43f5e' : h.option === 'medium' ? '#eab308' : '#22c55e';
                return `<div title="Score: ${h.run}" style="flex:1;background:${col};opacity:0.75;height:${pct}%;border-radius:2px 2px 0 0;min-height:4px;"></div>`;
            }).join('');
            histEl.innerHTML = `<div style="display:flex;align-items:flex-end;gap:2px;height:36px;">${bars}</div>`;
            histEl.classList.remove('hidden');
            if (histLabel) histLabel.classList.remove('hidden');
        }
    } catch(_) {}

    // Disable buttons individually per completed slot
    ['easy','medium','hard'].forEach(opt => {
        const btn = document.getElementById(`daily-run-btn-${opt}`);
        if (!btn) return;
        const isDone = !!(ct[opt]);
        btn.disabled = isDone;
        btn.classList.toggle('opacity-50', isDone);
        btn.classList.toggle('pointer-events-none', isDone);
        // Show personal best inline
        const bestMap = { easy: Number(meta.bestRunEasy||0), medium: Number(meta.bestRunMedium||0), hard: Number(meta.bestRunHard||0) };
        const bestEl = btn.querySelector('.dr-btn-best');
        if (bestEl && bestMap[opt] > 0) {
            bestEl.textContent = 'Best: ' + bestMap[opt];
            bestEl.classList.remove('hidden');
        }
    });
}

function startDailyRun(option) {
    const { completedToday } = getDailyRunLockInfo();
    if (completedToday[option]) { updateDailyRunUI(); return; }

    const scenarioPool = getDailyRunScenarioPool(option);
    if (!scenarioPool.length) {
        console.warn('[DailyRun] No supported scenarios for option:', option);
        updateDailyRunUI();
        return;
    }

    // Clean out any stale state before starting a fresh run.
    resetDailyRunState({ restoreConfig: true });

    dailyRunState.active = true;
    dailyRunState.option = option; // easy|medium|hard
    dailyRunState.startedAt = Date.now();
    dailyRunState.total = 0;
    dailyRunState.correct = 0;
    dailyRunState.runStreak = 0;
    dailyRunState.ended = false;
    dailyRunState.shownComplete = false;
    dailyRunState.bySpot = {};
    dailyRunState.allowedScenarios = [...scenarioPool];
    dailyRunState._rerollGuard = 0;
    dailyRunState._savedConfig = JSON.parse(JSON.stringify(state.config));

    // Daily Run owns its own spot pool; do not inherit random user config state.
    state.config.scenarios = [...scenarioPool];
    state.config.positions = [...ALL_POSITIONS];

    // Start trainer session using a clean DR-owned config.
    state.sessionStats = { total: 0, correct: 0, streak: 0 };
    state.sessionLog = [];
    drillState.active = false;

    hideAllScreens();
    document.getElementById('trainer-screen').classList.remove('hidden');

    const _drFelt = document.getElementById('poker-felt-container');
    if (_drFelt) { try { ro.observe(_drFelt); } catch(_) {} }

    applyDailyRunHUDState(true);
    updateUI();
    try { updateDrillCounter(); } catch(_) {}
    safeGenerateNextRound();
}

function updateDRRoundCounter() {
    const el = document.getElementById('dr-round-num');
    if (el && dailyRunState && dailyRunState.active) {
        el.textContent = String((dailyRunState.total || 0) + 1);
    }
}



function dailyRunAllowsScenario(scenario) {
    if (!dailyRunState || !dailyRunState.active) return true;
    const pool = Array.isArray(dailyRunState.allowedScenarios) ? dailyRunState.allowedScenarios : [];
    if (!pool.length) return true;
    return pool.includes(scenario);
}

function dailyRunSpotAllowedNow() {
    if (!dailyRunState || !dailyRunState.active) return true;
    return dailyRunAllowsScenario(state.scenario);
}
function checkDailyRunComplete() {
    if (!dailyRunState) return false;
    if (!dailyRunState.active && !dailyRunState.ended) return false;
    if (dailyRunState.ended && !dailyRunState.shownComplete) {
        dailyRunState.shownComplete = true;
        dailyRunState.active = false;
        showDailyRunComplete();
        return true;
    }
    return !!(dailyRunState.active && dailyRunState.ended);
}

function showDailyRunComplete() {
    const total = dailyRunState.total || 0;
    const correct = dailyRunState.correct || 0;
    const runScore = dailyRunState.runStreak || 0;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;

    // Biggest leak = lowest accuracy spot (min 2 attempts), else most misses
    let leakKey = null;
    let leakScore = Infinity;
    let leakMisses = -1;

    Object.entries(dailyRunState.bySpot || {}).forEach(([k, v]) => {
        const t = v.total || 0;
        const c = v.correct || 0;
        const miss = t - c;
        const acc = t ? (c / t) : 0;
        if (t >= 2) {
            if (acc < leakScore) { leakScore = acc; leakKey = k; }
        } else {
            if (miss > leakMisses) { leakMisses = miss; leakKey = leakKey || k; }
        }
    });

    const leakLabel = leakKey ? prettySpotName(leakKey) : '—';

    // Update meta: 3/day cap + day streak + lifetime stats + history
    const now = Date.now();
    const meta = loadDailyRunMeta();
    const today = getLocalDayIndex(now);
    const lastDay = (meta.lastDayIndex === null || meta.lastDayIndex === undefined) ? null : meta.lastDayIndex;

    // ensure today's counter is initialized
    if (meta.runsDayIndex === null || meta.runsDayIndex === undefined || meta.runsDayIndex !== today) {
        meta.runsDayIndex = today;
        meta.runsToday = 0;
    }

    // day-streak increments only on the first completed run of a new day
    const _prevCompleted = Object.keys(meta.completedToday || {}).length;
    let newDayStreak = Number(meta.streak || 0);
    if (_prevCompleted === 0) {
        if (lastDay === null) newDayStreak = 1;
        else if (today === lastDay) newDayStreak = Math.max(1, newDayStreak);
        else if (today === lastDay + 1) newDayStreak = newDayStreak + 1;
        else newDayStreak = 1;
        meta.lastDayIndex = today;
        meta.streak = newDayStreak;
        meta.bestStreak = Math.max(Number(meta.bestStreak || 0), newDayStreak);
    }

    meta.runsToday = Number(meta.runsToday || 0) + 1;
    if (!meta.completedToday) meta.completedToday = {};
    meta.completedToday[dailyRunState.option] = true;

    meta.lastCompletedAt = now;
    meta.lastOption = dailyRunState.option;

    meta.totalRuns = Number(meta.totalRuns || 0) + 1;

    meta.lastRun = runScore;
    meta.lastTotal = total;
    meta.lastCorrect = correct;
    meta.lastLeakKey = leakKey || null;

    meta.bestRun = Math.max(Number(meta.bestRun || 0), runScore);
    if (dailyRunState.option === 'easy') meta.bestRunEasy = Math.max(Number(meta.bestRunEasy || 0), runScore);
    if (dailyRunState.option === 'medium') meta.bestRunMedium = Math.max(Number(meta.bestRunMedium || 0), runScore);
    if (dailyRunState.option === 'hard') meta.bestRunHard = Math.max(Number(meta.bestRunHard || 0), runScore);

    // append history entry (cap ~120)
    const hist = Array.isArray(meta.history) ? meta.history.slice() : [];
    hist.push({ dayIndex: today, at: now, option: dailyRunState.option, run: runScore, total: total, correct: correct, leakKey: leakKey || null });
    while (hist.length > 120) hist.shift();
    meta.history = hist;

    saveDailyRunMeta(meta);

    // Render modal
    const optName = dailyRunState.option === 'easy' ? 'Warm‑Up' : dailyRunState.option === 'hard' ? 'Boss' : 'Grind';
    const body = `
        <div class="mt-2 grid grid-cols-2 gap-3">
            <div class="bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
                <div class="text-slate-400 text-xs font-bold uppercase tracking-widest">Run (Correct in a row)</div>
                <div class="text-slate-100 font-black text-3xl mt-1">${runScore}</div>
                <div class="text-slate-500 text-xs mt-1">${optName}</div>
            </div>
            <div class="bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
                <div class="text-slate-400 text-xs font-bold uppercase tracking-widest">Accuracy</div>
                <div class="text-slate-100 font-black text-3xl mt-1">${accuracy}%</div>
                <div class="text-slate-500 text-xs mt-1">${correct}/${total}</div>
            </div>
        </div>
        <div class="mt-3 bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
            <div class="text-slate-400 text-xs font-bold uppercase tracking-widest">Biggest leak</div>
            <div class="text-slate-100 font-black text-lg mt-1">${leakLabel}</div>
        </div>
        <div class="mt-3 text-slate-400 text-xs">
            Slots today: <span class="text-slate-200 font-bold">${['easy','medium','hard'].filter(o => (meta.completedToday||{})[o]).length}/3</span> · Day streak: <span class="text-slate-200 font-bold">${meta.streak}</span>
        </div>
    `;

    const modal = document.getElementById('daily-run-complete-screen');
    if (modal) {
        const titleEl = modal.querySelector('#daily-run-complete-title');
        const bodyEl = modal.querySelector('#daily-run-complete-body');
        if (titleEl) titleEl.textContent = 'Daily Run Complete';
        if (bodyEl) bodyEl.innerHTML = body;
        modal.classList.remove('hidden');
        const pab = document.getElementById('dr-play-again-btn');
        if (pab) {
            const ct2 = meta.completedToday || {};
            const slotsLeft = ['easy','medium','hard'].filter(o => !ct2[o]).length;
            pab.disabled = slotsLeft <= 0;
            pab.classList.toggle('opacity-40', slotsLeft <= 0);
            pab.classList.toggle('pointer-events-none', slotsLeft <= 0);
            pab.textContent = slotsLeft > 0 ? 'Play Another Difficulty (' + slotsLeft + ' left)' : 'All done today!';
        }
    }

    // mark run as finished but do not clear until the user leaves the DR flow
    dailyRunState.active = false;
}

function drPlayAgain() {
    const modal = document.getElementById('daily-run-complete-screen');
    if (modal) modal.classList.add('hidden');
    resetDailyRunState({ restoreConfig: true });
    showDailyRunMenu();
}

function endDailyRunToMenu() {
    const modal = document.getElementById('daily-run-complete-screen');
    if (modal) modal.classList.add('hidden');
    resetDailyRunState({ restoreConfig: true });
    showMenu();
}

function prettySpotName(spotKey) {
    try {
        const parts = String(spotKey).split('|');
        const sc = parts[0] || '';
        if (sc === 'SRP' || sc === '3BP' || sc === 'LIMP_POT') {
            const family = parts[1] || ''; const posState = parts[4] || ''; const archetype = parts[6] || '';
            const archLabel = (typeof ARCHETYPE_LABELS !== 'undefined' && ARCHETYPE_LABELS[archetype]) || archetype.replace(/_/g,' ');
            return `${sc} · ${family.replace(/_/g,' ')} · ${posState} · ${archLabel}`;
        }
        let rest = parts[1] || '';
        if (sc === 'VS_LIMP') { const bucket = parts[2] ? ` · ${parts[2]} limp${parts[2]==='1'?'':'s'}` : ''; return `${sc.replace('_',' ')} · ${rest.replaceAll('_',' ')}${bucket}`; }
        if (sc === 'PUSH_FOLD') { return `Push/Fold · ${POS_LABELS[rest] || rest} · ${parts[2] || ''}`; }
        return `${sc.replaceAll('_',' ')} · ${rest.replaceAll('_',' ')}`;
    } catch(_) { return spotKey; }
}


// Medal storage
function loadMedals() {
    try { const s = localStorage.getItem(profileKey('gto_medals_v1')); return s ? JSON.parse(s) : {}; } catch(e) { return {}; }
}
function saveMedals(m) {
    try { localStorage.setItem(profileKey('gto_medals_v1'), JSON.stringify(m)); } catch(e) {}
}
function getMedalForResult(hands, accuracy) {
    if (hands >= MEDAL_THRESHOLDS.gold.hands && accuracy >= MEDAL_THRESHOLDS.gold.accuracy) return 'gold';
    if (hands >= MEDAL_THRESHOLDS.silver.hands && accuracy >= MEDAL_THRESHOLDS.silver.accuracy) return 'silver';
    if (hands >= MEDAL_THRESHOLDS.bronze.hands && accuracy >= MEDAL_THRESHOLDS.bronze.accuracy) return 'bronze';
    return 'none';
}
function medalRank(m) { return { gold: 3, silver: 2, bronze: 1, none: 0 }[m] || 0; }

// Config toggle (open training)
function toggleConfig(type, value) {
    const list = type === 'scenario' ? state.config.scenarios : state.config.positions;
    const index = list.indexOf(value);
    if (index > -1) { if (list.length > 1) list.splice(index, 1); } else { list.push(value); }
    updateConfigUI();
    saveConfig();
}
// Drill toggle (focused drill — single select for scenario)
function toggleDrillScenario(sc) {
    drillState.scenario = sc;
    updateConfigUI();
}
function toggleDrillPos(pos) {
    const list = drillState.positions;
    const index = list.indexOf(pos);
    if (index > -1) { if (list.length > 1) list.splice(index, 1); } else { list.push(pos); }
    updateConfigUI();
}
function setDrillCount(n) {
    drillState.handCount = n;
    [10, 25, 50].forEach(c => {
        const btn = document.getElementById(`drill-ct-${c}`);
        if (btn) btn.className = `count-btn ${c === n ? 'selected' : ''}`;
    });
}
function setDrillMode(mode) {
    drillState.mode = mode;
    const _modeDescs = { open: 'Mix scenarios & positions — great for general practice.', focused: 'Lock in on one spot for a fixed number of hands — drill deep.' };
    try { const d = document.getElementById('mode-desc'); if(d) d.textContent = _modeDescs[mode] || ''; } catch(_){}
    document.getElementById('mode-open').className = `mode-tab ${mode === 'open' ? 'active' : ''}`;
    document.getElementById('mode-focused').className = `mode-tab ${mode === 'focused' ? 'active' : ''}`;
    document.getElementById('config-open').classList.toggle('hidden', mode !== 'open');
    document.getElementById('config-focused').classList.toggle('hidden', mode !== 'focused');
    document.getElementById('cfg-start-btn').innerText = mode === 'open' ? 'START' : 'START DRILL';
    if (mode === 'focused') buildDrillConfig();
}

// ==================================
// Challenge Mode (Unlock Path) - skeleton
// ==================================
function loadChallenge() {
    try { const s = localStorage.getItem(profileKey('gto_challenge_v1')); return s ? JSON.parse(s) : null; } catch(e) { return null; }
}
function saveChallenge(obj) {
    try { localStorage.setItem(profileKey('gto_challenge_v1'), JSON.stringify(obj)); } catch(e) {}
    markCloudDirty();
}

// Node definitions: keep this simple + stable. Uses existing training engine + SR stats.
// Each node maps to a focused drill (scenario + optional position restrictions).
const CHALLENGE_NODES = [
    { id: 'n1_rfi_ep',    title: 'Open Ranges: EP',    desc: 'UTG/UTG1/UTG2 opens', scenario: 'RFI', positions: ['UTG','UTG1','UTG2'], hands: 25, acc: 80, prereq: [] },
    { id: 'n2_rfi_mp',    title: 'Open Ranges: MP',    desc: 'LJ/HJ opens',         scenario: 'RFI', positions: ['LJ','HJ'],       hands: 25, acc: 80, prereq: ['n1_rfi_ep'] },
    { id: 'n3_rfi_lp',    title: 'Open Ranges: LP',    desc: 'CO/BTN opens',        scenario: 'RFI', positions: ['CO','BTN'],      hands: 25, acc: 80, prereq: ['n2_rfi_mp'] },
    { id: 'n4_rfi_blinds',title: 'Open Ranges: Blinds',desc: 'SB opens',            scenario: 'RFI', positions: ['SB'],           hands: 25, acc: 80, prereq: ['n3_rfi_lp'] },

    { id: 'n5_def_blinds',title: 'Defend vs RFI: Blinds', desc: 'SB/BB defending',  scenario: 'FACING_RFI', positions: ['SB','BB'], hands: 25, acc: 78, prereq: ['n4_rfi_blinds'] },
    { id: 'n6_vs3b_ip',   title: 'RFI vs 3-bet: IP',   desc: 'CO/BTN vs 3-bet',     scenario: 'RFI_VS_3BET', positions: ['CO','BTN'], hands: 25, acc: 75, prereq: ['n5_def_blinds'] },
    { id: 'n7_vs3b_oop',  title: 'RFI vs 3-bet: OOP',  desc: 'SB vs 3-bet',         scenario: 'RFI_VS_3BET', positions: ['SB'],     hands: 25, acc: 75, prereq: ['n6_vs3b_ip'] },

    { id: 'n8_vs_limp',   title: 'Vs Limpers',         desc: '1 limper baseline',   scenario: 'VS_LIMP', positions: [...ALL_POSITIONS], hands: 25, acc: 75, prereq: ['n7_vs3b_oop'], limperBucket: '1L' },
    { id: 'n9_squeeze',   title: 'Squeeze',            desc: 'Open + call',          scenario: 'SQUEEZE', positions: ['BTN','SB','BB','CO'], hands: 25, acc: 72, prereq: ['n8_vs_limp'] }
];

// Runtime state for an active challenge attempt
let challengeState = { active: false, nodeId: null, reqAcc: 0 };

function getChallengeProgress() {
    const saved = loadChallenge();
    if (saved && saved.v === 1 && saved.nodes) return saved;
    // Default: only first node unlocked (computed), none completed
    return { v: 1, nodes: {}, lastPlayed: null };
}

function isNodeCompleted(progress, nodeId) {
    return !!(progress.nodes && progress.nodes[nodeId] && progress.nodes[nodeId].completed);
}

function isNodeUnlocked(progress, node) {
    if (!node.prereq || node.prereq.length === 0) return true;
    return node.prereq.every(pid => isNodeCompleted(progress, pid));
}

function renderChallengeScreen() {
    const progress = getChallengeProgress();
    const body = document.getElementById('challenge-body');
    if (!body) return;

    const rows = CHALLENGE_NODES.map(node => {
        const done = isNodeCompleted(progress, node.id);
        const unlocked = isNodeUnlocked(progress, node);
        const rec = progress.nodes[node.id] || {};
        const best = rec.bestAcc != null ? rec.bestAcc : null;

        const badge = done
            ? `<span class="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-black uppercase tracking-wider">Completed</span>`
            : unlocked
                ? `<span class="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[9px] font-black uppercase tracking-wider">Unlocked</span>`
                : `<span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[9px] font-black uppercase tracking-wider">Locked</span>`;

        const bestHtml = best != null
            ? `<span class="text-[10px] text-slate-500">Best: <span class="text-slate-300 font-black">${best}%</span></span>`
            : `<span class="text-[10px] text-slate-600">Best: —</span>`;

        const btn = unlocked
            ? `<button onclick="startChallengeNode('${node.id}')" class="px-3 py-2 rounded-xl ${done ? 'bg-slate-900 border border-slate-800 text-slate-300' : 'bg-emerald-600 hover:bg-emerald-500 text-white'} text-xs font-black">${done ? 'Replay' : 'Start'}</button>`
            : `<button disabled class="px-3 py-2 rounded-xl bg-slate-900 border border-slate-900 text-slate-700 text-xs font-black cursor-not-allowed">Locked</button>`;

        return `<div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-3">
            <div class="min-w-0">
                <div class="flex items-center gap-2">
                    <p class="text-sm font-black text-slate-100 truncate">${node.title}</p>
                    ${badge}
                </div>
                <p class="text-[11px] text-slate-500 mt-1">${node.desc}</p>
                <div class="flex items-center gap-3 mt-2">
                    <span class="text-[10px] text-slate-600 font-bold uppercase tracking-wider">${node.hands} hands · ${node.acc}%+</span>
                    ${bestHtml}
                </div>
            </div>
            <div class="shrink-0">${btn}</div>
        </div>`;
    }).join('');

    body.innerHTML = rows;
}

function showChallengeMenu() {
    // After rendering, check if all challenge nodes are beaten
    setTimeout(() => {
        try {
            const prog = getChallengeProgress();
            const allDone = CHALLENGE_NODES.length > 0 && CHALLENGE_NODES.every(n => isNodeCompleted(prog, n.id));
            const banner = document.getElementById('challenge-complete-banner');
            if (banner) banner.classList.toggle('hidden', !allDone);
        } catch(_){}
    }, 100);
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('challenge-screen').classList.remove('hidden');
    renderChallengeScreen();
}

function closeChallengeMenu() {
    document.getElementById('challenge-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    // Safety: if a drill is running behind the menu (shouldn't happen), hide trainer to prevent layout scatter
    const ts = document.getElementById('trainer-screen');
    if (ts && !ts.classList.contains('hidden') && (challengeState && challengeState.active)) {
        ts.classList.add('hidden');
        drillState.active = false;
        challengeState.active = false;
    }
    updateMenuUI();
}

function resetChallengeProgress() {
    if (!confirm('Reset Challenge Mode progress?')) return;
    saveChallenge({ v: 1, nodes: {}, lastPlayed: null });
    renderChallengeScreen();
}

function startChallengeNode(nodeId) {
    const node = CHALLENGE_NODES.find(n => n.id === nodeId);
    if (!node) return;

    // Configure a focused drill using the existing engine
    setDrillMode('focused');
    drillState.scenario = node.scenario;
    drillState.positions = node.positions ? [...node.positions] : [...ALL_POSITIONS];
    setDrillCount(node.hands);

    // Extra per-node params (e.g., limper bucket)
    if (node.scenario === 'VS_LIMP' && node.limperBucket) {
        state.limperBucket = node.limperBucket;
        drillState.lockedLimperBucket = node.limperBucket;
    } else {
        drillState.lockedLimperBucket = null;
    }

    // Mark active challenge run
    challengeState.active = true;
    challengeState.nodeId = node.id;
    challengeState.reqAcc = node.acc;

    const progress = getChallengeProgress();
    progress.lastPlayed = node.id;
    saveChallenge(progress);

    // Hide Challenge UI and start training
    document.getElementById('challenge-screen').classList.add('hidden');
    startConfiguredTraining();
}

function finishChallengeAttempt(passed, accuracy) {
    const progress = getChallengeProgress();
    const nodeId = challengeState.nodeId;
    const rec = progress.nodes[nodeId] || {};
    rec.bestAcc = Math.max(rec.bestAcc || 0, accuracy || 0);
    if (passed) {
        rec.completed = true;
        rec.completedAt = Date.now();
    }
    progress.nodes[nodeId] = rec;
    saveChallenge(progress);
}

function exitToChallenge() {
    try { __clearNextTimer(); __endResolve(); } catch(_) {}
    try { window.__tableAnimToken = (window.__tableAnimToken || 0) + 1; } catch(_) {}

    // Restore config if drill was active
    if (drillState._savedConfig) {
        state.config = drillState._savedConfig;
        drillState._savedConfig = null;
    }
    drillState.active = false;
    drillState.lockedLimperBucket = null;

    document.getElementById('trainer-screen').classList.add('hidden');
    document.getElementById('challenge-screen').classList.remove('hidden');
    renderChallengeScreen();
}


function endChallengeToMenu() {
    try { __clearNextTimer(); __endResolve(); } catch(_) {}
    try { window.__tableAnimToken = (window.__tableAnimToken || 0) + 1; } catch(_) {}

    // Restore config if drill was active
    if (drillState._savedConfig) {
        state.config = drillState._savedConfig;
        drillState._savedConfig = null;
    }
    drillState.active = false;
    challengeState.active = false;
    document.getElementById('trainer-screen').classList.add('hidden');
    document.getElementById('drill-complete-screen').classList.add('hidden');
    document.getElementById('challenge-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    updateMenuUI();
}

function retryChallenge() {
    const nodeId = challengeState.nodeId;
    // Close complete screen, then restart same node
    closeDrillCompleteScreenOnly();
    setTimeout(() => startChallengeNode(nodeId), 50);
}

function closeDrillCompleteScreenOnly() {
    document.getElementById('drill-complete-screen').classList.add('hidden');
}




function setLimperMix(preset) {
    limperMixPreset = preset;
    saveLimperMix();
    updateLimperMixUI();
}
function updateLimperMixUI() {
    const show = state.config.scenarios.includes('VS_LIMP');
    const sec = document.getElementById('limper-mix-section');
    if (sec) sec.classList.toggle('hidden', !show);
    ['mostly1','liveish','multiway'].forEach(p => {
        const btn = document.getElementById(`lmix-${p}`);
        if (btn) btn.className = `config-btn py-3 rounded-lg text-[10px] font-bold ${p === limperMixPreset ? 'selected' : ''}`;
    });
}

function buildDrillConfig() {
    const medals = loadMedals();
    const container = document.getElementById('drill-scenario-list');
    container.innerHTML = '';
    ['RFI', 'FACING_RFI', 'RFI_VS_3BET', 'VS_LIMP', 'SQUEEZE', 'SQUEEZE_2C', 'PUSH_FOLD'].forEach(sc => {
        // Count medals for this scenario
        let gC = 0, sC = 0, bC = 0;
        Object.keys(medals).forEach(k => {
            if (k.startsWith(sc + '|')) {
                const m = medals[k].medal;
                if (m === 'gold') gC++;
                else if (m === 'silver') sC++;
                else if (m === 'bronze') bC++;
            }
        });
        const medalStr = [gC ? `🥇${gC}` : '', sC ? `🥈${sC}` : '', bC ? `🥉${bC}` : ''].filter(Boolean).join(' ');
        const isSel = drillState.scenario === sc;
        const btn = document.createElement('button');
        btn.onclick = () => toggleDrillScenario(sc);
        btn.id = `drill-sc-${sc}`;
        btn.className = `config-btn py-4 rounded-xl font-bold text-left px-5 flex justify-between items-center ${isSel ? 'selected' : ''}`;
        btn.innerHTML = `<div class="flex flex-col gap-0.5">
            <span>${SCENARIO_NAMES[sc]}</span>
            ${medalStr ? `<span class="text-[10px] font-bold">${medalStr}</span>` : ''}
        </div>
        <span data-check="1">${isSel ? '✓' : ''}</span>`;
        container.appendChild(btn);
    });
    // Build positions for drill
    const posContainer = document.getElementById('drill-pos-list');
    posContainer.innerHTML = '';
    ALL_POSITIONS.forEach(p => {
        const btn = document.createElement('button');
        btn.onclick = () => toggleDrillPos(p);
        btn.id = `drill-pos-${p}`;
        btn.className = `config-btn py-3 rounded-lg text-xs font-black ${drillState.positions.includes(p) ? 'selected' : ''}`;
        btn.innerText = POS_LABELS[p] || p;
        posContainer.appendChild(btn);
    });
}

function saveConfig() {
    localStorage.setItem(profileKey('gto_config_v2'), JSON.stringify(state.config));
}
function setOpenSize(size) {
    state.config.openSize = size;
    saveConfig();
    updateOpenSizeUI();
}
function updateOpenSizeUI() {
    [12, 15, 20].forEach(s => {
        const btn = document.getElementById(`osize-${s}`);
        if (btn) btn.className = `config-btn py-3 rounded-lg text-[10px] font-bold ${s === state.config.openSize ? 'selected' : ''}`;
    });
}
function loadConfig() {
    try {
        const s = localStorage.getItem(profileKey('gto_config_v2'));
        if (s) {
            const c = JSON.parse(s);
            const validScenarios = ['RFI', 'FACING_RFI', 'RFI_VS_3BET', 'VS_LIMP', 'SQUEEZE', 'SQUEEZE_2C', 'PUSH_FOLD', 'POSTFLOP_CBET'];
            if (c.scenarios && Array.isArray(c.scenarios)) {
                state.config.scenarios = c.scenarios.filter(s => validScenarios.includes(s));
                if (state.config.scenarios.length === 0) state.config.scenarios = ['RFI', 'FACING_RFI', 'RFI_VS_3BET', 'VS_LIMP', 'SQUEEZE', 'SQUEEZE_2C'];
            }
            if (c.positions && Array.isArray(c.positions)) {
                state.config.positions = c.positions.filter(p => ALL_POSITIONS.includes(p));
                if (state.config.positions.length === 0) state.config.positions = [...ALL_POSITIONS];
            }
            if (c.openSize && [12, 15, 20].includes(c.openSize)) {
                state.config.openSize = c.openSize;
            }
        }
    } catch(e) {}
}

function updateConfigUI() {
    // Open training
    ['RFI', 'FACING_RFI', 'RFI_VS_3BET', 'VS_LIMP', 'SQUEEZE', 'SQUEEZE_2C', 'PUSH_FOLD', 'POSTFLOP_CBET'].forEach(s => {
        const btn = document.getElementById(`cfg-${s}`);
        if (!btn) return;
        const isSel = state.config.scenarios.includes(s);
        btn.className = `config-btn py-4 rounded-xl font-bold text-left px-5 flex justify-between items-center ${isSel ? 'selected' : ''}`;
        btn.querySelector('span').innerText = isSel ? '✓' : '';
    });
    ALL_POSITIONS.forEach(p => {
        const btn = document.getElementById(`cfg-pos-${p}`);
        if (!btn) return;
        const isSel = state.config.positions.includes(p);
        btn.className = `config-btn py-3 rounded-lg text-xs font-black ${isSel ? 'selected' : ''}`;
    });
    // Focused drill
    ['RFI', 'FACING_RFI', 'RFI_VS_3BET', 'VS_LIMP', 'SQUEEZE', 'SQUEEZE_2C', 'POSTFLOP_CBET'].forEach(s => {
        const btn = document.getElementById(`drill-sc-${s}`);
        if (!btn) return;
        const isSel = drillState.scenario === s;
        btn.className = `config-btn py-4 rounded-xl font-bold text-left px-5 flex justify-between items-center ${isSel ? 'selected' : ''}`;
        const span = btn.querySelector('[data-check]');
        if (span) span.innerText = isSel ? '✓' : '';
    });
    ALL_POSITIONS.forEach(p => {
        const btn = document.getElementById(`drill-pos-${p}`);
        if (!btn) return;
        const isSel = drillState.positions.includes(p);
        btn.className = `config-btn py-3 rounded-lg text-xs font-black ${isSel ? 'selected' : ''}`;
    });
    updateLimperMixUI();
    updateOpenSizeUI();
}

function updateDrillCounter() {
    if (drillState.active) {
        document.getElementById('drill-counter').classList.remove('hidden');
        document.getElementById('drill-progress').innerText = `${state.sessionStats.total}/${drillState.handCount}`;
    } else {
        document.getElementById('drill-counter').classList.add('hidden');
    }
}

function checkDrillComplete() {
    if (!drillState.active) return false;
    if (state.sessionStats.total >= drillState.handCount) {
        showDrillComplete();
        return true;
    }
    return false;
}

function showDrillComplete() {
    const total = state.sessionStats.total;
    const correct = state.sessionStats.correct;
    const accuracy = total ? Math.round(correct / total * 100) : 0;

    const isChallenge = (typeof challengeState !== 'undefined' && challengeState && challengeState.active);

    // === CHALLENGE MODE COMPLETE ===
    if (isChallenge) {
        const node = (typeof CHALLENGE_NODES !== 'undefined')
            ? CHALLENGE_NODES.find(n => n.id === challengeState.nodeId)
            : null;

        const req = node ? node.acc : (challengeState.reqAcc || 0);
        const passed = accuracy >= req;

        try { finishChallengeAttempt(passed, accuracy); } catch(e) {}

        const statusIcon = passed ? '✅' : '❌';
        const statusText = passed ? 'Passed' : 'Not yet';
        const statusColor = passed ? 'text-emerald-400' : 'text-rose-400';
        const accColor = accuracy >= req ? 'text-emerald-400' : accuracy >= (req - 5) ? 'text-yellow-400' : 'text-rose-400';

        let html = `
            <div class="text-center mb-2">
                <p class="text-emerald-400/80 font-bold uppercase tracking-[0.2em] text-xs mb-3">Challenge Complete</p>
                <p class="text-xl font-black text-white">${node ? node.title : 'Challenge'}</p>
                <p class="text-[11px] text-slate-500 mt-1">${node ? node.desc : ''}</p>
            </div>

            <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-3">
                <div class="text-5xl">${statusIcon}</div>
                <p class="text-lg font-black ${statusColor}">${statusText}</p>
                <div class="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                    <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Target</p>
                    <p class="text-sm font-black text-slate-200 mt-1">${total} hands · ${req}%+ accuracy</p>
                </div>

                <div class="grid grid-cols-3 gap-4 w-full mt-2">
                    <div class="text-center">
                        <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Accuracy</p>
                        <p class="text-2xl font-black ${accColor}">${accuracy}%</p>
                    </div>
                    <div class="text-center">
                        <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Correct</p>
                        <p class="text-2xl font-black text-white">${correct}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Needed</p>
                        <p class="text-2xl font-black text-slate-200">${Math.max(0, Math.ceil(req/100*total) - correct)}</p>
                    </div>
                </div>

                ${passed ? `
                    <div class="w-full mt-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                        <p class="text-[11px] text-emerald-300 text-center font-bold">Node unlocked ✅</p>
                    </div>
                ` : `
                    <div class="w-full mt-1 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                        <p class="text-[11px] text-rose-300 text-center font-bold">Retry to unlock the next node</p>
                    </div>
                `}
            </div>

            <div class="flex flex-col gap-3 w-full mt-2">
                <button onclick="closeDrillComplete()" class="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black text-lg transition-all">Back to Challenge</button>
                <button onclick="retryChallenge()" class="w-full py-4 bg-slate-900 border border-slate-800 rounded-2xl font-black text-sm text-slate-300">Retry</button>
                <button onclick="endChallengeToMenu()" class="w-full py-4 bg-slate-900 border border-slate-800 rounded-2xl font-bold text-sm text-slate-500">Main Menu</button>
            </div>`;

        document.getElementById('drill-complete-body').innerHTML = html;
        document.getElementById('drill-complete-screen').classList.remove('hidden');
        return;
    }

    // === NORMAL DRILL COMPLETE ===
    const medal = getMedalForResult(total, accuracy);

    // Save medal if it's an upgrade
    const medals = loadMedals();
    const scenarioKey = drillState.scenario;
    // Medal is per-scenario (not per-position) for focused drills
    const existing = medals[scenarioKey];
    const isUpgrade = !existing || medalRank(medal) > medalRank(existing.medal);
    if (medal !== 'none' && isUpgrade) {
        medals[scenarioKey] = { medal, accuracy, hands: total, date: Date.now() };
        saveMedals(medals);
    }

    const accColor = accuracy >= 90 ? 'text-emerald-400' : accuracy >= 75 ? 'text-yellow-400' : accuracy >= 60 ? 'text-orange-400' : 'text-rose-400';
    const medalIcon = medal !== 'none' ? MEDAL_ICONS[medal] : '';
    const medalLabel = medal !== 'none' ? medal.charAt(0).toUpperCase() + medal.slice(1) : '';
    const medalColor = MEDAL_COLORS[medal] || '';
    const scName = SCENARIO_NAMES[drillState.scenario] || drillState.scenario;

    let html = `
        <div class="text-center mb-2">
            <p class="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs mb-3">Drill Complete</p>
            <p class="text-xl font-black text-white">${scName}</p>
        </div>

        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-4">
            ${medal !== 'none' ? `
                <div class="medal-pop text-6xl mb-1">${medalIcon}</div>
                <p class="text-lg font-black ${medalColor}">${medalLabel}${isUpgrade ? ' — New Best!' : ''}</p>
            ` : `
                <p class="text-slate-500 font-bold text-sm">Keep practicing!</p>
            `}

            <div class="grid grid-cols-3 gap-4 w-full mt-2">
                <div class="text-center">
                    <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Accuracy</p>
                    <p class="text-2xl font-black ${accColor}">${accuracy}%</p>
                </div>
                <div class="text-center">
                    <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Correct</p>
                    <p class="text-2xl font-black text-white">${correct}</p>
                </div>
                <div class="text-center">
                    <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Best Streak</p>
                    <p class="text-2xl font-black text-orange-400">${state.global.bestStreak || 0}</p>
                </div>

            </div>

            ${medal === 'none' ? `
                <div class="w-full mt-2 bg-slate-800 rounded-xl p-3">
                    <p class="text-[10px] text-slate-400 text-center">Next: 🥉 Bronze — ${MEDAL_THRESHOLDS.bronze.accuracy}% accuracy on ${MEDAL_THRESHOLDS.bronze.hands}+ hands</p>
                </div>
            ` : medal === 'bronze' ? `
                <div class="w-full mt-2 bg-slate-800 rounded-xl p-3">
                    <p class="text-[10px] text-slate-400 text-center">Next: 🥈 Silver — ${MEDAL_THRESHOLDS.silver.accuracy}% accuracy on ${MEDAL_THRESHOLDS.silver.hands}+ hands</p>
                </div>
            ` : medal === 'silver' ? `
                <div class="w-full mt-2 bg-slate-800 rounded-xl p-3">
                    <p class="text-[10px] text-slate-400 text-center">Next: 🥇 Gold — ${MEDAL_THRESHOLDS.gold.accuracy}% accuracy on ${MEDAL_THRESHOLDS.gold.hands}+ hands</p>
                </div>
            ` : ''}
        </div>

        <div class="flex flex-col gap-3 w-full mt-2">
            <button onclick="continueDrill()" class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-lg transition-all">Keep Going</button>
            <button onclick="closeDrillComplete()" class="w-full py-4 bg-slate-900 border border-slate-800 rounded-2xl font-bold text-sm text-slate-500">Done</button>
        </div>`;

    document.getElementById('drill-complete-body').innerHTML = html;
    document.getElementById('drill-complete-screen').classList.remove('hidden');
}


function continueDrill() {
    // Hide completion modal and continue the current drill/challenge run
    document.getElementById('drill-complete-screen').classList.add('hidden');
    // Reset per-session counters for the next segment
    state.sessionStats = { total: 0, correct: 0, streak: 0 };
    // Re-arm drill so checkDrillComplete fires again after the next batch
    drillState.active = true;
    updateUI(); saveProgress();
    try { __clearNextTimer(); __endResolve(); } catch(_) {}
    safeGenerateNextRound();
}

function closeDrillComplete() {
    document.getElementById('drill-complete-screen').classList.add('hidden');

    // If we just finished a challenge, go back to Challenge screen (not Menu)
    if (typeof challengeState !== 'undefined' && challengeState && challengeState.active) {
        // Keep nodeId around for the Challenge screen, but end the active run
        challengeState.active = false;
        exitToChallenge();
        return;
    }

    if (drillState._savedConfig) {
        state.config = drillState._savedConfig;
        drillState._savedConfig = null;
    }
    drillState.active = false;
    exitToMenu();
}


function showLibrary() {
    document.getElementById('library-screen').classList.remove('hidden');
    renderLibrary();
}

function hideLibrary() {
    document.getElementById('library-screen').classList.add('hidden');
}

function setLibCategory(cat) {
    state.libCategory = cat;
    renderLibrary();
}

// ── Library state ─────────────────────────────────────────────
const libSel = { category: 'RFI', heroPos: null, oppPos: null, bucket: '1L' };

function setLibCategory(cat) {
    state.libCategory = cat;
    libSel.category = cat;
    libSel.heroPos = null;
    libSel.oppPos = null;
    libSel.bucket = '1L';
    renderLibrary();
}

function setLibHero(pos) {
    libSel.heroPos = pos;
    libSel.oppPos = null;
    renderLibrary();
}

function setLibOpp(opp) {
    libSel.oppPos = opp;
    renderLibrary();
}

function setLibBucket(b) {
    libSel.bucket = b;
    renderLibrary();
}

// ── Build spot index for current category ──────────────────────
function getLibSpots() {
    const cat = libSel.category;
    if (cat === 'RFI') {
        return Object.keys(rfiRanges).map(p => ({ hero: p, opp: null, key: p }));
    } else if (cat === 'FACING_RFI') {
        return Object.keys(facingRfiRanges).map(k => {
            const [p, o] = k.split('_vs_'); return { hero: p, opp: o, key: k };
        });
    } else if (cat === 'RFI_VS_3BET') {
        return Object.keys(rfiVs3BetRanges).map(k => {
            const [p, o] = k.split('_vs_'); return { hero: p, opp: o, key: k };
        });
    } else if (cat === 'VS_LIMP') {
        return Object.keys(allFacingLimps).map(k => {
            const m = k.match(/(.+)_vs_(.+)_Limp/);
            return { hero: m[1], opp: m[2], key: k };
        });
    } else if (cat === 'SQUEEZE') {
        return Object.keys(squeezeRanges).map(k => {
            const p = parseSqueezeKey(k);
            return { hero: p.hero, opp: k, key: k,
                     label: `${POS_LABELS[p.opener]} opens · ${POS_LABELS[p.caller]} calls` };
        });
    } else if (cat === 'SQUEEZE_2C') {
        return Object.keys(squeezeVsRfiTwoCallers).map(k => {
            const p = parseSqueeze2CKey(k);
            return { hero: p.hero, opp: k, key: k,
                     label: `${POS_LABELS[p.opener]} opens · ${POS_LABELS[p.caller1]} & ${POS_LABELS[p.caller2]} call` };
        });
    }
    return [];
}

// ── Render toggle rows + chart area ───────────────────────────
function renderLibrary() {
    const cat = libSel.category;
    const spots = getLibSpots();

    // Update category tab styles
    ['RFI','FACING_RFI','RFI_VS_3BET','VS_LIMP','SQUEEZE','SQUEEZE_2C'].forEach(tab => {
        const btn = document.getElementById(`lib-tab-${tab}`);
        if (btn) btn.className = `whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-xs ${cat === tab ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`;
    });

    // Hero position row — unique heroes for this category
    const heroRow = document.getElementById('lib-hero-row');
    const heroes = [...new Set(spots.map(s => s.hero))];
    // Auto-select first hero if none set or current invalid
    if (!libSel.heroPos || !heroes.includes(libSel.heroPos)) libSel.heroPos = heroes[0] || null;

    heroRow.innerHTML = heroes.map(h => {
        const active = h === libSel.heroPos;
        return `<button onclick="setLibHero('${h}')" class="whitespace-nowrap px-3 py-1 rounded-full font-black text-[11px] transition-all ${active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}">${POS_LABELS[h] || h}</button>`;
    }).join('');

    // Opponent row (hidden for RFI which has no opponent)
    const oppRow = document.getElementById('lib-opp-row');
    if (cat === 'RFI') {
        oppRow.classList.add('hidden');
        libSel.oppPos = null;
    } else {
        oppRow.classList.remove('hidden');
        const heroSpots = spots.filter(s => s.hero === libSel.heroPos);
        const opps = [...new Set(heroSpots.map(s => s.opp))];
        if (!libSel.oppPos || !opps.includes(libSel.oppPos)) libSel.oppPos = opps[0] || null;

        oppRow.innerHTML = opps.map(o => {
            const active = o === libSel.oppPos;
            // For SQUEEZE/2C the opp is a full key; use the label
            const spot = heroSpots.find(s => s.opp === o);
            const label = spot && spot.label ? spot.label : (POS_LABELS[o] || o);
            return `<button onclick="setLibOpp('${o}')" class="whitespace-nowrap px-3 py-1 rounded-full font-black text-[11px] transition-all ${active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}">${label}</button>`;
        }).join('');
    }

    // Bucket row (VS_LIMP only)
    const bucketRow = document.getElementById('lib-bucket-row');
    if (cat === 'VS_LIMP') {
        bucketRow.classList.remove('hidden');
        bucketRow.innerHTML = [['1L','1 Limper'],['2L','2 Limpers'],['3P','3+ Limpers']].map(([b, lab]) => {
            const active = libSel.bucket === b;
            return `<button onclick="setLibBucket('${b}')" class="whitespace-nowrap px-3 py-1 rounded-full font-black text-[11px] transition-all ${active ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}">${lab}</button>`;
        }).join('');
    } else {
        bucketRow.classList.add('hidden');
    }

    renderLibraryChart();
}

// ── Render the single chart for current selection ─────────────
function renderLibraryChart() {
    const cat = libSel.category;
    const area = document.getElementById('lib-chart-area');
    if (!area) return;

    const spots = getLibSpots();
    let spot = null;

    if (cat === 'RFI') {
        spot = spots.find(s => s.hero === libSel.heroPos);
    } else {
        spot = spots.find(s => s.hero === libSel.heroPos && s.opp === libSel.oppPos);
    }

    if (!spot) { area.innerHTML = '<div class="text-slate-600 text-sm mt-10">No data for this selection.</div>'; return; }

    // Get data
    let data = null;
    if (cat === 'RFI') data = rfiRanges[spot.key];
    else if (cat === 'FACING_RFI') data = facingRfiRanges[spot.key];
    else if (cat === 'RFI_VS_3BET') data = rfiVs3BetRanges[spot.key];
    else if (cat === 'VS_LIMP') {
        data = getLimpDataForBucket(spot.hero, spot.opp, libSel.bucket) || allFacingLimps[spot.key];
    } else if (cat === 'SQUEEZE') data = squeezeRanges[spot.key];
    else if (cat === 'SQUEEZE_2C') data = squeezeVsRfiTwoCallers[spot.key];

    if (!data) { area.innerHTML = '<div class="text-slate-600 text-sm mt-10">No data for this selection.</div>'; return; }

    // Title
    let title = '';
    if (cat === 'RFI') title = `${POS_LABELS[spot.hero]} Open Range`;
    else if (cat === 'VS_LIMP') title = `${POS_LABELS[spot.hero]} vs ${POS_LABELS[spot.opp]} Limp`;
    else if (cat === 'SQUEEZE' || cat === 'SQUEEZE_2C') {
        const p = cat === 'SQUEEZE' ? parseSqueezeKey(spot.key) : parseSqueeze2CKey(spot.key);
        title = cat === 'SQUEEZE'
            ? `${POS_LABELS[p.hero]} Squeeze — ${POS_LABELS[p.opener]} opens, ${POS_LABELS[p.caller]} calls`
            : `${POS_LABELS[p.hero]} Squeeze — ${POS_LABELS[p.opener]} opens, ${POS_LABELS[p.caller1]} & ${POS_LABELS[p.caller2]} call`;
    } else {
        title = `${POS_LABELS[spot.hero]} vs ${POS_LABELS[spot.opp]}`;
    }

    // Legend
    let legendHtml = '';
    if (cat === 'RFI') {
        legendHtml = '<div class="flex gap-4 text-[10px] font-bold uppercase tracking-wider"><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-indigo-600 inline-block"></span>Open</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-slate-950 border border-slate-700 inline-block"></span>Fold</span></div>';
    } else if (cat === 'VS_LIMP') {
        legendHtml = '<div class="flex gap-4 text-[10px] font-bold uppercase tracking-wider"><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-orange-600 inline-block"></span>Iso</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-cyan-700 inline-block"></span>Limp</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-slate-950 border border-slate-700 inline-block"></span>Fold</span></div>';
    } else if (cat === 'SQUEEZE' || cat === 'SQUEEZE_2C') {
        legendHtml = '<div class="flex gap-4 text-[10px] font-bold uppercase tracking-wider"><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-red-600 inline-block"></span>Squeeze</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-emerald-600 inline-block"></span>Call</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-slate-950 border border-slate-700 inline-block"></span>Fold</span></div>';
    } else {
        const raiseLabel = cat === 'RFI_VS_3BET' ? '4-Bet' : '3-Bet';
        legendHtml = `<div class="flex gap-4 text-[10px] font-bold uppercase tracking-wider"><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-indigo-600 inline-block"></span>${raiseLabel}</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-emerald-600 inline-block"></span>Call</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-slate-950 border border-slate-700 inline-block"></span>Fold</span></div>`;
    }

    // Build grid
    let grid = '';
    // Rank labels row
    grid += RANKS.map(r => `<div class="aspect-square flex items-center justify-center text-[7px] font-black text-slate-600">${r}</div>`).join('');
    for (let i = 0; i < 13; i++) {
        for (let j = 0; j < 13; j++) {
            const r1 = RANKS[i], r2 = RANKS[j];
            const hKey = (i === j) ? r1 + r2 : (i < j ? r1 + r2 + 's' : r2 + r1 + 'o');
            let bg = 'bg-slate-900';
            if (cat === 'RFI') {
                if (checkRangeHelper(hKey, data)) bg = 'bg-indigo-600';
            } else if (cat === 'VS_LIMP') {
                if (checkRangeHelper(hKey, getLimpRaise(data))) bg = 'bg-orange-600';
                else if (checkRangeHelper(hKey, getLimpPassive(data))) bg = 'bg-cyan-700';
            } else if (cat === 'SQUEEZE' || cat === 'SQUEEZE_2C') {
                if (checkRangeHelper(hKey, data["Squeeze"])) { bg = isSqueezeBluff(hKey, data) ? 'bg-red-600 sq-bluff-stripe' : 'bg-red-600'; }
                else if (data["Call"] && checkRangeHelper(hKey, data["Call"])) bg = 'bg-emerald-600';
            } else {
                if (checkRangeHelper(hKey, data["3-bet"] || data["4-bet"])) bg = 'bg-indigo-600';
                else if (checkRangeHelper(hKey, data["Call"])) bg = 'bg-emerald-600';
            }
            // Cell label: suits label on diagonal, otherwise hand key small
            const isP = i === j, isS = i < j;
            const cellLabel = `<span class="text-[5px] font-black leading-none select-none ${bg === 'bg-slate-900' ? 'text-slate-700' : 'text-white/60'}">${hKey}</span>`;
            grid += `<div class="aspect-square rounded-[1px] ${bg} flex items-center justify-center">${cellLabel}</div>`;
        }
    }

    // Hand counts
    let counts = '';
    if (cat === 'RFI') {
        const n = (data || []).reduce((acc, combo) => acc + countCombos(combo), 0);
        counts = `<div class="text-[11px] text-slate-500"><span class="font-bold text-slate-300">${n}</span> combos</div>`;
    } else if (data["3-bet"] || data["4-bet"] || data["Squeeze"]) {
        const raiseKey = data["3-bet"] ? "3-bet" : data["4-bet"] ? "4-bet" : "Squeeze";
        const nR = (data[raiseKey]||[]).reduce((acc,c)=>acc+countCombos(c),0);
        const nC = (data["Call"]||[]).reduce((acc,c)=>acc+countCombos(c),0);
        const raiseLabel = cat === 'RFI_VS_3BET' ? '4-bet' : cat === 'SQUEEZE' || cat === 'SQUEEZE_2C' ? 'Squeeze' : '3-bet';
        counts = `<div class="flex gap-5 text-[11px] text-slate-500"><span><span class="font-bold text-indigo-400">${nR}</span> ${raiseLabel}</span><span><span class="font-bold text-emerald-400">${nC}</span> call</span></div>`;
    }

    area.innerHTML = `
        <div class="w-full max-w-sm flex flex-col items-center gap-3">
            <div class="text-center">
                <div class="text-[11px] font-black uppercase tracking-widest text-slate-300">${title}</div>
            </div>
            ${legendHtml}
            <div class="range-grid w-full gap-[1px]" style="grid-template-columns: repeat(13,1fr);">${grid}</div>
            ${counts}
            <button onclick="zoomSpot('${spot.hero}','${cat === 'SQUEEZE' || cat === 'SQUEEZE_2C' ? spot.key : (spot.opp||'')}','${cat}',null)" class="mt-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all">Full View</button>
        </div>
    `;
}

function countCombos(rangeStr) {
    // Quick combo counter for display
    if (!rangeStr) return 0;
    try {
        const expanded = expandList([rangeStr]);
        return expanded.reduce((acc, h) => {
            if (h.length === 2) return acc + 6; // pair
            if (h.endsWith('s')) return acc + 4;
            if (h.endsWith('o')) return acc + 12;
            return acc + 6;
        }, 0);
    } catch(_) { return 0; }
}

function zoomSpot(pos, opp, cat, spotIdx) {
    _chartIsReview = true;
    if (cat === 'VS_LIMP') {
        state.limperBucket = libSel.bucket || '1L';
    }
    showChart(pos, null, cat, opp);
}

// Legacy stub — keep for backward compat with any saved references
function switchLibBucket(spotIdx, pos, opp, bucket) {
    libSel.bucket = bucket;
    renderLibraryChart();
}

// --- TRAINER LOGIC ---

function generateNextRound() {
    // FIX Bug D: reset per-round so guard doesn't saturate across the session
    if (dailyRunState && dailyRunState.active) dailyRunState._rerollGuard = 0;

    const srDb = SR.getAll();

    if (reviewSession.active) {
        // SR-driven review: hand-level keys like "FACING_RFI|CO_vs_UTG|AKs"
        if (reviewSession.answered >= reviewSession.maxQ) {
            reviewSession.active = false;
            showReviewComplete();
            return;
        }
        const handLevelKey = SR.selectSpot(reviewSession.queue, reviewSession.recentKeys);
        reviewSession.recentKeys.push(handLevelKey);
        reviewSession.answered++;

        // Parse hand-level key: last segment is hand, rest is spotKey
        const lastPipe = handLevelKey.lastIndexOf('|');
        const reviewHand = handLevelKey.substring(lastPipe + 1);
        const spotKeyPart = handLevelKey.substring(0, lastPipe);
        const parts = spotKeyPart.split('|');
        state.scenario = parts[0];
        // Override hand if it's a real hand (not _LEGACY)
        state._reviewHandOverride = (reviewHand && reviewHand !== '_LEGACY' && reviewHand.length <= 4) ? reviewHand : null;

        if (state.scenario === 'RFI') {
            state.currentPos = parts[1];
            state.oppPos = '';
            state.villainOpenSize = 15; // RFI: hero opens, no villain open
        } else if (state.scenario === 'FACING_RFI') {
            const [p, o] = parts[1].split('_vs_');
            state.currentPos = p; state.oppPos = o;
            state.villainOpenSize = pickVillainOpenSize(); // FIX Bug A: was stale
        } else if (state.scenario === 'RFI_VS_3BET') {
            const [p, o] = parts[1].split('_vs_');
            state.currentPos = p; state.oppPos = o;
            state.villainOpenSize = getOpenSize$(); // FIX Bug A: was stale
        } else if (state.scenario === 'VS_LIMP') {
            const m = parts[1].match(/(.+)_vs_(.+)_Limp/);
            state.currentPos = m ? m[1] : 'BTN';
            state.oppPos = m ? m[2] : 'UTG';
            const possibleBucket = parts[2];
            if (possibleBucket === '1L' || possibleBucket === '2L' || possibleBucket === '3P') {
                state.limperBucket = possibleBucket;
            } else {
                state.limperBucket = '1L';
            }
            if (state.limperBucket === '1L') {
                state.limperPositions = [state.oppPos];
            } else {
                const numL = state.limperBucket === '2L' ? 2 : 3;
                let limpers = generateLimperPositions(numL, state.currentPos);
                if (!limpers.includes(state.oppPos)) {
                    if (limpers.length >= numL) limpers[limpers.length - 1] = state.oppPos;
                    else limpers.push(state.oppPos);
                    const ao = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];
                    limpers.sort((a, b) => ao.indexOf(a) - ao.indexOf(b));
                }
                state.limperPositions = limpers;
                state.oppPos = limpers[0];
            }
        } else if (state.scenario === 'SQUEEZE') {
            const p = parseSqueezeKey(parts[1]);
            state.currentPos = p.hero;
            state.squeezeOpener = p.opener;
            state.squeezeCaller = p.caller;
            state.oppPos = parts[1];
        } else if (state.scenario === 'SQUEEZE_2C') {
            const p = parseSqueeze2CKey(parts[1]);
            state.currentPos = p.hero;
            state.squeezeOpener = p.opener;
            state.squeezeCaller = p.caller1;
            state.squeezeCaller2 = p.caller2;
            state.oppPos = parts[1];
        } else {
            // Fallback for any other scenario with a pos_vs_pos key
            const [p, o] = parts[1].split('_vs_');
            state.currentPos = p; state.oppPos = o;
        }
    } else {
        // Normal training: random scenario/spot respecting config
        const validScenarios = state.config.scenarios.filter(s => {
            if (s === 'RFI') return state.config.positions.some(p => rfiRanges[p]);
            if (s === 'FACING_RFI') return state.config.positions.some(p => Object.keys(facingRfiRanges).some(k => k.startsWith(p + '_vs_')));
            if (s === 'RFI_VS_3BET') return state.config.positions.some(p => Object.keys(rfiVs3BetRanges).some(k => k.startsWith(p + '_vs_')));
            if (s === 'VS_LIMP') { const lp = state.config.positions; return Object.keys(allFacingLimps).some(k => { const m = k.match(/(.+)_vs_(.+)_Limp/); return m && lp.includes(m[1]); }); }
            if (s === 'SQUEEZE') { return Object.keys(squeezeRanges).some(k => { const p = parseSqueezeKey(k); return p && state.config.positions.includes(p.hero); }); }
            if (s === 'SQUEEZE_2C') { return Object.keys(squeezeVsRfiTwoCallers).some(k => { const p = parseSqueeze2CKey(k); return p && state.config.positions.includes(p.hero); }); }
            if (s === 'PUSH_FOLD') { return (state.pfStacks || state.config.pfStacks || [10]).length > 0 && state.config.positions.some(p => p !== 'BB'); }
            if (s === 'POSTFLOP_CBET') { return typeof POSTFLOP_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_STRATEGY).length > 0; }
            return false;
        });
        if (!validScenarios.length) { console.warn('[Trainer] No valid scenarios for config:', JSON.stringify(state.config)); return; }
        console.log('[Trainer] Config scenarios:', state.config.scenarios, '→ valid:', validScenarios);

        // 80/20 due-item priority: if SR has due hands matching config, pick from due set 80% of the time
        let usedDuePick = false;
        const validScSet = new Set(validScenarios);
        const dueKeys = SR.getDueSpots(false).filter(k => {
            const parts = k.split('|');
            if (!validScSet.has(parts[0])) return false;
            // Check position is in config
            const spotId = parts[1] || '';
            const heroPos = spotId.split('_vs_')[0].replace(/_Limp$/, '');
            if (parts[0] === 'SQUEEZE') {
                const sq = parseSqueezeKey(spotId);
                return sq && state.config.positions.includes(sq.hero);
            }
            if (parts[0] === 'SQUEEZE_2C') {
                const sq = parseSqueeze2CKey(spotId);
                return sq && state.config.positions.includes(sq.hero);
            }
            return state.config.positions.includes(heroPos);
        });
        if (dueKeys.length > 0 && Math.random() < 0.8) {
            const dueKey = dueKeys[Math.floor(Math.random() * dueKeys.length)];
            const lastPipe = dueKey.lastIndexOf('|');
            const spotKeyPart = dueKey.substring(0, lastPipe);
            const dueHand = dueKey.substring(lastPipe + 1);
            const parts = spotKeyPart.split('|');
            state.scenario = parts[0];
            if (state.scenario === 'RFI') {
                state.currentPos = parts[1]; state.oppPos = '';
            } else if (state.scenario === 'VS_LIMP') {
                const m = parts[1].match(/(.+)_vs_(.+)_Limp/);
                state.currentPos = m ? m[1] : 'BTN'; state.oppPos = m ? m[2] : 'UTG';
                // Extract limper bucket from SR key if present (part after _Limp| e.g. "|2L")
                // SR keys: VS_LIMP|BTN_vs_UTG_Limp|2L|AKs - bucket is parts[2] if it matches
                const possibleBucket = parts[2];
                if (possibleBucket === '1L' || possibleBucket === '2L' || possibleBucket === '3P') {
                    state.limperBucket = possibleBucket;
                } else {
                    state.limperBucket = '1L';
                }
                if (state.limperBucket === '1L') {
                    state.limperPositions = [state.oppPos];
                } else {
                    const numL = state.limperBucket === '2L' ? 2 : 3;
                    let limpers = generateLimperPositions(numL, state.currentPos);
                    if (!limpers.includes(state.oppPos)) {
                        if (limpers.length >= numL) limpers[limpers.length - 1] = state.oppPos;
                        else limpers.push(state.oppPos);
                        const ao = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];
                        limpers.sort((a, b) => ao.indexOf(a) - ao.indexOf(b));
                    }
                    state.limperPositions = limpers;
                    state.oppPos = limpers[0];
                }
            } else if (state.scenario === 'SQUEEZE') {
                const p = parseSqueezeKey(parts[1]);
                if (p) { state.currentPos = p.hero; state.squeezeOpener = p.opener; state.squeezeCaller = p.caller; state.oppPos = parts[1]; }
            } else if (state.scenario === 'SQUEEZE_2C') {
                const p = parseSqueeze2CKey(parts[1]);
                if (p) { state.currentPos = p.hero; state.squeezeOpener = p.opener; state.squeezeCaller = p.caller1; state.squeezeCaller2 = p.caller2; state.oppPos = parts[1]; }
            } else if (state.scenario === 'PUSH_FOLD') {
                state.currentPos = parts[1];
                state.oppPos = '';
                // stack depth encoded as "10BB" in parts[2]
                const bbStr = parts[2] || '10BB';
                state.stackBB = parseInt(bbStr) || 10;
            } else {
                const [p, o] = parts[1].split('_vs_');
                state.currentPos = p; state.oppPos = o;
            }
            // Override hand selection with the due hand if valid
            if (dueHand && dueHand !== '_LEGACY' && dueHand.length <= 4) {
                state._reviewHandOverride = dueHand;
            }
            usedDuePick = true;
        }

        if (!usedDuePick) {
        state.scenario = validScenarios[Math.floor(Math.random() * validScenarios.length)];
        if (state.scenario === 'RFI') {
            const avail = state.config.positions.filter(p => rfiRanges[p]);
            state.currentPos = avail[Math.floor(Math.random() * avail.length)];
            state.oppPos = '';
        } else if (state.scenario === 'FACING_RFI') {
            const pairs = Object.keys(facingRfiRanges).filter(p => state.config.positions.includes(p.split('_vs_')[0]));
            const key = pairs[Math.floor(Math.random() * pairs.length)];
            [state.currentPos, state.oppPos] = key.split('_vs_');
            state.villainOpenSize = pickVillainOpenSize();
        } else if (state.scenario === 'RFI_VS_3BET' || state.scenario === 'RFI_VS_3') {
            const pairs = Object.keys(rfiVs3BetRanges).filter(p => state.config.positions.includes(p.split('_vs_')[0]));
            const key = pairs[Math.floor(Math.random() * pairs.length)];
            [state.currentPos, state.oppPos] = key.split('_vs_');
            state.villainOpenSize = getOpenSize$(); // hero opened; villain 3-bet sizes off hero's open
        } else if (state.scenario === 'VS_LIMP') {
            // Filter limp keys to enabled hero positions
            const limpKeys = Object.keys(allFacingLimps).filter(k => {
                const m = k.match(/(.+)_vs_(.+)_Limp/);
                return m && state.config.positions.includes(m[1]);
            });
            const key = limpKeys[Math.floor(Math.random() * limpKeys.length)];
            const m = key.match(/(.+)_vs_(.+)_Limp/);
            state.currentPos = m[1];
            state.oppPos = m[2]; // firstLimper position
            // Pick limper bucket — respect challenge node lock if active
            state.limperBucket = (drillState.lockedLimperBucket) ? drillState.lockedLimperBucket : pickLimperBucket();
            // Generate limper positions for multi-limp
            if (state.limperBucket === '1L') {
                state.limperPositions = [state.oppPos];
            } else {
                const numLimpers = state.limperBucket === '2L' ? 2 : 3;
                let limpers = generateLimperPositions(numLimpers, state.currentPos);
                // Ensure firstLimper is in the list (it anchors the base range)
                if (!limpers.includes(state.oppPos)) {
                    // Replace a random non-first limper or add
                    if (limpers.length >= numLimpers) limpers[limpers.length - 1] = state.oppPos;
                    else limpers.push(state.oppPos);
                    const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];
                    limpers.sort((a, b) => actionOrder.indexOf(a) - actionOrder.indexOf(b));
                }
                state.limperPositions = limpers;
                // oppPos stays as first limper (for range lookup)
                state.oppPos = limpers[0];
            }
        } else if (state.scenario === 'SQUEEZE') {
            const sqKeys = Object.keys(squeezeRanges).filter(k => {
                const p = parseSqueezeKey(k);
                return p && state.config.positions.includes(p.hero);
            });
            const key = sqKeys[Math.floor(Math.random() * sqKeys.length)];
            const p = parseSqueezeKey(key);
            state.currentPos = p.hero;
            state.squeezeOpener = p.opener;
            state.squeezeCaller = p.caller;
            state.oppPos = key; // full key for data lookup
            state.villainOpenSize = pickVillainOpenSize();
        } else if (state.scenario === 'SQUEEZE_2C') {
            const sqKeys = Object.keys(squeezeVsRfiTwoCallers).filter(k => {
                const p = parseSqueeze2CKey(k);
                return p && state.config.positions.includes(p.hero);
            });
            const key = sqKeys[Math.floor(Math.random() * sqKeys.length)];
            const p = parseSqueeze2CKey(key);
            state.currentPos = p.hero;
            state.squeezeOpener = p.opener;
            state.squeezeCaller = p.caller1;
            state.squeezeCaller2 = p.caller2;
            state.oppPos = key;
            state.villainOpenSize = pickVillainOpenSize();
        } else if (state.scenario === 'PUSH_FOLD') {
            // Pick a random enabled stack depth and a random eligible hero position
            const stacks = state.pfStacks || state.config.pfStacks || [5,8,10,13,15,20];
            state.stackBB = stacks[Math.floor(Math.random() * stacks.length)];
            // Hero can be any configured position except BB (BB is call-only, handled separately as oppPos)
            const pfPositions = state.config.positions.filter(p => p !== 'BB' && PF_PUSH[state.stackBB] && PF_PUSH[state.stackBB][p]);
            if (!pfPositions.length) { state.currentPos = 'BTN'; } else {
                state.currentPos = pfPositions[Math.floor(Math.random() * pfPositions.length)];
            }
            state.oppPos = '';
        } else if (state.scenario === 'POSTFLOP_CBET') {
            // Postflop: generate spot, store in state.postflop, skip normal hand sampling
            const spot = generatePostflopSpot();
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else {
            const pairs = Object.keys(rfiVs3BetRanges).filter(p => state.config.positions.includes(p.split('_vs_')[0]));
            const key = pairs[Math.floor(Math.random() * pairs.length)];
            [state.currentPos, state.oppPos] = key.split('_vs_');
        }
        } // end if (!usedDuePick)
    }

    // Set scenario hint text
    if (state.scenario === 'RFI') {
        document.getElementById('scenario-hint').innerText = "Folded to you...";
    } else if (state.scenario === 'FACING_RFI') {
        document.getElementById('scenario-hint').innerText = `${POS_LABELS[state.oppPos]} raises to ${fmt$(getVillainOpenSize$())}...`;
    } else if (state.scenario === 'VS_LIMP') {
        if (state.limperBucket === '3P') {
            document.getElementById('scenario-hint').innerText = `3+ limp pot, you're on ${POS_LABELS[state.currentPos]}...`;
        } else if (state.limperBucket === '2L') {
            const l1 = POS_LABELS[state.limperPositions[0]] || '?';
            const l2 = POS_LABELS[state.limperPositions[1]] || '?';
            document.getElementById('scenario-hint').innerText = `${l1} & ${l2} limp, you're on ${POS_LABELS[state.currentPos]}...`;
        } else {
            document.getElementById('scenario-hint').innerText = `${POS_LABELS[state.oppPos]} limps, you're on ${POS_LABELS[state.currentPos]}...`;
        }
    } else if (state.scenario === 'SQUEEZE') {
        document.getElementById('scenario-hint').innerText = `${POS_LABELS[state.squeezeOpener]} opens, ${POS_LABELS[state.squeezeCaller]} calls...`;
    } else if (state.scenario === 'SQUEEZE_2C') {
        document.getElementById('scenario-hint').innerText = `${POS_LABELS[state.squeezeOpener]} opens, ${POS_LABELS[state.squeezeCaller]} and ${POS_LABELS[state.squeezeCaller2]} call...`;
    } else if (state.scenario === 'PUSH_FOLD') {
        document.getElementById('scenario-hint').innerText = `${state.stackBB}BB effective — shove or fold?`;
    } else if (state.scenario === 'POSTFLOP_CBET' && state.postflop) {
        const spot = state.postflop;
        const posLabel = spot.positionState === 'IP' ? 'IP' : 'OOP';
        document.getElementById('scenario-hint').innerText = `You opened ${POS_LABELS[spot.heroPos]}, ${POS_LABELS[spot.villainPos]} called. You are ${posLabel}.`;
    } else {
        document.getElementById('scenario-hint').innerText = `You raised, ${POS_LABELS[state.oppPos]} 3-bets to ${fmt$(get3betSize$(state.oppPos, state.currentPos))}...`;
    }

    // 

    // Daily Run: enforce the run-owned scenario pool strictly.
    if (dailyRunState && dailyRunState.active && !dailyRunAllowsScenario(state.scenario)) {
        dailyRunState._rerollGuard = (dailyRunState._rerollGuard || 0) + 1;
        if (dailyRunState._rerollGuard < 120) {
            return generateNextRound();
        }
        console.warn('[DailyRun] Could not build an allowed spot after many rerolls. Resetting guard and trying again.');
        dailyRunState._rerollGuard = 0;
        state._reviewHandOverride = null;
        return generateNextRound();
    }
// Sample hand using EdgeWeight (edge-case focus), or use review override
    // POSTFLOP: skip hand sampling, render community cards and postflop buttons instead
    if (state.scenario === 'POSTFLOP_CBET' && state.postflop) {
        clearToast();
        // Render the actual dealt hero hole cards face-up.
        // spot.heroHand.cards = [{rank, suit}, {rank, suit}] with concrete suits.
        // We pre-apply the 'flipped' class so they show face-up immediately —
        // there is no flip animation step in the postflop path.
        (function() {
            const spot = state.postflop;
            const handDisplay = document.getElementById('hand-display');
            if (!handDisplay) return;
            if (spot && spot.heroHand && spot.heroHand.cards && spot.heroHand.cards.length === 2) {
                const mkCard = function(rank, suit) {
                    const sym = SUIT_SYMBOLS[suit] || suit;
                    const colorCls = (suit === 'h' || suit === 'd') ? 'text-rose-600' : 'text-slate-900';
                    return '<div class="hero-card-wrapper" style="width:var(--hero-card-w,64px);height:var(--hero-card-h,96px);">' +
                        '<div class="hero-card-inner flipped" style="width:100%;height:100%;">' +
                            '<div class="hero-card-back-face"></div>' +
                            '<div class="hero-card-front card-display flex flex-col items-center" style="width:100%;height:100%;">' +
                                '<div class="h-1/2 w-full flex items-end justify-center pb-1">' +
                                    '<span class="font-black leading-none ' + colorCls + '" style="font-size:var(--hero-rank-size,32px);">' + rank + '</span>' +
                                '</div>' +
                                '<div class="h-1/2 w-full flex items-start justify-center pt-1">' +
                                    '<span class="leading-none ' + colorCls + '" style="font-size:var(--hero-suit-size,28px);">' + sym + '</span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                };
                handDisplay.innerHTML = mkCard(spot.heroHand.cards[0].rank, spot.heroHand.cards[0].suit) +
                                        mkCard(spot.heroHand.cards[1].rank, spot.heroHand.cards[1].suit);
            } else {
                // heroHand data missing — fall back to card backs so layout stays intact
                renderHeroCardBacks();
            }
        })();
        // Show flop info line
        const flopInfoEl = document.getElementById('flop-info-line');
        if (flopInfoEl) {
            const spot = state.postflop;
            const archLabel = ARCHETYPE_LABELS[spot.boardArchetype] || spot.boardArchetype;
            flopInfoEl.innerHTML = `<span class="text-slate-400">Flop:</span> ${_flopCardsHtml(spot.flopCards)} <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider ml-1">(${archLabel})</span>`;
            flopInfoEl.classList.remove('hidden');
        }
        // Render community cards on felt
        renderCommunityCards(state.postflop.flopCards);
        // Clear preflop card/bet layers
        const cl = document.getElementById('cards-layer'); if (cl) cl.innerHTML = '';
        const bl = document.getElementById('bets-layer'); if (bl) bl.innerHTML = '';
        // Update table seats
        try { updateTable(state.postflop.heroPos, state.postflop.villainPos); } catch(_) {}
        // Render postflop buttons (hidden, then reveal)
        renderPostflopButtons(true);
        setTimeout(() => renderPostflopButtons(false), 300);
        return;
    }
    // Clear postflop UI elements if we're in a preflop round
    try { clearCommunityCards(); } catch(_) {}

    if (state._reviewHandOverride) {
        state.currentHand = state._reviewHandOverride;
        state._reviewHandOverride = null;
    } else {
        const missBoostData = {
            byHand: state.global.byHand || {},
            recentHandKeys: state.recentHandKeys || []
        };
        state.currentHand = EdgeWeight.sampleHand(state.scenario, state.currentPos,
            state.scenario === 'VS_LIMP' ? state.oppPos + '|' + state.limperBucket : state.oppPos,
            srDb, missBoostData);
        // Track for variety guard
        const oppSuffix = state.scenario === 'VS_LIMP' ? '_Limp' : '';
        let curSRKey;
        if (state.scenario === 'SQUEEZE' || state.scenario === 'SQUEEZE_2C') curSRKey = `${state.scenario}|${state.oppPos}|${state.currentHand}`;
        else if (state.scenario === 'VS_LIMP') curSRKey = `${state.scenario}|${state.currentPos}_vs_${state.oppPos}_Limp|${state.limperBucket}|${state.currentHand}`;
        else if (state.scenario === 'PUSH_FOLD') curSRKey = `${state.scenario}|${state.currentPos}|${state.stackBB}BB|${state.currentHand}`;
        else curSRKey = `${state.scenario}|${state.currentPos}${state.oppPos ? '_vs_' + state.oppPos + oppSuffix : ''}|${state.currentHand}`;
        state.recentHandKeys.push(curSRKey);
        if (state.recentHandKeys.length > 10) state.recentHandKeys = state.recentHandKeys.slice(-10);
    }

    // Immediately show card backs and dimmed buttons so layout is stable
    renderHeroCardBacks();
    renderButtons(true); // hidden state
    clearToast();

    // Run the animated table sequence, then flip cards + reveal buttons
    // Safety: occasionally mobile Safari loses/clears layers during resize or a stale animation.
    // Recreate missing table layers before animating so we don't get stuck.
    try { ensureTableLayers(); } catch(e) {}

    runTableAnimation(state.currentPos, state.oppPos, state.scenario, () => {
        try {
            renderHand(state.currentHand);
        } catch (e) {
            console.warn('[Render] renderHand failed; forcing layer reset', e);
            try { ensureTableLayers(true); } catch(_) {}
            try { renderHand(state.currentHand); } catch(_) {}
        }
        // Flip after a tick so the DOM settles
        try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
        try { revealButtons(); } catch(_) {}
    });
}


// === Round guard to prevent double-advance / race conditions (especially on mobile + Challenge Mode) ===
window.__roundGuard = window.__roundGuard || { resolving: false, nextTimer: null };
function __clearNextTimer() {
    try {
        if (window.__roundGuard && window.__roundGuard.nextTimer) {
            clearTimeout(window.__roundGuard.nextTimer);
            window.__roundGuard.nextTimer = null;
        }
    } catch(_) {}
}
function __endResolve() { try { if (window.__roundGuard) window.__roundGuard.resolving = false; } catch(_) {} }
function __beginResolve() {
    window.__roundGuard = window.__roundGuard || { resolving: false, nextTimer: null };
    if (window.__roundGuard.resolving) return false;
    window.__roundGuard.resolving = true;
    __clearNextTimer();
    return true;
}

function handleInput(action) {
    if (!__beginResolve()) return;
    // Immediately disable buttons to prevent double-clicks
    const grid = document.querySelector('#action-buttons > div');
    if (grid) { grid.classList.remove('action-buttons-revealed'); grid.classList.add('action-buttons-hidden'); }

    let correctAction;
    if (state.scenario === 'RFI') {
        correctAction = checkRangeHelper(state.currentHand, rfiRanges[state.currentPos]) ? 'RAISE' : 'FOLD';
    } else if (state.scenario === 'FACING_RFI') {
        const data = facingRfiRanges[`${state.currentPos}_vs_${state.oppPos}`];
        if (checkRangeHelper(state.currentHand, data["3-bet"])) correctAction = "3BET";
        else if (data["Call"].length > 0 && checkRangeHelper(state.currentHand, data["Call"])) correctAction = "CALL";
        else correctAction = "FOLD";
    } else if (state.scenario === 'VS_LIMP') {
        const data = getLimpDataForBucket(state.currentPos, state.oppPos, state.limperBucket) || allFacingLimps[`${state.currentPos}_vs_${state.oppPos}_Limp`];
        if (checkRangeHelper(state.currentHand, getLimpRaise(data))) correctAction = "ISO";
        else if (isLimpBBSpot(data)) correctAction = "OVERLIMP"; // BB can't fold
        else if (checkRangeHelper(state.currentHand, getLimpPassive(data))) correctAction = "OVERLIMP";
        else correctAction = "FOLD";
    } else if (state.scenario === 'SQUEEZE') {
        const data = squeezeRanges[state.oppPos];
        if (data && checkRangeHelper(state.currentHand, data["Squeeze"])) correctAction = "SQUEEZE";
        else if (data && data["Call"] && checkRangeHelper(state.currentHand, data["Call"])) correctAction = "CALL";
        else correctAction = "FOLD";
    } else if (state.scenario === 'SQUEEZE_2C') {
        const data = squeezeVsRfiTwoCallers[state.oppPos];
        if (data && checkRangeHelper(state.currentHand, data["Squeeze"])) correctAction = "SQUEEZE";
        else if (data && data["Call"] && checkRangeHelper(state.currentHand, data["Call"])) correctAction = "CALL";
        else correctAction = "FOLD";
    } else if (state.scenario === 'PUSH_FOLD') {
        const pfRange = PF_PUSH[state.stackBB] && PF_PUSH[state.stackBB][state.currentPos];
        correctAction = (pfRange && checkRangeHelper(state.currentHand, pfRange)) ? 'SHOVE' : 'FOLD';
    } else {
        const data = rfiVs3BetRanges[`${state.currentPos}_vs_${state.oppPos}`];
        if (checkRangeHelper(state.currentHand, data["4-bet"])) correctAction = "4BET";
        else if (checkRangeHelper(state.currentHand, data["Call"])) correctAction = "CALL";
        else correctAction = "FOLD";
    }

    const correct = action === correctAction;
    state.sessionStats.total++; state.global.totalHands++;

    // Track per-scenario stats
    const sc = state.scenario;
    const hp = state.currentPos;
    const spotKey = sc === 'RFI' ? `${sc}|${hp}` : sc === 'VS_LIMP' ? `${sc}|${hp}_vs_${state.oppPos}_Limp|${state.limperBucket}` : (sc === 'SQUEEZE' || sc === 'SQUEEZE_2C') ? `${sc}|${state.oppPos}` : sc === 'PUSH_FOLD' ? `${sc}|${hp}|${state.stackBB}BB` : `${sc}|${hp}_vs_${state.oppPos}`;


    // Daily Run tracking (UI wrapper only — does not affect SR or core stats)
    if (dailyRunState && dailyRunState.active) {
        dailyRunState.total++;
        if (correct) {
            dailyRunState.correct++;
            dailyRunState.runStreak++;
            try { updateDRRoundCounter(); } catch(_){}
            try { if(navigator.vibrate) navigator.vibrate(25); } catch(_){}
        } else {
            // run ends on first miss — keep active true until checkDailyRunComplete fires
            dailyRunState.ended = true;
            try { const ov=document.getElementById('miss-flash-overlay'); if(ov){ov.classList.remove('active');void ov.offsetWidth;ov.classList.add('active');} } catch(_){}
            try { if(navigator.vibrate) navigator.vibrate([40,30,40]); } catch(_){}
        }
        if (!dailyRunState.bySpot[spotKey]) dailyRunState.bySpot[spotKey] = { total: 0, correct: 0 };
        dailyRunState.bySpot[spotKey].total++;
        if (correct) dailyRunState.bySpot[spotKey].correct++;
    }

    // Update SR for this hand within the spot
    const handSRKey = `${spotKey}|${state.currentHand}`;
    const srGrade = correct ? 'Good' : 'Again';
    SR.update(handSRKey, srGrade);
    // Track reviewed hands so they don't show again today
    if (reviewSession.active) reviewSession.todayDoneKeys.add(handSRKey);
    
    if (!state.global.byScenario[sc]) state.global.byScenario[sc] = { total: 0, correct: 0 };
    state.global.byScenario[sc].total++;

    if (!state.global.byPos[hp]) state.global.byPos[hp] = { total: 0, correct: 0 };
    state.global.byPos[hp].total++;
    const pg = normalizePos(hp);
    if (!state.global.byPosGroup[pg]) state.global.byPosGroup[pg] = { total: 0, correct: 0 };
    state.global.byPosGroup[pg].total++;
    if (!state.global.bySpot[spotKey]) state.global.bySpot[spotKey] = { total: 0, correct: 0 };
    state.global.bySpot[spotKey].total++;

    // Track per-hand stats within a spot (e.g. "RFI|BTN|AKs")
    const handKey = `${spotKey}|${state.currentHand}`;
    if (!state.global.byHand[handKey]) state.global.byHand[handKey] = { total: 0, correct: 0 };
    state.global.byHand[handKey].total++;

    // Track miss metadata for mistake-prioritization (does not touch SR)
    if (!correct) {
        state.global.byHand[handKey].lastMissedAt = Date.now();
        state.global.byHand[handKey].recentMissCount = (state.global.byHand[handKey].recentMissCount || 0) + 1;
    }

    // Detect squeeze bluffs
    let _isBluff = false;
    if (correctAction === 'SQUEEZE' && (sc === 'SQUEEZE' || sc === 'SQUEEZE_2C')) {
        const sqData = sc === 'SQUEEZE' ? squeezeRanges[state.oppPos] : squeezeVsRfiTwoCallers[state.oppPos];
        _isBluff = isSqueezeBluff(state.currentHand, sqData);
    }

    // Session log entry
    const logEntry = {
        hand: state.currentHand, pos: hp, oppPos: state.oppPos,
        scenario: sc, action: action, correctAction: correctAction,
        correct: correct, spotKey: spotKey, isBluff: _isBluff,
        limperBucket: state.limperBucket, limperPositions: state.limperPositions ? [...state.limperPositions] : []
    };
    if (!logEntry.spotKey) logEntry.spotKey = spotKey;
    state.sessionLog.unshift(logEntry); // newest first
    
    if (correct) {
        state.sessionStats.correct++; state.global.totalCorrect++; state.sessionStats.streak++;
        state.global.byScenario[sc].correct++;
        state.global.byPos[hp].correct++;
        state.global.byPosGroup[normalizePos(hp)].correct++;
        state.global.bySpot[spotKey].correct++;
        state.global.byHand[handKey].correct++;
        if (state.sessionStats.streak > (state.global.bestStreak || 0)) state.global.bestStreak = state.sessionStats.streak;
        // Tag bluff squeezes in correct toast
        if (correctAction === 'SQUEEZE' && (sc === 'SQUEEZE' || sc === 'SQUEEZE_2C')) {
            const sqData2 = sc === 'SQUEEZE' ? squeezeRanges[state.oppPos] : squeezeVsRfiTwoCallers[state.oppPos];
            if (isSqueezeBluff(state.currentHand, sqData2)) {
                showToast("Correct · Squeeze (Bluff)", "correct", 700);
            } else {
                showToast("Correct", "correct", 500);
            }
        } else {
            showToast("Correct", "correct", 500);
        }

        // Visual-only: slide hero bet chip onto table for correct betting actions
        const __bet$ = computeHeroBetDollarsForAction(action);
        if (__bet$ != null) animateHeroBetDollars(__bet$);

        updateUI(); saveProgress(); window.__roundGuard.nextTimer = setTimeout(() => { __endResolve(); if (!checkDrillComplete() && !checkDailyRunComplete()) safeGenerateNextRound(); }, 600);
    } else {
        state.sessionStats.streak = 0;
        let correctLabel = ACTION_LABELS[correctAction] || correctAction;
        // SB/BB vs limp uses different terminology
        if (state.scenario === 'VS_LIMP' && (state.currentPos === 'SB' || state.currentPos === 'BB')) {
            if (correctAction === 'ISO') correctLabel = 'Raise';
            else if (correctAction === 'OVERLIMP') correctLabel = state.currentPos === 'BB' ? 'Check' : 'Complete';
        }
        // Tag squeeze bluffs
        if (correctAction === 'SQUEEZE' && (state.scenario === 'SQUEEZE' || state.scenario === 'SQUEEZE_2C')) {
            const sqData = state.scenario === 'SQUEEZE' ? squeezeRanges[state.oppPos] : squeezeVsRfiTwoCallers[state.oppPos];
            if (isSqueezeBluff(state.currentHand, sqData)) correctLabel = 'Squeeze (Bluff)';
        }
        showToast(`Incorrect · ${correctLabel}`, "incorrect", 1500);
        updateUI(); saveProgress();
        setTimeout(() => showChart(state.currentPos, state.currentHand, state.scenario, state.oppPos), 0);
    
        // FAIL-SAFE: if chart doesn't show or user backs out, don't freeze on the same hand
        setTimeout(() => {
            const trainerHidden = document.getElementById('trainer-screen')?.classList?.contains('hidden');
            const chartHidden = document.getElementById('chart-modal')?.classList?.contains('hidden');
            if (trainerHidden) return;
            if (chartHidden && !checkDrillComplete() && !checkDailyRunComplete()) { __endResolve(); safeGenerateNextRound(); }
        }, 3500);
}
}


// --- TABLE UI FAIL-SAFES ---
// Mobile Safari (and some Android WebViews) can occasionally drop/clear DOM nodes inside the felt during
// resize/orientation changes or when a stale animation aborts mid-flight. If that happens, animations can throw
// before calling the "onDone" callback, leaving the app stuck with hidden buttons and an empty table.
function ensureTableLayers(forceReset = false) {
    const felt = document.getElementById('poker-felt-container');
    if (!felt) return false;

    const dealer = document.getElementById('dealer-button');
    const ensureLayer = (id) => {
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('div');
            el.id = id;
            // Keep layers above felt, below seats
            el.style.position = 'absolute';
            el.style.inset = '0';
            el.style.pointerEvents = 'none';
            // Insert right after dealer button if possible, otherwise append
            if (dealer && dealer.parentNode === felt && dealer.nextSibling) felt.insertBefore(el, dealer.nextSibling);
            else if (dealer && dealer.parentNode === felt) felt.insertBefore(el, dealer.nextSibling);
            else felt.appendChild(el);
        }
        if (forceReset) el.innerHTML = '';
        return el;
    };

    const bets = ensureLayer('bets-layer');
    const cards = ensureLayer('cards-layer');
    return !!(bets && cards);
}

function safeGenerateNextRound() {
    window.__roundGuard = window.__roundGuard || { resolving:false, nextTimer:null, generating:false };
    if (window.__roundGuard.generating) return;
    window.__roundGuard.generating = true;
    try {
        generateNextRound();
        window.__roundGuard.generating = false;
    } catch (e) {
        console.error('[Trainer] generateNextRound failed; attempting recovery', e);
        try { window.__roundGuard.generating = false; } catch(_) {}
        try { ensureTableLayers(true); } catch(_) {}
        // Small retry (next tick) in case we were mid-resize / DOM update.
        setTimeout(() => {
            try { generateNextRound(); } catch (e2) { console.error('[Trainer] recovery retry failed', e2); } finally { try { window.__roundGuard.generating = false; } catch(_) {} }
        }, 50);
    }
}


// Helper: get seat element coords as percentage strings

// ============================================================
// POSTFLOP TRAINING HELPERS
// ============================================================
let postflopStats = { total:0, correct:0, streak:0, byArchetype:{}, byFamily:{}, byPosition:{} };
function loadPostflopStats(){ try { const s=localStorage.getItem(profileKey('gto_postflop_stats_v1')); if(s) postflopStats=JSON.parse(s); } catch(e){} if(!postflopStats.byArchetype) postflopStats.byArchetype={}; if(!postflopStats.byFamily) postflopStats.byFamily={}; if(!postflopStats.byPosition) postflopStats.byPosition={}; }
function savePostflopStats(){ try { localStorage.setItem(profileKey('gto_postflop_stats_v1'),JSON.stringify(postflopStats)); } catch(e){} }

function _flopCardsHtml(cards){ return cards.map(c => { const color=flopSuitColor(c.suit); return `<span style="color:${color};font-weight:900;">${c.rank}${SUIT_SYMBOLS[c.suit]}</span>`; }).join(' '); }

function renderPostflopButtons(hidden){
    const container=document.getElementById('action-buttons');
    setSizingHint('');
    const sc=hidden?'action-buttons-hidden':'action-buttons-revealed';
    const bs=`style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML=`<div class="grid grid-cols-2 gap-3 ${sc}"><button onclick="handlePostflopInput('CHECK')" ${bs} class="bg-slate-800 border border-slate-600 rounded-2xl font-black text-slate-300">CHECK</button><button onclick="handlePostflopInput('CBET')" ${bs} class="bg-orange-600 rounded-2xl font-black text-white shadow-lg">C-BET</button></div>`;
}

function renderCommunityCards(cards){
    let cc=document.getElementById('community-cards');
    if(!cc){ const felt=document.getElementById('poker-felt-container'); if(!felt) return; cc=document.createElement('div'); cc.id='community-cards'; cc.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;gap:clamp(3px,0.8vw,8px);z-index:25;pointer-events:none;'; felt.appendChild(cc); }
    cc.innerHTML='';
    cards.forEach((c,i)=>{ const color=flopSuitColor(c.suit); const el=document.createElement('div'); el.className='card-display'; el.style.cssText=`width:var(--cc-w,42px);height:var(--cc-h,58px);display:flex;flex-direction:column;align-items:center;justify-content:center;animation:ccDeal 0.25s ease-out both;animation-delay:${i*0.12}s;`; el.innerHTML=`<div style="font-size:var(--cc-rank-size,16px);font-weight:900;color:${color};line-height:1;">${c.rank}</div><div style="font-size:var(--cc-suit-size,14px);color:${color};line-height:1;">${SUIT_SYMBOLS[c.suit]}</div>`; cc.appendChild(el); });
}
function clearCommunityCards(){ const cc=document.getElementById('community-cards'); if(cc) cc.innerHTML=''; const fi=document.getElementById('flop-info-line'); if(fi) fi.classList.add('hidden'); }

function handlePostflopInput(action){
    if(!__beginResolve()) return;
    const grid=document.querySelector('#action-buttons > div');
    if(grid){ grid.classList.remove('action-buttons-revealed'); grid.classList.add('action-buttons-hidden'); }
    const spot=state.postflop;
    if(!spot||!spot.strategy){ __endResolve(); return; }
    const result=scorePostflopAction(action,spot.strategy,spot);

    // Stats
    postflopStats.total++; state.sessionStats.total++; state.global.totalHands++;
    const srKey=`${spot.spotKey}|${spot.boardArchetype}`;
    SR.update(srKey, result.correct?'Good':'Again');
    if(!postflopStats.byArchetype[spot.boardArchetype]) postflopStats.byArchetype[spot.boardArchetype]={total:0,correct:0};
    postflopStats.byArchetype[spot.boardArchetype].total++;
    if(!postflopStats.byFamily[spot.preflopFamily]) postflopStats.byFamily[spot.preflopFamily]={total:0,correct:0};
    postflopStats.byFamily[spot.preflopFamily].total++;
    if(!postflopStats.byPosition[spot.positionState]) postflopStats.byPosition[spot.positionState]={total:0,correct:0};
    postflopStats.byPosition[spot.positionState].total++;

    // Scenario-level tracking
    const sc='POSTFLOP_CBET';
    if(!state.global.byScenario[sc]) state.global.byScenario[sc]={total:0,correct:0};
    state.global.byScenario[sc].total++;
    if(!state.global.bySpot[spot.spotKey]) state.global.bySpot[spot.spotKey]={total:0,correct:0};
    state.global.bySpot[spot.spotKey].total++;

    const logEntry={ scenario:sc, pos:spot.heroPos, oppPos:spot.villainPos, hand:flopStr(spot.flopCards), action, correctAction:result.correct?action:(action==='CBET'?'CHECK':'CBET'), correct:result.correct, spotKey:spot.spotKey, archetype:spot.boardArchetype, positionState:spot.positionState, feedback:result.feedback, flopCards:spot.flopCards, heroHand:spot.heroHand, heroHandClass:spot.heroHandClass, strategy:spot.strategy, grade:result.grade, freqPct:result.freqPct, reasoning:result.reasoning };
    state.sessionLog.unshift(logEntry);

    if(result.correct){
        postflopStats.correct++; postflopStats.streak=(postflopStats.streak||0)+1;
        state.sessionStats.correct++; state.sessionStats.streak++; state.global.totalCorrect++;
        if(state.sessionStats.streak>(state.global.bestStreak||0)) state.global.bestStreak=state.sessionStats.streak;
        postflopStats.byArchetype[spot.boardArchetype].correct++;
        postflopStats.byFamily[spot.preflopFamily].correct++;
        postflopStats.byPosition[spot.positionState].correct++;
        state.global.byScenario[sc].correct++;
        state.global.bySpot[spot.spotKey].correct++;
        updateUI(); saveProgress(); savePostflopStats();
        // Show feedback modal for correct answers — user taps ✕ or backdrop to advance.
        setTimeout(()=>showPostflopFeedback(spot,result,true),150);
    } else {
        postflopStats.streak=0; state.sessionStats.streak=0;
        updateUI(); saveProgress(); savePostflopStats();
        // Show feedback modal — no auto-advance; user must close it.
        setTimeout(()=>showPostflopFeedback(spot,result,false),150);
    }
}

function showPostflopFeedback(spot,result,isCorrect){
    let modal=document.getElementById('postflop-feedback-modal');
    if(!modal){ modal=document.createElement('div'); modal.id='postflop-feedback-modal'; modal.className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6'; document.body.appendChild(modal); }
    // Backdrop tap closes (and advances round when in active session)
    modal.onclick=function(e){ if(e.target===modal) closePostflopFeedback(true); };

    const archLabel=ARCHETYPE_LABELS[spot.boardArchetype]||spot.boardArchetype;
    const strat=spot.strategy||{actions:{bet33:0,check:0},reasoning:''};
    const betFreq=Math.round((strat.actions.bet33||0)*100);
    const checkFreq=Math.round((strat.actions.check||0)*100);

    // Header verdict line
    const handClassLabel = spot.heroHandClass ? (HAND_CLASS_LABELS[spot.heroHandClass]||spot.heroHandClass) : null;
    let verdictHtml, borderCls;
    if(isCorrect){
        const gradeTxt = result.grade==='marginal' ? 'Correct · Close spot' : 'Correct';
        verdictHtml=`<span class="text-emerald-400 font-black">✓ ${gradeTxt}</span>${handClassLabel?` <span class="text-slate-500 text-[10px]">[${handClassLabel}]</span>`:''}`;
        borderCls='border-emerald-800/60';
    } else {
        const gradeTxt = result.grade==='marginal_wrong' ? 'Close' : 'Incorrect';
        verdictHtml=`<span class="text-rose-400 font-black">✗ ${gradeTxt}</span>${handClassLabel?` <span class="text-slate-500 text-[10px]">[${handClassLabel}]</span>`:''}`;
        borderCls='border-rose-900/60';
    }

    // Hero hand html
    const heroCardHtml = (spot.heroHand&&spot.heroHand.cards&&spot.heroHand.cards.length===2)
        ? spot.heroHand.cards.map(c=>{const col=flopSuitColor(c.suit);return `<span style="color:${col};font-weight:900;">${c.rank}${SUIT_SYMBOLS[c.suit]}</span>`;}).join(' ')
        : '';

    // Your action vs preferred
    const yourActionLabel = result.correct ? (result.preferredLabel) : (result.preferredLabel==='C-Bet'?'Check':'C-Bet');
    const correctLabel = result.preferredLabel;

    modal.innerHTML=`<div class="bg-slate-900 border ${borderCls} rounded-2xl p-5 max-w-sm w-full shadow-2xl">
        <div class="flex items-center justify-between mb-3">
            <div class="text-xs font-black uppercase tracking-widest text-slate-400">${POS_LABELS[spot.heroPos]} vs ${POS_LABELS[spot.villainPos]} · ${spot.positionState}</div>
            <button onclick="closePostflopFeedback(true)" class="text-slate-500 hover:text-white text-lg font-bold leading-none">✕</button>
        </div>
        <div class="flex items-center gap-3 mb-3">
            ${heroCardHtml ? `<div class="text-sm font-black text-white">${heroCardHtml}</div><div class="text-slate-600 text-xs">on</div>` : ''}
            <div class="text-sm font-bold text-slate-200">${_flopCardsHtml(spot.flopCards)} <span class="text-slate-500 text-xs">(${archLabel})</span></div>
        </div>
        <div class="text-sm mb-3">${verdictHtml}${!isCorrect?` · <span class="text-slate-400 text-xs">Correct: <span class="text-emerald-400 font-bold">${correctLabel}</span></span>`:''}</div>
        <div class="flex gap-2 items-center mb-2"><div class="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden"><div class="h-full bg-orange-500 rounded-full" style="width:${betFreq}%"></div></div><div class="text-xs font-black text-orange-400 w-14 text-right">C-Bet ${betFreq}%</div></div>
        <div class="flex gap-2 items-center mb-4"><div class="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden"><div class="h-full bg-slate-500 rounded-full" style="width:${checkFreq}%"></div></div><div class="text-xs font-black text-slate-400 w-14 text-right">Check ${checkFreq}%</div></div>
        <div class="text-xs text-slate-400 leading-relaxed">${strat.reasoning||''}</div>
        <div class="mt-4 text-center"><button onclick="closePostflopFeedback(true)" class="text-xs text-slate-500 hover:text-white font-bold uppercase tracking-widest">Tap anywhere to continue</button></div>
    </div>`;
    modal.classList.remove('hidden');
}
function closePostflopFeedback(andAdvance){
    const m=document.getElementById('postflop-feedback-modal');
    if(m) m.classList.add('hidden');
    if(andAdvance){ __endResolve(); if(!checkDrillComplete()&&!checkDailyRunComplete()) safeGenerateNextRound(); }
}
