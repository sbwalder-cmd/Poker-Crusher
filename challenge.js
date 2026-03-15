// challenge.js — Challenge Path v2: tiered campaign with medals, DAG prereqs, multi-scenario trials
// Loaded after training.js, before ui.js. Depends on: ALL_POSITIONS, drillState, setDrillMode,
// setDrillCount, state, challengeState (from training.js), profileKey, markCloudDirty (from cloud.js),
// startConfiguredTraining (from ui.js), generatePostflopSpot (from ranges.js).

// ============================================================
// TIER DEFINITIONS
// ============================================================
const CHALLENGE_TIERS = [
    { id: 'T1', name: 'Opening Fundamentals', icon: '\u2660', color: 'indigo' },
    { id: 'T2', name: 'Defending',            icon: '\uD83D\uDEE1', color: 'blue' },
    { id: 'T3', name: 'Facing 3-Bets',        icon: '\u2694', color: 'purple' },
    { id: 'T4', name: 'Limper Trees',          icon: '\uD83C\uDF33', color: 'teal' },
    { id: 'T5', name: 'Squeeze Pressure',      icon: '\uD83D\uDCA5', color: 'orange' },
    { id: 'T6', name: 'Postflop: Flop',        icon: '\uD83C\uDCCF', color: 'cyan' },
    { id: 'T7', name: 'Postflop: Turn',        icon: '\uD83C\uDF00', color: 'sky' },
    { id: 'T8', name: 'Integration Trials',    icon: '\uD83D\uDD25', color: 'rose' },
    { id: 'T9', name: 'Boss',                  icon: '\uD83D\uDC51', color: 'amber' },
];

