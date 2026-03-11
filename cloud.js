// cloud.js — Profile, import/export, Firebase cloud sync, settings, boot
// Auto-split from PokerCrusher monolith — do not reorder script tags

const PROFILE_KEY = 'pc_profile_v1';

function getProfileName() {
    try { return (localStorage.getItem(PROFILE_KEY) || '').trim(); } catch(e) { return ''; }
}

function profileKey(baseKey) {
    const p = getProfileName();
    if (!p) return baseKey; // Guest (backward compatible)
    return `${baseKey}__pc_${p}`;
}

function normalizeProfileName(raw) {
    const s = String(raw || '').trim().toLowerCase();
    // allow letters, numbers, underscore, dash; 2–20 chars
    if (!s) return '';
    if (s.length < 2 || s.length > 20) return null;
    if (!/^[a-z0-9_-]+$/.test(s)) return null;
    return s;
}

function updateProfileUI() {
    const cur = getProfileName();
    const el = document.getElementById('profile-current');
    if (el) el.textContent = cur ? cur : 'Guest';
    const inp = document.getElementById('profile-input');
    if (inp) inp.value = cur || '';
}

function migrateBaseDataIntoProfile(p) {
    // If user sets a profile for the first time, copy existing Guest keys into profile namespace
    // (so they don’t "lose" progress when switching to username).
    if (!p) return;
    const baseKeys = ['gto_rfi_stats_v2', 'gto_sr_v2', 'gto_config_v2', 'gto_medals_v1', 'gto_limper_mix', 'gto_challenge_v1', 'gto_challenge_v2'];
    baseKeys.forEach(k => {
        const namespaced = `${k}__pc_${p}`;
        try {
            const already = localStorage.getItem(namespaced);
            const base = localStorage.getItem(k);
            if ((already === null || already === undefined) && base !== null && base !== undefined) {
                localStorage.setItem(namespaced, base);
            }
        } catch(e) {}
    });
}

function setProfileName(raw) {
    const p = normalizeProfileName(raw);
    if (p === null) {
        showToast('Invalid username (2–20, a-z 0-9 _ -)', 'incorrect', 2200);
        return;
    }
    try {
        if (!p) {
            localStorage.removeItem(PROFILE_KEY);
        } else {
            // If switching from Guest to a new profile, migrate existing Guest data into it (one-time copy)
            const prev = getProfileName();
            if (!prev) migrateBaseDataIntoProfile(p);
            localStorage.setItem(PROFILE_KEY, p);
        }
    } catch(e) {}

    // Reload so SR engine + storage bindings re-init cleanly under the new namespace
    location.reload();
}

function saveProfileFromUI() {
    const inp = document.getElementById('profile-input');
    setProfileName(inp ? inp.value : '');
}

function clearProfile() { setProfileName(''); }

// Initialize profile UI on load and keep Settings screen in sync
(function initProfileUI() {
    // Populate on initial load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateProfileUI);
    } else {
        updateProfileUI();
    }
})();

function showSettings() {
    try {
        const cur = localStorage.getItem('pkCrusherProfile') || 'default';
        const disp = cur === 'default' ? 'Guest' : cur;
        const el = document.getElementById('settings-profile-current');
        if (el) el.textContent = disp;
        const inp = document.getElementById('settings-profile-input');
        if (inp && cur !== 'default') inp.placeholder = cur;
    } catch(_) {} updateProfileUI(); document.getElementById('settings-screen').classList.remove('hidden'); }
function hideSettings() { document.getElementById('settings-screen').classList.add('hidden'); }

        function exportTrainerData() {
    try {
        const baseKeys = ['gto_rfi_stats_v2', 'gto_sr_v2', 'gto_config_v2', 'gto_medals_v1', 'gto_limper_mix', 'gto_challenge_v1', 'gto_challenge_v2'];
        const profile = getProfileName();
        const payload = {
            app: 'PokerCrusher',
            exportVersion: 2,
            exportedAt: new Date().toISOString(),
            profile: profile || '',
            data: {}
        };

        baseKeys.forEach(k => {
            const v = localStorage.getItem(profileKey(k));
            if (v !== null && v !== undefined) payload.data[k] = v; // store raw string (portable)
        });

        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        a.href = url;

        const suffix = profile ? `_${profile}` : '';
        a.download = `pokercrusher_backup${suffix}_${yyyy}-${mm}-${dd}.json`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 500);

        showToast('Exported backup file', 'correct', 1400);
    } catch (e) {
        console.warn('Export error:', e);
        showToast('Export failed', 'incorrect', 1800);
    }
}

function triggerImport() {
    const input = document.getElementById('import-file');
    if (!input) return;
    input.value = '';
    input.click();
}

        function importTrainerDataFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const text = ev.target.result;
            const payload = JSON.parse(text);

            if (!payload || typeof payload !== 'object' || !payload.data || typeof payload.data !== 'object') {
                throw new Error('Invalid backup file.');
            }

            // If the backup has a profile name, switch to it (safe: we reload after import).
            if (payload.profile !== undefined) {
                const normalized = normalizeProfileName(payload.profile);
                if (normalized === null) {
                    throw new Error('Backup has invalid profile name.');
                }
                try {
                    if (!normalized) localStorage.removeItem(PROFILE_KEY);
                    else localStorage.setItem(PROFILE_KEY, normalized);
                } catch(e) {}
            }

            const allowed = ['gto_rfi_stats_v2', 'gto_sr_v2', 'gto_config_v2', 'gto_medals_v1', 'gto_limper_mix', 'gto_challenge_v1', 'gto_challenge_v2'];
            let wrote = 0;
            allowed.forEach(k => {
                if (payload.data[k] !== undefined && payload.data[k] !== null) {
                    localStorage.setItem(profileKey(k), String(payload.data[k]));
                    wrote++;
                }
            });

            showToast(`Import complete (${wrote} items)`, 'correct', 1400);

            // Reload so SR engine + UI re-init under the imported profile namespace
            setTimeout(() => location.reload(), 250);
        } catch (e) {
            console.warn('Import error:', e);
            showToast('Import failed (bad file)', 'incorrect', 2000);
        }
    };
    reader.onerror = function() {
        showToast('Import failed (read error)', 'incorrect', 2000);
    };
    reader.readAsText(file);
}