// ============================================================
// NODE DEFINITIONS — 30-node campaign
// ============================================================
const CHALLENGE_NODES = [
    // TIER 1 — Opening Fundamentals
    {
        id: 'c1_open_lp', tier: 'T1',
        title: 'Open: Late Position', desc: 'CO and BTN opening ranges',
        filters: { scenarios: ['RFI'], heroPositions: ['CO', 'BTN'] },
        hands: 25, thresholds: { pass: 75, silver: 85, gold: 92 },
        prereqs: [], tierGate: null,
    },
    {
        id: 'c2_open_ep', tier: 'T1',
        title: 'Open: Early Position', desc: 'UTG through UTG2 — tight is right',
        filters: { scenarios: ['RFI'], heroPositions: ['UTG', 'UTG1', 'UTG2'] },
        hands: 25, thresholds: { pass: 78, silver: 88, gold: 94 },
        prereqs: ['c1_open_lp'], tierGate: null,
    },
    {
        id: 'c3_open_mp', tier: 'T1',
        title: 'Open: Middle Position', desc: 'LJ and HJ opens',
        filters: { scenarios: ['RFI'], heroPositions: ['LJ', 'HJ'] },
        hands: 25, thresholds: { pass: 78, silver: 88, gold: 94 },
        prereqs: ['c2_open_ep'], tierGate: null,
    },
    {
        id: 'c4_open_sb', tier: 'T1',
        title: 'Open: Small Blind', desc: 'SB open ranges',
        filters: { scenarios: ['RFI'], heroPositions: ['SB'] },
        hands: 25, thresholds: { pass: 75, silver: 85, gold: 92 },
        prereqs: ['c3_open_mp'], tierGate: null,
    },

    // TIER 2 — Defending
    {
        id: 'c5_bb_defend', tier: 'T2',
        title: 'BB Defend vs Late Opens', desc: 'BB vs CO, BTN, SB raises',
        filters: { scenarios: ['FACING_RFI'], heroPositions: ['BB'], oppPositions: ['CO', 'BTN', 'SB'] },
        hands: 25, thresholds: { pass: 75, silver: 85, gold: 92 },
        prereqs: ['c4_open_sb'], tierGate: null,
    },
    {
        id: 'c6_blinds_vs_epm', tier: 'T2',
        title: 'Blinds vs EP/MP Opens', desc: 'SB & BB defending vs early/mid raises',
        filters: { scenarios: ['FACING_RFI'], heroPositions: ['SB', 'BB'], oppPositions: ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ'] },
        hands: 25, thresholds: { pass: 73, silver: 83, gold: 90 },
        prereqs: ['c5_bb_defend'], tierGate: null,
    },
    {
        id: 'c7_ip_defense', tier: 'T2',
        title: 'IP Defense (BTN)', desc: 'BTN defending vs all opens',
        filters: { scenarios: ['FACING_RFI'], heroPositions: ['BTN'] },
        hands: 25, thresholds: { pass: 75, silver: 85, gold: 92 },
        prereqs: ['c6_blinds_vs_epm'], tierGate: null,
    },

    // TIER 3 — Facing 3-Bets
    {
        id: 'c8_vs3b_lp', tier: 'T3',
        title: 'vs 3bet: Late Position', desc: 'CO and BTN facing 3-bets',
        filters: { scenarios: ['RFI_VS_3BET'], heroPositions: ['CO', 'BTN'] },
        hands: 25, thresholds: { pass: 72, silver: 82, gold: 90 },
        prereqs: ['c7_ip_defense'], tierGate: null,
    },
    {
        id: 'c9_vs3b_mp', tier: 'T3',
        title: 'vs 3bet: Middle Position', desc: 'LJ and HJ facing 3-bets',
        filters: { scenarios: ['RFI_VS_3BET'], heroPositions: ['LJ', 'HJ'] },
        hands: 25, thresholds: { pass: 72, silver: 82, gold: 90 },
        prereqs: ['c8_vs3b_lp'], tierGate: null,
    },
    {
        id: 'c10_vs3b_ep_sb', tier: 'T3',
        title: 'vs 3bet: EP + SB', desc: 'Early positions and SB facing 3-bets',
        filters: { scenarios: ['RFI_VS_3BET'], heroPositions: ['UTG', 'UTG1', 'UTG2', 'SB'] },
        hands: 25, thresholds: { pass: 70, silver: 80, gold: 88 },
        prereqs: ['c9_vs3b_mp'], tierGate: null,
    },

    // TIER 4 — Limper Trees
    {
        id: 'c11_limp1_ip', tier: 'T4',
        title: 'Vs 1 Limper (IP)', desc: 'CO and BTN iso-raise vs single limper',
        filters: { scenarios: ['VS_LIMP'], heroPositions: ['CO', 'BTN'], limperBucket: '1L' },
        hands: 25, thresholds: { pass: 73, silver: 83, gold: 90 },
        prereqs: ['c10_vs3b_ep_sb'], tierGate: null,
    },
    {
        id: 'c12_limp1_blinds', tier: 'T4',
        title: 'Vs 1 Limper (Blinds)', desc: 'SB and BB iso-raise vs single limper',
        filters: { scenarios: ['VS_LIMP'], heroPositions: ['SB', 'BB'], limperBucket: '1L' },
        hands: 25, thresholds: { pass: 73, silver: 83, gold: 90 },
        prereqs: ['c11_limp1_ip'], tierGate: null,
    },
    {
        id: 'c13_limp2', tier: 'T4',
        title: 'Vs 2 Limpers', desc: 'All positions, 2-limper pot',
        filters: { scenarios: ['VS_LIMP'], heroPositions: [...ALL_POSITIONS], limperBucket: '2L' },
        hands: 25, thresholds: { pass: 70, silver: 80, gold: 88 },
        prereqs: ['c12_limp1_blinds'], tierGate: null,
    },
    {
        id: 'c14_limp3p', tier: 'T4',
        title: 'Vs 3+ Limpers', desc: 'All positions, 3+ limper pot',
        filters: { scenarios: ['VS_LIMP'], heroPositions: [...ALL_POSITIONS], limperBucket: '3P' },
        hands: 20, thresholds: { pass: 68, silver: 78, gold: 86 },
        prereqs: ['c13_limp2'], tierGate: null,
    },

    // TIER 5 — Squeeze
    {
        id: 'c15_squeeze_basics', tier: 'T5',
        title: 'Squeeze Basics', desc: 'All squeeze positions, 1 caller',
        filters: { scenarios: ['SQUEEZE'], heroPositions: [...ALL_POSITIONS] },
        hands: 25, thresholds: { pass: 70, silver: 80, gold: 88 },
        prereqs: ['c14_limp3p'], tierGate: null,
    },
    {
        id: 'c16_squeeze_blinds', tier: 'T5',
        title: 'Squeeze from Blinds', desc: 'SB and BB squeeze spots',
        filters: { scenarios: ['SQUEEZE'], heroPositions: ['SB', 'BB'] },
        hands: 25, thresholds: { pass: 70, silver: 80, gold: 88 },
        prereqs: ['c15_squeeze_basics'], tierGate: null,
    },
    {
        id: 'c17_squeeze_2c', tier: 'T5',
        title: 'Squeeze vs 2 Callers', desc: 'Open + 2 callers',
        filters: { scenarios: ['SQUEEZE_2C'], heroPositions: [...ALL_POSITIONS] },
        hands: 25, thresholds: { pass: 68, silver: 78, gold: 86 },
        prereqs: ['c16_squeeze_blinds'], tierGate: null,
    },

    // TIER 6 — Postflop: Flop
    {
        id: 'c18_cbet_ip', tier: 'T6',
        title: 'C-Bet: IP vs BB', desc: 'BTN and CO c-bet vs BB',
        filters: { scenarios: ['POSTFLOP_CBET'], heroPositions: [...ALL_POSITIONS], postflopFamilies: ['BTN_vs_BB', 'CO_vs_BB'] },
        hands: 25, thresholds: { pass: 68, silver: 78, gold: 86 },
        prereqs: ['c17_squeeze_2c'], tierGate: null,
    },
    {
        id: 'c19_cbet_full', tier: 'T6',
        title: 'C-Bet: Full Range', desc: 'All preflop families, all textures',
        filters: { scenarios: ['POSTFLOP_CBET'], heroPositions: [...ALL_POSITIONS] },
        hands: 25, thresholds: { pass: 65, silver: 75, gold: 84 },
        prereqs: ['c18_cbet_ip'], tierGate: null,
    },
    {
        id: 'c20_cbet_reads', tier: 'T6',
        title: 'C-Bet: Board Reads', desc: 'Prove your board texture reads',
        filters: { scenarios: ['POSTFLOP_CBET'], heroPositions: [...ALL_POSITIONS] },
        hands: 30, thresholds: { pass: 68, silver: 78, gold: 86 },
        prereqs: ['c19_cbet_full'], tierGate: null,
    },
    {
        id: 'c20b_defend_ip', tier: 'T6',
        title: 'Flop Defense: IP Spots', desc: 'BB defending vs BTN and CO c-bets',
        filters: { scenarios: ['POSTFLOP_DEFEND'], heroPositions: [...ALL_POSITIONS], postflopFamilies: ['BTN_vs_BB', 'CO_vs_BB'] },
        hands: 25, thresholds: { pass: 65, silver: 75, gold: 84 },
        prereqs: ['c20_cbet_reads'], tierGate: null,
    },
    {
        id: 'c20c_defend_full', tier: 'T6',
        title: 'Flop Defense: Full', desc: 'BB defending vs all c-bet families',
        filters: { scenarios: ['POSTFLOP_DEFEND'], heroPositions: [...ALL_POSITIONS] },
        hands: 25, thresholds: { pass: 63, silver: 73, gold: 82 },
        prereqs: ['c20b_defend_ip'], tierGate: null,
    },

    // TIER 7 — Postflop: Turn
    {
        id: 'c21_turn_barrel', tier: 'T7',
        title: 'Turn Barrel: IP', desc: 'Firing the turn after a flop c-bet',
        filters: { scenarios: ['POSTFLOP_TURN_CBET'], heroPositions: [...ALL_POSITIONS] },
        hands: 25, thresholds: { pass: 65, silver: 75, gold: 84 },
        prereqs: ['c20c_defend_full'], tierGate: 'T6',
    },
    {
        id: 'c22_turn_defense', tier: 'T7',
        title: 'Turn Defense: OOP', desc: 'Defending vs the turn barrel',
        filters: { scenarios: ['POSTFLOP_TURN_DEFEND'], heroPositions: [...ALL_POSITIONS] },
        hands: 25, thresholds: { pass: 63, silver: 73, gold: 82 },
        prereqs: ['c21_turn_barrel'], tierGate: null,
    },
    {
        id: 'c23_turn_delayed', tier: 'T7',
        title: 'Delayed Turn Bet', desc: 'Betting turn after checking flop',
        filters: { scenarios: ['POSTFLOP_TURN_DELAYED_CBET'], heroPositions: [...ALL_POSITIONS] },
        hands: 25, thresholds: { pass: 63, silver: 73, gold: 82 },
        prereqs: ['c22_turn_defense'], tierGate: null,
    },
    {
        id: 'c23b_turn_mixed', tier: 'T7',
        title: 'Turn Mixed: All Lines', desc: 'Barrel, defense, and delayed bet combined',
        filters: { scenarios: ['POSTFLOP_TURN_CBET', 'POSTFLOP_TURN_DEFEND', 'POSTFLOP_TURN_DELAYED_CBET'], heroPositions: [...ALL_POSITIONS] },
        hands: 30, thresholds: { pass: 63, silver: 73, gold: 82 },
        prereqs: ['c23_turn_delayed'], tierGate: null,
    },
    {
        id: 'c23c_turn_probe', tier: 'T7',
        title: 'Turn Probe Lines', desc: 'Probe offense and defense after flop check-through (BTN/CO vs BB)',
        filters: { scenarios: ['POSTFLOP_TURN_PROBE', 'POSTFLOP_TURN_PROBE_DEFEND'], heroPositions: [...ALL_POSITIONS], postflopFamilies: ['BTN_vs_BB', 'CO_vs_BB'] },
        hands: 25, thresholds: { pass: 63, silver: 73, gold: 82 },
        prereqs: ['c23b_turn_mixed'], tierGate: null,
    },

    // TIER 8 — Integration Trials
    {
        id: 'c21_fund_trial', tier: 'T8',
        title: 'Fundamentals Trial', desc: 'Opening + Defense — prove the basics',
        filters: { scenarios: ['RFI', 'FACING_RFI'], heroPositions: [...ALL_POSITIONS] },
        hands: 30, thresholds: { pass: 78, silver: 86, gold: 92 },
        prereqs: ['c17_squeeze_2c'], tierGate: 'T7',
    },
    {
        id: 'c22_pressure_trial', tier: 'T8',
        title: 'Pressure Trial', desc: 'Squeeze + Limps under one roof',
        filters: { scenarios: ['SQUEEZE', 'SQUEEZE_2C', 'VS_LIMP'], heroPositions: [...ALL_POSITIONS] },
        hands: 30, thresholds: { pass: 75, silver: 83, gold: 90 },
        prereqs: ['c21_fund_trial'], tierGate: null,
    },
    {
        id: 'c23_complete_trial', tier: 'T8',
        title: 'Complete Game Trial', desc: 'All scenarios including flop + turn postflop',
        filters: { scenarios: ['RFI', 'FACING_RFI', 'RFI_VS_3BET', 'VS_LIMP', 'SQUEEZE', 'SQUEEZE_2C', 'POSTFLOP_CBET', 'POSTFLOP_DEFEND', 'POSTFLOP_TURN_CBET', 'POSTFLOP_TURN_DEFEND', 'POSTFLOP_TURN_DELAYED_CBET', 'POSTFLOP_TURN_PROBE', 'POSTFLOP_TURN_PROBE_DEFEND'], heroPositions: [...ALL_POSITIONS] },
        hands: 40, thresholds: { pass: 72, silver: 80, gold: 88 },
        prereqs: ['c22_pressure_trial'], tierGate: null,
    },

    // TIER 9 — Boss
    {
        id: 'c24_boss', tier: 'T9',
        title: 'Poker Crusher Boss', desc: 'The ultimate preflop + flop + turn gauntlet',
        filters: { scenarios: ['RFI', 'FACING_RFI', 'RFI_VS_3BET', 'VS_LIMP', 'SQUEEZE', 'SQUEEZE_2C', 'POSTFLOP_CBET', 'POSTFLOP_DEFEND', 'POSTFLOP_TURN_CBET', 'POSTFLOP_TURN_DEFEND', 'POSTFLOP_TURN_DELAYED_CBET', 'POSTFLOP_TURN_PROBE', 'POSTFLOP_TURN_PROBE_DEFEND'], heroPositions: [...ALL_POSITIONS] },
        hands: 50, thresholds: { pass: 80, silver: 87, gold: 93 },
        prereqs: ['c23_complete_trial'], tierGate: null,
    },
];

// ============================================================
// CHALLENGE STATE (runtime — reuses challengeState from training.js)
// ============================================================
// challengeState = { active: false, nodeId: null, reqAcc: 0 } — already declared in training.js

// ============================================================
// PROGRESS PERSISTENCE — v2 schema
// ============================================================
const CHALLENGE_V2_KEY_SUFFIX = 'gto_challenge_v2';

function loadChallengeV2() {
    try { const s = localStorage.getItem(profileKey(CHALLENGE_V2_KEY_SUFFIX)); return s ? JSON.parse(s) : null; } catch(e) { return null; }
}
function saveChallengeV2(obj) {
    try { localStorage.setItem(profileKey(CHALLENGE_V2_KEY_SUFFIX), JSON.stringify(obj)); } catch(e) {}
    markCloudDirty();
}

function getChallengeProgress() {
    let saved = loadChallengeV2();
    if (saved && saved.v === 2 && saved.nodes) return saved;
    // Try v1 migration
    saved = _migrateChallengeV1();
    if (saved) return saved;
    // Default fresh progress
    return { v: 2, nodes: {}, lastPlayed: null, completedAt: null };
}

// v1 → v2 migration
function _migrateChallengeV1() {
    let v1 = null;
    try { const s = localStorage.getItem(profileKey('gto_challenge_v1')); v1 = s ? JSON.parse(s) : null; } catch(e) {}
    if (!v1 || v1.v !== 1 || !v1.nodes) return null;

    // Map old node IDs to new ones where reasonable
    const ID_MAP = {
        'n1_rfi_ep': 'c2_open_ep',
        'n2_rfi_mp': 'c3_open_mp',
        'n3_rfi_lp': 'c1_open_lp',
        'n4_rfi_blinds': 'c4_open_sb',
        'n5_def_blinds': 'c5_bb_defend', // partial — v1 was SB+BB, v2 node 5 is BB only
        'n6_vs3b_ip': 'c8_vs3b_lp',
        'n7_vs3b_oop': 'c10_vs3b_ep_sb',
        'n8_vs_limp': 'c11_limp1_ip',
        'n9_squeeze': 'c15_squeeze_basics',
    };

    const v2nodes = {};
    for (const [oldId, rec] of Object.entries(v1.nodes)) {
        const newId = ID_MAP[oldId];
        if (!newId) continue;
        v2nodes[newId] = {
            bestAcc: rec.bestAcc || 0,
            medal: rec.completed ? 'pass' : 'none',
            attempts: 1,
            firstPassedAt: rec.completedAt || null,
            lastPlayedAt: rec.completedAt || null,
        };
    }

    const v2 = { v: 2, nodes: v2nodes, lastPlayed: v1.lastPlayed ? (ID_MAP[v1.lastPlayed] || null) : null, completedAt: null };
    saveChallengeV2(v2);
    return v2;
}

// ============================================================
// NODE STATUS HELPERS
// ============================================================
function getNodeMedal(progress, nodeId) {
    const rec = progress.nodes && progress.nodes[nodeId];
    if (!rec) return 'none';
    return rec.medal || 'none';
}

function isNodePassed(progress, nodeId) {
    const m = getNodeMedal(progress, nodeId);
    return m !== 'none';
}

function _allTierNodesPassed(progress, tierId) {
    return CHALLENGE_NODES.filter(n => n.tier === tierId).every(n => isNodePassed(progress, n.id));
}

function isNodeUnlocked(progress, node) {
    // Check direct prereqs
    if (node.prereqs && node.prereqs.length > 0) {
        if (!node.prereqs.every(pid => isNodePassed(progress, pid))) return false;
    }
    // Check tier gate
    if (node.tierGate) {
        if (!_allTierNodesPassed(progress, node.tierGate)) return false;
    }
    return true;
}

function computeMedal(accuracy, thresholds) {
    if (accuracy >= thresholds.gold) return 'gold';
    if (accuracy >= thresholds.silver) return 'silver';
    if (accuracy >= thresholds.pass) return 'pass';
    return 'none';
}

const CHALLENGE_MEDAL_ICONS = { gold: '\uD83E\uDD47', silver: '\uD83E\uDD48', pass: '\u2705', none: '' };
const CHALLENGE_MEDAL_LABELS = { gold: 'Gold', silver: 'Silver', pass: 'Pass', none: '' };
const CHALLENGE_MEDAL_RANK = { none: 0, pass: 1, silver: 2, gold: 3 };

// ============================================================
// TIER COLOR UTILITIES
// ============================================================
const TIER_COLORS = {
    indigo: { border: 'border-indigo-500/30', bg: 'bg-indigo-500/5', text: 'text-indigo-400', headerBg: 'bg-indigo-500/10' },
    blue: { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400', headerBg: 'bg-blue-500/10' },
    purple: { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400', headerBg: 'bg-purple-500/10' },
    teal: { border: 'border-teal-500/30', bg: 'bg-teal-500/5', text: 'text-teal-400', headerBg: 'bg-teal-500/10' },
    orange: { border: 'border-orange-500/30', bg: 'bg-orange-500/5', text: 'text-orange-400', headerBg: 'bg-orange-500/10' },
    cyan: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-400', headerBg: 'bg-cyan-500/10' },
    sky: { border: 'border-sky-500/30', bg: 'bg-sky-500/5', text: 'text-sky-400', headerBg: 'bg-sky-500/10' },
    rose: { border: 'border-rose-500/30', bg: 'bg-rose-500/5', text: 'text-rose-400', headerBg: 'bg-rose-500/10' },
    amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', headerBg: 'bg-amber-500/10' },
};

// ============================================================
// RENDERING — Challenge Screen
// ============================================================
function renderChallengeScreen() {
    const progress = getChallengeProgress();
    const body = document.getElementById('challenge-body');
    if (!body) return;

    let html = '';

    CHALLENGE_TIERS.forEach(tier => {
        const nodes = CHALLENGE_NODES.filter(n => n.tier === tier.id);
        if (!nodes.length) return;
        const tc = TIER_COLORS[tier.color] || TIER_COLORS.indigo;
        const tierDone = _allTierNodesPassed(progress, tier.id);

        html += `<div class="mb-3">
            <div class="flex items-center gap-2 mb-2 px-1">
                <span class="text-base">${tier.icon}</span>
                <span class="text-[11px] font-black uppercase tracking-widest ${tc.text}">${tier.name}</span>
                ${tierDone ? '<span class="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">CLEAR</span>' : ''}
            </div>
            <div class="flex flex-col gap-2">`;

        nodes.forEach(node => {
            const rec = progress.nodes[node.id] || {};
            const medal = rec.medal || 'none';
            const passed = medal !== 'none';
            const unlocked = isNodeUnlocked(progress, node);
            const best = rec.bestAcc != null ? rec.bestAcc : null;

            // Medal / status icon
            let statusIcon, statusClass;
            if (medal === 'gold') { statusIcon = '\uD83E\uDD47'; statusClass = 'text-yellow-400'; }
            else if (medal === 'silver') { statusIcon = '\uD83E\uDD48'; statusClass = 'text-slate-300'; }
            else if (medal === 'pass') { statusIcon = '\u2705'; statusClass = 'text-emerald-400'; }
            else if (unlocked) { statusIcon = '\uD83D\uDD13'; statusClass = 'text-slate-400'; }
            else { statusIcon = '\uD83D\uDD12'; statusClass = 'text-slate-600'; }

            // Progress bar towards gold
            const goldThresh = node.thresholds.gold;
            const barPct = best != null ? Math.min(100, Math.round(best / goldThresh * 100)) : 0;
            const barColor = medal === 'gold' ? 'bg-yellow-400' : medal === 'silver' ? 'bg-slate-300' : passed ? 'bg-emerald-500' : 'bg-indigo-500';

            const bestHtml = best != null
                ? `<span class="text-[10px] text-slate-400">Best: <span class="text-slate-200 font-black">${best}%</span></span>`
                : `<span class="text-[10px] text-slate-600">Best: —</span>`;

            // Button
            let btn;
            if (unlocked) {
                const btnCls = passed
                    ? 'pc-btn-utility text-slate-300'
                    : 'pc-btn-aggressive text-white';
                btn = `<button onclick="startChallengeNode('${node.id}')" class="px-3 py-2 ${btnCls} text-xs font-black" style="border-radius:12px;">${passed ? 'Replay' : 'Start'}</button>`;
            } else {
                btn = `<button disabled class="px-3 py-2 pc-btn-utility text-slate-700 text-xs font-black cursor-not-allowed opacity-40" style="border-radius:12px;">Locked</button>`;
            }

            // Threshold labels
            const threshLine = `${node.hands} hands · ${node.thresholds.pass}%+ to pass`;

            html += `<div class="bg-slate-900/40 border ${tc.border} rounded-2xl p-4 flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <span class="text-base ${statusClass}">${statusIcon}</span>
                        <p class="text-sm font-black text-slate-100 truncate">${node.title}</p>
                    </div>
                    <p class="text-[11px] text-slate-500 mt-1">${node.desc}</p>
                    <div class="flex items-center gap-3 mt-2">
                        <span class="text-[10px] text-slate-600 font-bold">${threshLine}</span>
                        ${bestHtml}
                    </div>
                    ${barPct > 0 ? `<div class="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden"><div class="${barColor} h-full rounded-full" style="width:${barPct}%"></div></div>` : ''}
                </div>
                <div class="shrink-0">${btn}</div>
            </div>`;
        });

        html += `</div></div>`;
    });

    body.innerHTML = html;
}

// ============================================================
// NAVIGATION
// ============================================================
function showChallengeMenu() {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('challenge-screen').classList.remove('hidden');
    renderChallengeScreen();
    // Check all-done banner after render
    setTimeout(() => {
        try {
            const prog = getChallengeProgress();
            const allDone = CHALLENGE_NODES.length > 0 && CHALLENGE_NODES.every(n => isNodePassed(prog, n.id));
            const banner = document.getElementById('challenge-complete-banner');
            if (banner) banner.classList.toggle('hidden', !allDone);
            // Update completedAt if boss is beaten
            if (allDone && !prog.completedAt) {
                prog.completedAt = Date.now();
                saveChallengeV2(prog);
            }
        } catch(_){}
    }, 100);
}

function closeChallengeMenu() {
    document.getElementById('challenge-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    // Safety: if a drill is running behind the menu, clean up
    const ts = document.getElementById('trainer-screen');
    if (ts && !ts.classList.contains('hidden') && (challengeState && challengeState.active)) {
        ts.classList.add('hidden');
        drillState.active = false;
        challengeState.active = false;
    }
    if (typeof updateMenuUI === 'function') updateMenuUI();
}

function resetChallengeProgress() {
    if (!confirm('Reset all Challenge Path progress? This cannot be undone.')) return;
    saveChallengeV2({ v: 2, nodes: {}, lastPlayed: null, completedAt: null });
    // Also clear the old v1 key if it exists
    try { localStorage.removeItem(profileKey('gto_challenge_v1')); } catch(_) {}
    renderChallengeScreen();
}

// ============================================================
// NODE EXECUTION
// ============================================================
function startChallengeNode(nodeId) {
    const node = CHALLENGE_NODES.find(n => n.id === nodeId);
    if (!node) return;

    const filters = node.filters;

    // Configure a focused drill
    setDrillMode('focused');
    // For multi-scenario nodes, set drillState.scenario to the first scenario (for display purposes)
    drillState.scenario = filters.scenarios[0];
    drillState.positions = filters.heroPositions ? [...filters.heroPositions] : [...ALL_POSITIONS];
    setDrillCount(node.hands);

    // Limper bucket lock
    if (filters.limperBucket) {
        drillState.lockedLimperBucket = filters.limperBucket;
    } else {
        drillState.lockedLimperBucket = null;
    }

    // Opponent position filtering
    state.config.oppPositions = filters.oppPositions || null;

    // Postflop family filtering
    state.config.postflopFamilies = filters.postflopFamilies || null;

    // Mark active challenge run
    challengeState.active = true;
    challengeState.nodeId = node.id;
    challengeState.reqAcc = node.thresholds.pass;  // for backward compat with showDrillComplete
    challengeState._thresholds = node.thresholds;   // full thresholds for medal computation

    const progress = getChallengeProgress();
    progress.lastPlayed = node.id;
    saveChallengeV2(progress);

    // Hide Challenge UI and start training
    document.getElementById('challenge-screen').classList.add('hidden');

    // For multi-scenario nodes, override state.config.scenarios AFTER startConfiguredTraining
    // saves the original config but BEFORE generateNextRound runs.
    // startConfiguredTraining sets state.config.scenarios = [drillState.scenario] for focused mode.
    // We need to patch it for multi-scenario trials.
    if (filters.scenarios.length > 1) {
        // Store original for later restore; startConfiguredTraining will save a copy first
        drillState._challengeMultiScenarios = [...filters.scenarios];
    } else {
        drillState._challengeMultiScenarios = null;
    }

    startConfiguredTraining();

    // Patch: if multi-scenario, override the single-scenario that startConfiguredTraining set
    if (drillState._challengeMultiScenarios) {
        state.config.scenarios = drillState._challengeMultiScenarios;
    }
}

function finishChallengeAttempt(passed, accuracy) {
    const progress = getChallengeProgress();
    const nodeId = challengeState.nodeId;
    const node = CHALLENGE_NODES.find(n => n.id === nodeId);
    const thresholds = node ? node.thresholds : (challengeState._thresholds || { pass: 75, silver: 85, gold: 92 });

    const medal = computeMedal(accuracy, thresholds);
    const rec = progress.nodes[nodeId] || { bestAcc: 0, medal: 'none', attempts: 0, firstPassedAt: null, lastPlayedAt: null };

    rec.attempts = (rec.attempts || 0) + 1;
    rec.bestAcc = Math.max(rec.bestAcc || 0, accuracy || 0);
    rec.lastPlayedAt = Date.now();

    // Only upgrade medal, never downgrade
    if (CHALLENGE_MEDAL_RANK[medal] > CHALLENGE_MEDAL_RANK[rec.medal || 'none']) {
        rec.medal = medal;
    }
    if (passed && !rec.firstPassedAt) {
        rec.firstPassedAt = Date.now();
    }

    progress.nodes[nodeId] = rec;
    saveChallengeV2(progress);
}

// ============================================================
// CHALLENGE-SPECIFIC DRILL COMPLETION UI
// ============================================================
function renderChallengeComplete(total, correct, accuracy) {
    const node = CHALLENGE_NODES.find(n => n.id === challengeState.nodeId);
    const thresholds = node ? node.thresholds : { pass: 75, silver: 85, gold: 92 };
    const medal = computeMedal(accuracy, thresholds);
    const passed = medal !== 'none';

    // Call finishChallengeAttempt to record progress
    try { finishChallengeAttempt(passed, accuracy); } catch(e) {}

    // Determine what was previously best
    const progress = getChallengeProgress();
    const rec = progress.nodes[challengeState.nodeId] || {};
    const isNewBest = (accuracy === rec.bestAcc);

    // Medal display
    let medalIcon, medalLabel, medalColor;
    if (medal === 'gold') { medalIcon = '\uD83E\uDD47'; medalLabel = 'Gold!'; medalColor = 'text-yellow-400'; }
    else if (medal === 'silver') { medalIcon = '\uD83E\uDD48'; medalLabel = 'Silver'; medalColor = 'text-slate-300'; }
    else if (medal === 'pass') { medalIcon = '\u2705'; medalLabel = 'Passed!'; medalColor = 'text-emerald-400'; }
    else { medalIcon = '\u274C'; medalLabel = 'Not yet'; medalColor = 'text-rose-400'; }

    const accColor = accuracy >= thresholds.gold ? 'text-yellow-400' : accuracy >= thresholds.silver ? 'text-slate-200' : accuracy >= thresholds.pass ? 'text-emerald-400' : accuracy >= (thresholds.pass - 5) ? 'text-yellow-400' : 'text-rose-400';

    // Find next unlock info
    let nextUnlockHtml = '';
    if (passed) {
        const freshProg = getChallengeProgress();
        const newlyUnlocked = CHALLENGE_NODES.filter(n => {
            if (isNodePassed(freshProg, n.id)) return false;
            return isNodeUnlocked(freshProg, n);
        });
        if (newlyUnlocked.length > 0) {
            nextUnlockHtml = `<div class="w-full mt-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <p class="text-[11px] text-emerald-300 text-center font-bold">Unlocked: ${newlyUnlocked.map(n => n.title).join(', ')}</p>
            </div>`;
        } else {
            nextUnlockHtml = `<div class="w-full mt-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <p class="text-[11px] text-emerald-300 text-center font-bold">Node complete \u2705</p>
            </div>`;
        }
    } else {
        nextUnlockHtml = `<div class="w-full mt-1 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
            <p class="text-[11px] text-rose-300 text-center font-bold">Need ${thresholds.pass}% to pass — retry!</p>
        </div>`;
    }

    // Threshold bar
    const threshBar = `<div class="flex items-center gap-2 w-full mt-2 text-[9px] font-bold">
        <span class="text-slate-500">Pass ${thresholds.pass}%</span>
        <span class="text-slate-400">Silver ${thresholds.silver}%</span>
        <span class="text-yellow-500">Gold ${thresholds.gold}%</span>
    </div>`;

    let html = `
        <div class="text-center mb-2">
            <p class="text-emerald-400/80 font-bold uppercase tracking-[0.2em] text-xs mb-3">Challenge Complete</p>
            <p class="text-xl font-black text-white">${node ? node.title : 'Challenge'}</p>
            <p class="text-[11px] text-slate-500 mt-1">${node ? node.desc : ''}</p>
        </div>

        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-3">
            <div class="text-5xl medal-pop">${medalIcon}</div>
            <p class="text-lg font-black ${medalColor}">${medalLabel}</p>
            ${isNewBest && passed ? '<p class="text-[11px] text-amber-400 font-bold">New personal best!</p>' : ''}

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
                    <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Total</p>
                    <p class="text-2xl font-black text-slate-200">${total}</p>
                </div>
            </div>

            ${threshBar}
            ${nextUnlockHtml}
        </div>

        <div class="flex flex-col gap-3 w-full mt-2">
            <button onclick="closeDrillComplete()" class="w-full py-4 pc-btn-primary transition-all">Back to Challenge</button>
            <button onclick="retryChallenge()" class="w-full py-4 pc-btn-utility font-black text-sm">Retry</button>
            <button onclick="endChallengeToMenu()" class="w-full py-4 pc-btn-utility font-bold text-sm">Main Menu</button>
        </div>`;

    document.getElementById('drill-complete-body').innerHTML = html;
    document.getElementById('drill-complete-screen').classList.remove('hidden');
}

// ============================================================
// NAVIGATION: Exit from challenge drill
// ============================================================
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
    drillState._challengeMultiScenarios = null;
    // Clean up oppPositions / postflopFamilies
    state.config.oppPositions = null;
    state.config.postflopFamilies = null;

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
    drillState.lockedLimperBucket = null;
    drillState._challengeMultiScenarios = null;
    challengeState.active = false;
    // Clean up oppPositions / postflopFamilies
    state.config.oppPositions = null;
    state.config.postflopFamilies = null;

    document.getElementById('trainer-screen').classList.add('hidden');
    document.getElementById('drill-complete-screen').classList.add('hidden');
    document.getElementById('challenge-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    if (typeof updateMenuUI === 'function') updateMenuUI();
}

function retryChallenge() {
    const nodeId = challengeState.nodeId;
    closeDrillCompleteScreenOnly();
    setTimeout(() => startChallengeNode(nodeId), 50);
}

function closeDrillCompleteScreenOnly() {
    document.getElementById('drill-complete-screen').classList.add('hidden');
}