// ============================================================
// CLOUD SYNC (Firebase Firestore) — OPTIONAL
// ============================================================
// 1) Create a Firebase project (free)
// 2) Enable Firestore Database
// 3) Paste your firebaseConfig below (Project settings → Web app)
//
// SECURITY NOTE:
// This is "simple username sync" meant for personal use / friends.
// The optional Sync Code is hashed into the document id to prevent casual overwrites.
// For a real public product, you'd add proper auth + rules.

const PC_CLOUD_SETTINGS_KEY = 'pc_cloud_settings_v1';
const PC_CLOUD_AUTOSAVE_KEY = 'pc_cloud_autosave_v1';
const PC_CLOUD_AUTOSAVE_INTERVAL_KEY = 'pc_cloud_autosave_interval_ms_v1';


// Paste your config here (leave as null until you set it)
const firebaseConfig = {
  apiKey: "AIzaSyArpfetXIDgkdvnFXuWhpwKTyDyhDNqaFM",
  authDomain: "poker-crusher.firebaseapp.com",
  projectId: "poker-crusher",
  storageBucket: "poker-crusher.firebasestorage.app",
  messagingSenderId: "665996380905",
  appId: "1:665996380905:web:eecb6be9bd2bea9c233e78"
};

let _pcFirebaseInited = false;
function initCloud(silent=false) {
    if (_pcFirebaseInited) return true;
    if (!firebaseConfig) {
        if(!silent) showToast('Cloud sync not set up (missing Firebase config)', 'incorrect', 2200);
        return false;
    }
    // Modular SDK loads async at page bottom; check if ready
    if (window.PokerCrusherCloud) {
        _pcFirebaseInited = true;
        return true;
    }
    if(!silent) showToast('Cloud sync loading... try again in a moment', 'incorrect', 1600);
    return false;
}

function loadCloudSettings() {
    try {
        const s = localStorage.getItem(PC_CLOUD_SETTINGS_KEY);
        if (s) return JSON.parse(s) || {};
    } catch(e) {}
    return {};
}
function saveCloudSettings(obj) {
    try { localStorage.setItem(PC_CLOUD_SETTINGS_KEY, JSON.stringify(obj || {})); } catch(e) {}
}
function hydrateCloudUI() {
    const cs = loadCloudSettings();
    const u = document.getElementById('cloud-username');
    const c = document.getElementById('cloud-code');
    if (u && typeof cs.username === 'string') u.value = cs.username;
    if (c && typeof cs.code === 'string') c.value = cs.code;
}


function getCloudAutoPrefs() {
    let enabled = true;
    let intervalMs = 120000;
    try {
        const e = localStorage.getItem(PC_CLOUD_AUTOSAVE_KEY);
        if (e !== null) enabled = (e === '1');
        const iv = parseInt(localStorage.getItem(PC_CLOUD_AUTOSAVE_INTERVAL_KEY) || '120000', 10);
        if (!Number.isNaN(iv) && iv >= 15000) intervalMs = iv;
    } catch(e) {}
    return { enabled, intervalMs };
}

function setCloudAutoPrefs(prefs) {
    try {
        if (typeof prefs.enabled === 'boolean') localStorage.setItem(PC_CLOUD_AUTOSAVE_KEY, prefs.enabled ? '1' : '0');
        if (typeof prefs.intervalMs === 'number') localStorage.setItem(PC_CLOUD_AUTOSAVE_INTERVAL_KEY, String(prefs.intervalMs));
    } catch(e) {}
}

function hydrateCloudAutoUI() {
    const prefs = getCloudAutoPrefs();
    const cb = document.getElementById('cloud-autosave');
    const sel = document.getElementById('cloud-autosave-interval');
    if (cb) cb.checked = !!prefs.enabled;
    if (sel) {
        // If current value not in list, keep default but still display nearest
        const want = String(prefs.intervalMs);
        const opt = Array.from(sel.options || []).find(o => o.value === want);
        if (opt) sel.value = want;
    }
}

function saveCloudAutoPrefsFromUI() {
    const cb = document.getElementById('cloud-autosave');
    const sel = document.getElementById('cloud-autosave-interval');
    const enabled = cb ? !!cb.checked : true;
    const intervalMs = sel ? parseInt(sel.value || '120000', 10) : 120000;
    setCloudAutoPrefs({ enabled, intervalMs: Number.isNaN(intervalMs) ? 120000 : intervalMs });
    // Restart loop with new settings (safe)
    startCloudAutosaveLoop(true);
}

// -------- Auto-save engine (silent) --------
let _pcCloudDirty = false;
let _pcCloudAutosaveTimer = null;
let _pcCloudLastAutosaveAt = 0;
let _pcCloudAutosaveInFlight = false;

function markCloudDirty() {
    _pcCloudDirty = true;
}

async function cloudSaveSilent() {
    // Uses stored settings; no UI required; no toasts.
    const cs = loadCloudSettings();
    const username = (cs && cs.username) ? String(cs.username) : '';
    const code = (cs && cs.code) ? String(cs.code) : '';

    if (!username) return false;
    if (!initCloud(true)) return false;

    const docId = await getCloudDocId(username, code);
    if (!docId) return false;

    const payload = buildTrainerPayloadForSync();
    payload.cloudSavedAt = new Date().toISOString();

    try {
        await window.PokerCrusherCloud.save(docId, payload);
        try { localStorage.setItem('pc_last_cloud_autosave_at', new Date().toISOString()); } catch(e) {}
        return true;
    } catch (e) {
        console.warn('Cloud autosave error:', e);
        return false;
    }
}

function startCloudAutosaveLoop(forceRestart=false) {
    const prefs = getCloudAutoPrefs();
    if (!prefs.enabled) {
        if (_pcCloudAutosaveTimer) { clearInterval(_pcCloudAutosaveTimer); _pcCloudAutosaveTimer = null; }
        return;
    }
    if (_pcCloudAutosaveTimer && !forceRestart) return;
    if (_pcCloudAutosaveTimer) { clearInterval(_pcCloudAutosaveTimer); _pcCloudAutosaveTimer = null; }

    _pcCloudAutosaveTimer = setInterval(async () => {
        try {
            if (!_pcCloudDirty) return;
            if (_pcCloudAutosaveInFlight) return;
            const now = Date.now();
            if (now - _pcCloudLastAutosaveAt < prefs.intervalMs) return;

            _pcCloudAutosaveInFlight = true;
            const ok = await cloudSaveSilent();
            _pcCloudAutosaveInFlight = false;

            if (ok) {
                _pcCloudDirty = false;
                _pcCloudLastAutosaveAt = now;
            }
        } catch(e) {
            _pcCloudAutosaveInFlight = false;
        }
    }, 5000); // lightweight polling; real throttling is intervalMs gate above
}


// Minimal SHA-256 helper (no external libs)
async function sha256Hex(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCloudDocId(username, code) {
    const u = (username || '').trim().toLowerCase();
    const c = (code || '').trim();
    if (!u) return null;
    // Hash to keep doc ids uniform and to fold in optional code
    return await sha256Hex('pc|' + u + '|' + c);
}

function buildTrainerPayloadForSync() {
    // Keep identical to exportTrainerData payload shape, but always read/write
    // the *active profile* namespace via profileKey(...) so Cloud sync matches
    // what the trainer actually uses.
    const baseKeys = ['gto_rfi_stats_v2', 'gto_sr_v2', 'gto_config_v2', 'gto_medals_v1', 'gto_limper_mix', 'gto_challenge_v1', 'gto_challenge_v2'];
    const profile = getProfileName(); // '' means Guest

    const payload = {
        app: 'PokerCrusher',
        exportVersion: 2,
        exportedAt: new Date().toISOString(),
        profile: profile || '', // store '' for Guest (do NOT store literal 'Guest')
        data: {}
    };

    baseKeys.forEach(k => {
        const v = localStorage.getItem(profileKey(k));
        if (v !== null && v !== undefined) payload.data[k] = v; // store raw string
    });

    return payload;
}


function applyTrainerPayload(payload) {
    if (!payload || typeof payload !== 'object' || !payload.data || typeof payload.data !== 'object') {
        showToast('Cloud load failed (bad data)', 'incorrect', 2000);
        return false;
    }

    // Switch profile if payload specifies one.
    // IMPORTANT: Guest is stored as '' (empty). Do not create a literal "guest" namespace by accident.
    try {
        const desiredRaw = (typeof payload.profile === 'string') ? payload.profile : '';
        // Backward compat: older builds stored literal 'Guest'
        const desiredRawNorm = String(desiredRaw || '').trim().toLowerCase();
        const desired = (desiredRawNorm === 'guest') ? '' : normalizeProfileName(desiredRaw);
        if (desired === null) {
            // If invalid, ignore profile switch
        } else if (!desired) {
            // Guest
            try { localStorage.removeItem(PROFILE_KEY); } catch(e) {}
        } else {
            try { localStorage.setItem(PROFILE_KEY, desired); } catch(e) {}
        }
    } catch(e) {}

    // Write only the known keys into the *active* profile namespace.
    const allowed = ['gto_rfi_stats_v2', 'gto_sr_v2', 'gto_config_v2', 'gto_medals_v1', 'gto_limper_mix', 'gto_challenge_v1', 'gto_challenge_v2'];
    const data = payload.data;

    let wrote = 0;
    allowed.forEach(k => {
        if (data[k] !== undefined && data[k] !== null) {
            try { localStorage.setItem(profileKey(k), String(data[k])); wrote++; } catch(e) {}
        }
    });

    // Friendly "last imported" marker
    try { localStorage.setItem('pc_last_cloud_sync_at', new Date().toISOString()); } catch(e) {}

    return wrote > 0;
}


async function cloudSaveNow() {
    const uEl = document.getElementById('cloud-username');
    const cEl = document.getElementById('cloud-code');
    const username = uEl ? uEl.value : '';
    const code = cEl ? cEl.value : '';

    saveCloudSettings({ username, code });

    if (!initCloud()) return;

    const docId = await getCloudDocId(username, code);
    if (!docId) { showToast('Enter a username', 'incorrect', 1600); return; }

    const payload = buildTrainerPayloadForSync();
    payload.cloudSavedAt = new Date().toISOString();

    try {
        showToast('Saving to cloud...', 'correct', 900);
        await window.PokerCrusherCloud.save(docId, payload);
        showToast('Saved to cloud', 'correct', 1400);
    } catch (e) {
        console.warn('Cloud save error:', e);
        showToast('Cloud save failed', 'incorrect', 2200);
    }
}

async function cloudLoadNow() {
    const uEl = document.getElementById('cloud-username');
    const cEl = document.getElementById('cloud-code');
    const username = uEl ? uEl.value : '';
    const code = cEl ? cEl.value : '';

    saveCloudSettings({ username, code });

    if (!initCloud()) return;

    const docId = await getCloudDocId(username, code);
    if (!docId) { showToast('Enter a username', 'incorrect', 1600); return; }

    try {
        showToast('Loading from cloud...', 'correct', 900);
        const result = await window.PokerCrusherCloud.load(docId);
        console.log('[PokerCrusher] Cloud load raw result:', result);
        if (!result) {
            showToast('No cloud data found for that username', 'incorrect', 2200);
            return;
        }
        console.log('[PokerCrusher] result type:', typeof result);
        console.log('[PokerCrusher] result.data:', result.data);
        console.log('[PokerCrusher] result keys:', Object.keys(result));
        const payload = result;
        const ok = applyTrainerPayload(payload);
        if (ok) {
            showToast('Loaded from cloud (reloading)', 'correct', 1400);
            setTimeout(() => location.reload(), 400);
        } else {
            showToast('Cloud load: no data to apply (check console)', 'incorrect', 2200);
        }
    } catch (e) {
        console.warn('[PokerCrusher] Cloud load error:', e);
        showToast('Cloud load failed', 'incorrect', 2200);
    }
}

// Populate fields when Settings opens
const _oldShowSettings = window.showSettings;
window.showSettings = function() {
    try { if (_oldShowSettings) _oldShowSettings(); } catch(e) {}
    setTimeout(hydrateCloudUI, 50);
};




// Wire import input once// Wire import input once
(function(){
    const input = document.getElementById('import-file');
    if (input && !input._wired) {
        input._wired = true;
        input.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            importTrainerDataFromFile(f);
        });
    }
})();

function resetStats() {
    if (!confirm('Reset all your stats? This cannot be undone.')) return;
    state.global = { totalHands: 0, totalCorrect: 0, bestStreak: 0, byScenario: {}, byPos: {}, byPosGroup: {}, bySpot: {}, byHand: {} };
    SR.reset();
    saveMedals({});
    try { saveChallenge({ v: 1, nodes: {}, lastPlayed: null }); } catch(e) {}
    saveProgress(); updateMenuUI(); renderUserStats();
}
// Memory retention classifier for UI indicators
function classifyRetention(stats, srRecord) {
    if (!stats || stats.total < 15) return { label: 'New', colorClass: 'bg-slate-700/30 text-slate-500' };
    const acc = stats.total > 0 ? stats.correct / stats.total : 0;
    // Mastered: high accuracy + long SR interval + sufficient volume
    if (srRecord && srRecord.intervalDays >= 7 && acc >= 0.85 && stats.total >= 25) {
        return { label: 'Mastered', colorClass: 'bg-blue-500/20 text-blue-400' };
    }
    if (acc >= 0.80) return { label: 'Solid', colorClass: 'bg-emerald-500/20 text-emerald-400' };
    if (acc >= 0.60) return { label: 'Learning', colorClass: 'bg-amber-500/20 text-amber-300' };
    return { label: 'Weak', colorClass: 'bg-rose-500/20 text-rose-400' };
}

function dismissOnboarding() {
    try { localStorage.setItem('pkOnboardingDismissed', '1'); } catch(_) {}
    const ob = document.getElementById('menu-onboarding');
    if (ob) ob.classList.add('hidden');
}

function saveProfileFromSettings() {
    const inp = document.getElementById('settings-profile-input');
    if (!inp) return;
    const v = inp.value.trim();
    if (!v) { showToast('Enter a username first', 'incorrect', 2000); return; }
    if (!/^[a-zA-Z0-9_-]{1,30}$/.test(v)) { showToast('Only letters, numbers, _ or - (max 30)', 'incorrect', 2200); return; }
    const old = localStorage.getItem('pkCrusherProfile') || 'default';
    if (v === old) { showToast('Already using ' + v, 'correct', 1800); return; }
    localStorage.setItem('pkCrusherProfile', v);
    showToast('Profile set — reloading…', 'correct', 1800);
    setTimeout(() => location.reload(), 1800);
}

function resetSpotSR(spotKey) {
    const decodedKey = decodeURIComponent(spotKey);
    const handKeys = SR.getHandKeysForSpot(decodedKey);
    if (handKeys.length === 0) { showToast('No SR data for this spot', 'incorrect', 1800); return; }
    if (!confirm('Reset SR history for this spot? It will reappear in review soon.')) return;
    handKeys.forEach(k => SR.update(k, 'Again')); // force due
    SR.save();
    showToast('Spot reset — will reappear in Review', 'correct', 2000);
    renderUserStats();
}

function renderUserStats() {
    currentProfile = localStorage.getItem('pkCrusherProfile') || 'default'; // IMP 1: guard multi-tab drift
    const g = state.global;
    const allSpots = getAllSpotKeys();
    const medals = loadMedals();
    const total = g.totalHands || 0, correct = g.totalCorrect || 0;
    const pct = total ? Math.round(correct / total * 100) : 0;
    const SCENARIO_LABELS = { RFI: 'RFI (Unopened)', FACING_RFI: 'Defending vs RFI', RFI_VS_3BET: 'vs 3-Bet', VS_LIMP: 'Vs Limpers (1–3+)', SQUEEZE: 'Squeeze', SQUEEZE_2C: 'Squeeze vs 2C', PUSH_FOLD: 'Push / Fold', POSTFLOP_CBET: 'Flop C-Bet' };

    function classifySpot(key) { return SR.classifySpot(key, edgeClassify); }

    const tiers = { mastered: 0, learning: 0, struggling: 0, unseen: 0 };
    allSpots.forEach(k => tiers[classifySpot(k)]++);
    const masteryPct = allSpots.length ? Math.round(tiers.mastered / allSpots.length * 100) : 0;
    const seenPct = allSpots.length ? Math.round((allSpots.length - tiers.unseen) / allSpots.length * 100) : 0;
    const dueCount = SR.getDueSpots(false).length;

    // Daily Run meta (UI only)
    const drm = loadDailyRunMeta();
    const drmRuns = Number(drm.totalRuns || 0);
    const drmDayStreak = Number(drm.streak || 0);
    const drmRunsToday = Number(drm.runsToday || 0);
    const drmBestRun = Number(drm.bestRun || 0);
    const drmBestEasy = Number(drm.bestRunEasy || 0);
    const drmBestMed = Number(drm.bestRunMedium || 0);
    const drmBestHard = Number(drm.bestRunHard || 0);

    const drmLastRun = Number(drm.lastRun || 0);
    const drmLastTotal = Number(drm.lastTotal || 0);
    const drmLastCorrect = Number(drm.lastCorrect || 0);
    const drmLastWhen = drm.lastCompletedAt ? new Date(drm.lastCompletedAt) : null;
    const drmLastOpt = drm.lastOption || null;
    const drmLastOptName = drmLastOpt === 'easy' ? 'Warm‑Up' : drmLastOpt === 'hard' ? 'Boss' : drmLastOpt === 'medium' ? 'Grind' : null;
    const drmLastLeak = drm.lastLeakKey ? prettySpotName(drm.lastLeakKey) : null;

    // Medal totals
    let totalGold = 0, totalSilver = 0, totalBronze = 0;
    Object.values(medals).forEach(m => {
        if (m.medal === 'gold') totalGold++;
        else if (m.medal === 'silver') totalSilver++;
        else if (m.medal === 'bronze') totalBronze++;
    });
    const totalMedals = totalGold + totalSilver + totalBronze;

    // Per-scenario accuracy from global stats
    function scAcc(sc) {
        const d = g.byScenario[sc];
        return d && d.total ? Math.round(d.correct / d.total * 100) : 0;
    }
    function scTotal(sc) { return g.byScenario[sc] ? g.byScenario[sc].total : 0; }

    let html = '';

    // === WEAKEST SPOTS CARD ===
    const topLeaks = Object.entries(g.bySpot || {})
        .filter(([,v]) => v.total >= 10)
        .map(([k,v]) => ({ key: k, acc: Math.round(v.correct/v.total*100), total: v.total }))
        .sort((a,b) => a.acc - b.acc)
        .slice(0, 3);

    if (topLeaks.length >= 2) {
        html += `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-1">
            <p class="text-[9px] text-rose-400/80 font-black uppercase tracking-widest mb-3">Your biggest leaks</p>
            <div class="flex flex-col gap-2">
            ${topLeaks.map(sp => {
                const col = sp.acc >= 75 ? 'text-yellow-400' : 'text-rose-400';
                const bar = sp.acc;
                return `<div class="flex items-center gap-3">
                    <div class="flex-1 min-w-0">
                        <div class="text-[11px] text-slate-300 font-semibold truncate">${prettySpotName(sp.key)}</div>
                        <div class="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div class="h-1 rounded-full ${sp.acc >= 75 ? 'bg-yellow-500' : 'bg-rose-500'}" style="width:${bar}%"></div>
                        </div>
                    </div>
                    <div class="text-sm font-black ${col} shrink-0">${sp.acc}%</div>
                    <div class="text-[9px] text-slate-600 shrink-0">${sp.total}h</div>
                </div>`;
            }).join('')}
            </div>
        </div>`;
    }

    // === TOP HERO CARD: Mastery + Medals side by side ===
    const ringSize = 100, ringStroke = 8;
    const ringRadius = (ringSize - ringStroke) / 2;
    const ringCirc = 2 * Math.PI * ringRadius;
    const ringOffset = ringCirc * (1 - masteryPct / 100);
    const ringColor = masteryPct >= 80 ? '#10b981' : masteryPct >= 50 ? '#eab308' : masteryPct >= 20 ? '#f97316' : '#64748b';

    html += `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div class="flex items-center gap-5">
            <div class="relative shrink-0" style="width:${ringSize}px;height:${ringSize}px;">
                <svg width="${ringSize}" height="${ringSize}" class="transform -rotate-90">
                    <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${ringRadius}" fill="none" stroke="#1e293b" stroke-width="${ringStroke}"/>
                    <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${ringRadius}" fill="none" stroke="${ringColor}" stroke-width="${ringStroke}" stroke-linecap="round" stroke-dasharray="${ringCirc}" stroke-dashoffset="${ringOffset}" style="transition:stroke-dashoffset 0.6s ease"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-2xl font-black text-white">${masteryPct}%</span>
                    <span class="text-[7px] text-slate-500 font-bold uppercase">Mastery</span>
                </div>
            </div>
            <div class="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-emerald-500"></div><span class="text-[11px] text-slate-400 flex-1">Mastered</span><span class="text-[11px] font-black text-emerald-400">${tiers.mastered}</span></div>
                <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-indigo-500"></div><span class="text-[11px] text-slate-400 flex-1">Learning</span><span class="text-[11px] font-black text-indigo-400">${tiers.learning}</span></div>
                <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-rose-500"></div><span class="text-[11px] text-slate-400 flex-1">Struggling</span><span class="text-[11px] font-black text-rose-400">${tiers.struggling}</span></div>
                <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-slate-700"></div><span class="text-[11px] text-slate-400 flex-1">Unseen</span><span class="text-[11px] font-black text-slate-600">${tiers.unseen}</span></div>
            </div>
        </div>
        <div class="mt-3 w-full bg-slate-800 rounded-full h-2 flex overflow-hidden">
            <div class="bg-emerald-500 h-2 transition-all" style="width:${allSpots.length ? Math.round(tiers.mastered/allSpots.length*100) : 0}%"></div>
            <div class="bg-indigo-500 h-2 transition-all" style="width:${allSpots.length ? Math.round(tiers.learning/allSpots.length*100) : 0}%"></div>
            <div class="bg-rose-500 h-2 transition-all" style="width:${allSpots.length ? Math.round(tiers.struggling/allSpots.length*100) : 0}%"></div>
        </div>
        <div class="flex justify-between mt-1.5">
            <span class="text-[9px] text-slate-600">${allSpots.length} spots</span>
            <span class="text-[9px] text-slate-600">${seenPct}% explored</span>
        </div>
    </div>`;
    // === DAILY RUN CARD ===
    html += `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div class="flex items-center justify-between">
            <div>
                <div class="text-slate-400 text-xs font-bold uppercase tracking-widest">Daily Run</div>
                <div class="text-slate-100 font-black text-xl mt-1">Day streak: <span class="text-indigo-300">${drmDayStreak}</span></div>
                <div class="text-slate-500 text-xs font-semibold mt-1">
                    Runs: <span class="text-slate-200 font-black">${drmRuns}</span>
                    · Best run: <span class="text-slate-200 font-black">${drmBestRun}</span>
                    · Today: <span class="text-slate-200 font-black">${drmRunsToday}/3</span>
                </div>
                <div class="text-slate-600 text-[11px] font-semibold mt-1">Best by difficulty: 🟢 ${drmBestEasy} · 🟡 ${drmBestMed} · 🔴 ${drmBestHard}</div>
            </div>
            <button onclick="showDailyRunMenu()" class="px-4 py-2 bg-slate-950/40 border border-slate-700 hover:border-slate-500 rounded-xl font-black text-slate-200 text-sm">Open</button>
        </div>

        ${drmLastWhen ? `
            <div class="mt-4 grid grid-cols-3 gap-3">
                <div class="bg-slate-950/40 border border-slate-800 rounded-2xl p-3">
                    <div class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Last run</div>
                    <div class="text-slate-100 font-black text-xl mt-1">${drmLastRun}</div>
                    <div class="text-slate-500 text-xs mt-1">${drmLastOptName || ''}</div>
                </div>
                <div class="bg-slate-950/40 border border-slate-800 rounded-2xl p-3">
                    <div class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Accuracy</div>
                    <div class="text-slate-100 font-black text-xl mt-1">${drmLastCorrect}/${drmLastTotal}</div>
                    <div class="text-slate-500 text-xs mt-1">${drmLastWhen ? drmLastWhen.toLocaleDateString() : ''}</div>
                </div>
                <div class="bg-slate-950/40 border border-slate-800 rounded-2xl p-3">
                    <div class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Leak</div>
                    <div class="text-slate-100 font-black text-base mt-1 leading-tight">${drmLastLeak || '—'}</div>
                </div>
            </div>
        ` : `
            <div class="mt-4 text-slate-500 text-sm font-semibold">No Daily Runs completed yet.</div>
        `}
    </div>

    <div class="grid grid-cols-5 gap-2 mt-4">
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center">
            <p class="text-[7px] text-slate-500 uppercase font-bold mb-0.5">Hands</p>
            <p class="text-base font-black text-slate-200">${total >= 1000 ? (total/1000).toFixed(1)+'k' : total}</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center">
            <p class="text-[7px] text-slate-500 uppercase font-bold mb-0.5">Accuracy</p>
            <p class="text-base font-black ${pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-yellow-400' : 'text-rose-400'}">${pct}%</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center">
            <p class="text-[7px] text-slate-500 uppercase font-bold mb-0.5">Streak</p>
            <p class="text-base font-black text-orange-400">${g.bestStreak || 0}</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center">
            <p class="text-[7px] text-slate-500 uppercase font-bold mb-0.5">Due</p>
            <p class="text-base font-black ${dueCount > 0 ? 'text-amber-400' : 'text-slate-500'}">${dueCount > 20 ? '20+' : dueCount}</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center">
            <p class="text-[7px] text-slate-500 uppercase font-bold mb-0.5">Medals</p>
            <p class="text-base font-black ${totalMedals > 0 ? 'text-yellow-400' : 'text-slate-500'}">${totalMedals}</p>
        </div>
    </div>`;

    // === TOP LEAKS ===
    const LEAK_MIN = 20;
    function leakSort(a, b) { return a.acc - b.acc || b.total - a.total; }
    function leakPill(acc) {
        const c = acc >= 80 ? 'bg-emerald-500/20 text-emerald-400' : acc >= 60 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-400';
        return `<span class="inline-flex items-center justify-center text-[10px] font-black min-w-[36px] px-1.5 py-0.5 rounded-full ${c}" style="font-variant-numeric:tabular-nums">${acc}%</span>`;
    }
    function leakBarColor(acc) { return acc >= 80 ? 'bg-emerald-500' : acc >= 60 ? 'bg-amber-400' : 'bg-rose-500'; }
    function leakEmpty() {
        return `<div class="rounded-lg bg-slate-800/20 border border-dashed border-slate-800 px-4 py-5 flex flex-col items-center gap-1.5">
            <span class="text-[10px] text-slate-600">Need more reps</span>
            <span class="text-[9px] text-slate-700">(min ${LEAK_MIN} attempts per entry)</span>
        </div>`;
    }
    function leakRows(list) {
        if (!list.length) return leakEmpty();
        return `<div class="flex flex-col">${list.map((r, i) => {
            const ret = r.retention || { label: 'New', colorClass: 'bg-slate-700/30 text-slate-500' };
            return `<div class="flex items-center gap-2.5 px-2 py-2.5 ${i > 0 ? 'border-t border-slate-800/25' : ''}" style="min-height:44px">
                <span class="text-[9px] font-black text-slate-700 w-3 text-center shrink-0">${i + 1}</span>
                <div class="min-w-0 flex-1 flex flex-col gap-0.5">
                    <div class="flex items-center gap-1.5 min-w-0">
                        <span class="text-[11px] font-bold text-slate-200 truncate leading-none">${r.label}</span>
                        <span class="text-[8px] font-bold px-1.5 py-px rounded ${ret.colorClass} leading-tight shrink-0">${ret.label}</span>
                        ${r.sub ? `<span class="text-[9px] text-slate-600 truncate leading-none shrink-[2]">${r.sub}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="flex-1 bg-slate-800/40 rounded-full h-[3px]"><div class="${leakBarColor(r.acc)} h-[3px] rounded-full" style="width:${Math.max(3, r.acc)}%"></div></div>
                        <span class="text-[8px] text-slate-600 shrink-0" style="font-variant-numeric:tabular-nums">${r.correct}/${r.total}</span>
                    </div>
                </div>
                ${leakPill(r.acc)}
            </div>`;
        }).join('')}</div>`;
    }
    const srDbSnap = SR.getAll();
    const worstSpots = Object.entries(g.bySpot || {})
        .filter(([, v]) => v.total >= LEAK_MIN)
        .map(([k, v]) => {
            const parts = k.split('|');
            const scShort = SCENARIO_SHORT[parts[0]] || parts[0];
            const spotLabel = formatSpotLabel(parts[1] || k);
            // Aggregate SR records for this spot to get best intervalDays
            const handKeys = SR.getHandKeysForSpot(k);
            let bestInterval = 0;
            handKeys.forEach(hk => { const r = srDbSnap[hk]; if (r && r.intervalDays > bestInterval) bestInterval = r.intervalDays; });
            const retention = classifyRetention(v, bestInterval > 0 ? { intervalDays: bestInterval } : null);
            return { label: spotLabel, sub: scShort, acc: Math.round(v.correct / v.total * 100), total: v.total, correct: v.correct, retention };
        })
        .sort(leakSort).slice(0, 5);
    const worstHands = Object.entries(g.byHand || {})
        .filter(([, v]) => v.total >= LEAK_MIN)
        .map(([k, v]) => {
            const lastPipe = k.lastIndexOf('|');
            const hand = k.substring(lastPipe + 1);
            const spotKey = k.substring(0, lastPipe);
            const spotParts = spotKey.split('|');
            const scShort = SCENARIO_SHORT[spotParts[0]] || spotParts[0];
            const spotLabel = formatSpotLabel(spotParts[1] || spotKey);
            const srRec = srDbSnap[k] || null;
            const retention = classifyRetention(v, srRec);
            return { label: hand, sub: `${spotLabel} · ${scShort}`, acc: Math.round(v.correct / v.total * 100), total: v.total, correct: v.correct, retention };
        })
        .sort(leakSort).slice(0, 5);
    const worstPG = Object.entries(g.byPosGroup || {})
        .filter(([, v]) => v.total >= LEAK_MIN)
        .map(([k, v]) => {
            const retention = classifyRetention(v, null);
            return { label: k, sub: null, acc: Math.round(v.correct / v.total * 100), total: v.total, correct: v.correct, retention };
        })
        .sort(leakSort).slice(0, 5);
    const hasAnyLeaks = worstSpots.length > 0 || worstHands.length > 0 || worstPG.length > 0;

    function leakSection(icon, title, rows) {
        return `<div>
            <div class="flex items-center gap-2 px-1 mb-1.5">
                <span class="text-[10px] opacity-50">${icon}</span>
                <span class="text-[9px] text-slate-500 uppercase font-bold tracking-widest">${title}</span>
                <div class="flex-1 h-px bg-slate-800/40"></div>
            </div>
            <div class="bg-slate-950/30 rounded-xl overflow-hidden">${rows}</div>
        </div>`;
    }

    html += `<div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div class="px-5 pt-4 pb-3 border-b border-slate-800/40">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-sm">🎯</span>
                    <p class="text-xs font-black text-slate-200">Top Leaks</p>
                </div>
                <span class="text-[8px] text-slate-600 font-bold uppercase tracking-wider bg-slate-800/50 px-2 py-0.5 rounded-full">${LEAK_MIN}+ hands</span>
            </div>
            <p class="text-[10px] text-slate-500 mt-1 ml-7">${hasAnyLeaks ? 'Focus here to plug your biggest leaks' : 'Keep playing — leaks appear after ' + LEAK_MIN + ' reps'}</p>
        </div>
        <div class="p-3 flex flex-col gap-3">
            ${leakSection('📍', 'Spots', leakRows(worstSpots))}
            ${leakSection('🃏', 'Hands', leakRows(worstHands))}
            ${leakSection('💺', 'Position Groups', leakRows(worstPG))}
        </div>
    </div>`;

    // === MEDAL SHOWCASE ===
    if (totalMedals > 0) {
        html += `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Drill Medals</p>
            <div class="flex items-center justify-center gap-8 mb-4">
                <div class="flex flex-col items-center gap-1">
                    <span class="text-3xl">🥇</span>
                    <span class="text-xl font-black text-yellow-400">${totalGold}</span>
                </div>
                <div class="flex flex-col items-center gap-1">
                    <span class="text-3xl">🥈</span>
                    <span class="text-xl font-black text-slate-300">${totalSilver}</span>
                </div>
                <div class="flex flex-col items-center gap-1">
                    <span class="text-3xl">🥉</span>
                    <span class="text-xl font-black text-amber-600">${totalBronze}</span>
                </div>
            </div>
            <div class="flex flex-col gap-2">`;

        ['RFI', 'FACING_RFI', 'RFI_VS_3BET', 'VS_LIMP', 'SQUEEZE', 'SQUEEZE_2C', 'PUSH_FOLD'].forEach(sc => {
            const m = medals[sc];
            const icon = m ? MEDAL_ICONS[m.medal] : '';
            const acc = m ? m.accuracy : null;
            const mColor = m ? ({ gold: 'border-yellow-700/50 bg-yellow-950/20', silver: 'border-slate-500/40 bg-slate-800/40', bronze: 'border-amber-800/40 bg-amber-950/20' }[m.medal] || 'border-slate-800/50 bg-slate-950/50') : 'border-slate-800/50 bg-slate-950/50';
            html += `<div class="flex items-center justify-between rounded-xl px-3 py-2 border ${mColor}">
                <span class="text-xs font-bold text-slate-300">${SCENARIO_LABELS[sc]}</span>
                <div class="flex items-center gap-2">
                    ${m ? `<span class="text-[10px] font-bold text-slate-500">${acc}%</span><span class="text-lg">${icon}</span>` : `<span class="text-[10px] text-slate-600">—</span>`}
                </div>
            </div>`;
        });

        html += `</div></div>`;
    } else {
        html += `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">Drill Medals</p>
            <div class="flex flex-col items-center gap-2 py-4">
                <span class="text-2xl opacity-30">🏆</span>
                <p class="text-xs text-slate-600 text-center">Complete focused drills to earn medals</p>
                <p class="text-[10px] text-slate-700 text-center">🥉 65%+ · 🥈 80%+ · 🥇 90%+</p>
            </div>
        </div>`;
    }

    // === BY SCENARIO with medal + accuracy inline ===
    html += `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">By Scenario</p>
        <div class="flex flex-col gap-3">`;
    ['RFI', 'FACING_RFI', 'RFI_VS_3BET', 'VS_LIMP', 'SQUEEZE', 'SQUEEZE_2C', 'PUSH_FOLD', 'POSTFLOP_CBET'].forEach(sc => {
        const prefix = sc === 'POSTFLOP_CBET' ? '' : sc + '|';
        // Postflop spots use SRP|, 3BP|, LIMP_POT| prefixes — filter them via getAllSpotKeys
        const scSpots = sc === 'POSTFLOP_CBET'
            ? allSpots.filter(k => POSTFLOP_KEY_PREFIX_LIST && POSTFLOP_KEY_PREFIX_LIST.some(p => k.startsWith(p + '|')))
            : allSpots.filter(k => k.startsWith(prefix));
        const scTiers = { mastered: 0, learning: 0, struggling: 0, unseen: 0 };
        scSpots.forEach(k => scTiers[classifySpot(k)]++);
        const scMastery = scSpots.length ? Math.round(scTiers.mastered / scSpots.length * 100) : 0;
        const scSeen = scSpots.length - scTiers.unseen;
        const scColor = scMastery >= 80 ? 'text-emerald-400' : scMastery >= 50 ? 'text-yellow-400' : scMastery > 0 ? 'text-orange-400' : 'text-slate-600';
        const scBarM = scSpots.length ? Math.round(scTiers.mastered / scSpots.length * 100) : 0;
        const scBarL = scSpots.length ? Math.round(scTiers.learning / scSpots.length * 100) : 0;
        const scBarS = scSpots.length ? Math.round(scTiers.struggling / scSpots.length * 100) : 0;
        const clickable = scSeen > 0 ? 'cursor-pointer hover:border-slate-600' : '';
        const oc = scSeen > 0 ? `onclick="drilldownScenario('${sc}')"` : '';
        const scAc = scAcc(sc);
        const scTot = scTotal(sc);
        const medalObj = medals[sc];
        const medalIcon = medalObj ? MEDAL_ICONS[medalObj.medal] : '';
        html += `<div class="bg-slate-950/50 border border-slate-800/50 rounded-xl p-3 transition-colors ${clickable}" ${oc}>
            <div class="flex justify-between items-center mb-1.5">
                <div class="flex items-center gap-2">
                    ${medalIcon ? `<span class="text-sm">${medalIcon}</span>` : ''}
                    <span class="text-xs font-bold text-slate-300">${SCENARIO_LABELS[sc]}</span>
                </div>
                <div class="flex items-center gap-2">
                    ${scTot > 0 ? `<span class="text-[10px] text-slate-500">${scAc}% · ${scTot}</span>` : ''}
                    <span class="font-black text-xs ${scColor}">${scMastery}%</span>
                    ${scSeen > 0 ? `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>` : ''}
                </div>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-1.5 flex overflow-hidden">
                <div class="bg-emerald-500 h-1.5" style="width:${scBarM}%"></div>
                <div class="bg-indigo-500 h-1.5" style="width:${scBarL}%"></div>
                <div class="bg-rose-500 h-1.5" style="width:${scBarS}%"></div>
            </div>
        </div>`;
    });
    html += `</div></div>`;

    // === BY POSITION with hands played + accuracy ===
    html += `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">By Position</p>
        <div class="flex flex-col gap-3">`;
    ALL_POSITIONS.forEach(pos => {
        const posSpots = allSpots.filter(k => {
            const parts = k.split('|');
            const spotId = parts[1];
            return spotId === pos || spotId.startsWith(pos + '_vs_');
        });
        const posTiers = { mastered: 0, learning: 0, struggling: 0, unseen: 0 };
        posSpots.forEach(k => posTiers[classifySpot(k)]++);
        const posMastery = posSpots.length ? Math.round(posTiers.mastered / posSpots.length * 100) : 0;
        const posSeen = posSpots.length - posTiers.unseen;
        const posColor = posMastery >= 80 ? 'text-emerald-400' : posMastery >= 50 ? 'text-yellow-400' : posMastery > 0 ? 'text-orange-400' : 'text-slate-600';
        const posBarM = posSpots.length ? Math.round(posTiers.mastered / posSpots.length * 100) : 0;
        const posBarL = posSpots.length ? Math.round(posTiers.learning / posSpots.length * 100) : 0;
        const posBarS = posSpots.length ? Math.round(posTiers.struggling / posSpots.length * 100) : 0;
        const posD = g.byPos[pos];
        const posAc = posD && posD.total ? Math.round(posD.correct / posD.total * 100) : 0;
        const posTot = posD ? posD.total : 0;
        const clickable = posSeen > 0 ? 'cursor-pointer hover:border-slate-600' : '';
        const oc2 = posSeen > 0 ? `onclick="drilldownPosition('${pos}')"` : '';
        html += `<div class="bg-slate-950/50 border border-slate-800/50 rounded-xl p-3 transition-colors ${clickable}" ${oc2}>
            <div class="flex justify-between items-center mb-1.5">
                <span class="text-xs font-bold text-slate-300">${POS_LABELS[pos]}</span>
                <div class="flex items-center gap-2">
                    ${posTot > 0 ? `<span class="text-[10px] text-slate-500">${posAc}% · ${posTot}</span>` : ''}
                    <span class="font-black text-xs ${posColor}">${posMastery}%</span>
                    ${posSeen > 0 ? `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>` : ''}
                </div>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-1.5 flex overflow-hidden">
                <div class="bg-emerald-500 h-1.5" style="width:${posBarM}%"></div>
                <div class="bg-indigo-500 h-1.5" style="width:${posBarL}%"></div>
                <div class="bg-rose-500 h-1.5" style="width:${posBarS}%"></div>
            </div>
        </div>`;
    });
    html += `</div></div>`;

    // === POSITION GROUPS ===
    const posGroups = ['EP', 'MP', 'LP', 'SB', 'BB'];
    const pgData = state.global.byPosGroup || {};
    html += `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Position Groups</p>
        <div class="grid grid-cols-5 gap-2 text-center">
            ${posGroups.map(pg => {
                const d = pgData[pg];
                const acc = d && d.total ? Math.round(d.correct / d.total * 100) : 0;
                const tot = d ? d.total : 0;
                const color = tot === 0 ? 'text-slate-600' : acc >= 80 ? 'text-emerald-400' : acc >= 50 ? 'text-yellow-400' : 'text-orange-400';
                return `<div class="bg-slate-950/50 border border-slate-800/50 rounded-xl py-3 px-1">
                    <p class="text-[10px] font-bold text-slate-400 mb-1">${pg}</p>
                    <p class="text-sm font-black ${color}">${tot > 0 ? acc + '%' : '—'}</p>
                    <p class="text-[9px] text-slate-600 mt-0.5">${tot} hands</p>
                </div>`;
            }).join('')}
        </div>
    </div>`;

    // === STRUGGLING SPOTS ===
    const strugglingSpots = allSpots
        .filter(k => classifySpot(k) === 'struggling')
        .map(k => {
            const stats = SR.getSpotStats(k, edgeClassify);
            const parts = k.split('|');
            const scShort = SCENARIO_SHORT[parts[0]] || parts[0];
            const label = formatSpotLabel(parts[1]);
            return { key: k, label, scShort, wrongPct: 100 - stats.accuracy, attempts: stats.totalAttempts, coverage: stats.coverage };
        })
        .sort((a, b) => b.wrongPct - a.wrongPct)
        .slice(0, 6);

    if (strugglingSpots.length > 0) {
        html += `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">🔥 Needs Work</p>
            <div class="flex flex-col gap-2">`;
        strugglingSpots.forEach(s => {
            html += `<div class="flex justify-between items-center bg-slate-950/50 rounded-xl px-3 py-2.5">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-300">${s.label}</span>
                    <span class="text-[9px] text-slate-600">${s.scShort}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-rose-400 font-black text-xs">${s.wrongPct}%</span>
                    <span class="text-slate-600 text-[9px]">${s.attempts} hands</span>
                </div>
            </div>`;
        });
        html += `</div></div>`;
    }

    // === RECENTLY MASTERED ===
    const now = Date.now();
    const recentMastered = allSpots
        .filter(k => classifySpot(k) === 'mastered')
        .map(k => {
            const stats = SR.getSpotStats(k, edgeClassify);
            const parts = k.split('|');
            return { key: k, label: formatSpotLabel(parts[1]), scShort: SCENARIO_SHORT[parts[0]] || parts[0], coverage: stats.coverage, accuracy: stats.accuracy };
        })
        .slice(0, 5);

    if (recentMastered.length > 0) {
        html += `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">✨ Mastered Spots</p>
            <div class="flex flex-col gap-2">`;
        recentMastered.forEach(s => {
            html += `<div class="flex justify-between items-center bg-slate-950/50 rounded-xl px-3 py-2.5">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-emerald-300">${s.label}</span>
                    <span class="text-[9px] text-slate-600">${s.scShort}</span>
                </div>
                <span class="text-emerald-500/60 text-[10px] font-bold">${s.coverage}% cov · ${s.accuracy}% acc</span>
            </div>`;
        });
        html += `</div></div>`;
    }

    // === RESET ===
    html += `<button onclick="resetStats()" class="w-full py-3 bg-slate-900 border border-rose-900/40 hover:border-rose-700 rounded-2xl font-bold text-rose-500/70 hover:text-rose-400 transition-all text-sm">Reset All Stats</button>`;

    document.getElementById('stats-body').innerHTML = html;
}