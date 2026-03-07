// engine.js — State, dev flags, SR engine, EdgeWeight, review queue, range validator
// Auto-split from PokerCrusher monolith — do not reorder script tags

let state = {
    currentHand: null, currentPos: '', oppPos: '', scenario: 'RFI', villainOpenSize: 15, stackBB: 10,
    squeezeOpener: '', squeezeCaller: '', squeezeCaller2: '',
    limperBucket: '1L', limperPositions: [],
    sessionStats: { total: 0, correct: 0, streak: 0 },
    sessionLog: [], // array of hand records for this session
    recentHandKeys: [], // variety guard: last N hand keys for anti-repeat
    global: { totalHands: 0, totalCorrect: 0, bestStreak: 0, byScenario: {}, byPos: {}, byPosGroup: {}, bySpot: {}, byHand: {} },
    config: { scenarios: ['RFI', 'FACING_RFI', 'RFI_VS_3BET', 'VS_LIMP', 'SQUEEZE', 'SQUEEZE_2C'], positions: [...ALL_POSITIONS], openSize: 15, postflopScenarios: ['POSTFLOP_CBET'] },
    pfStacks: [5,8,10,13,15,20],  // enabled stack depths for push/fold
    libCategory: 'RFI',
    postflop: null // current postflop spot when in postflop mode
};

// --- DEVELOPER FLAGS ---
window.RANGE_VALIDATE = true;
window.RANGE_AUTO_FIX = false;
window.SR_EDGE_DEBUG = false;

// ============================================================
// SPACED REPETITION ENGINE
// ============================================================
const SR = (function() {
    const STORAGE_KEY = profileKey('gto_sr_v2');
    const OLD_STORAGE_KEY = profileKey('gto_sr_v1');
    const DAY_MS = 86400000;
    const MIN_INTERVAL = 0.02;
    const MAX_INTERVAL = 90;
    let db = {};

    function clampInterval(v) { return Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, v)); }

    function sanitizeRecord(r) {
        if (typeof r.intervalDays !== 'number' || isNaN(r.intervalDays)) r.intervalDays = 0;
        if (r.intervalDays > MAX_INTERVAL) r.intervalDays = MAX_INTERVAL;
        const now = Date.now();
        const maxDue = now + MAX_INTERVAL * DAY_MS;
        if (typeof r.dueAt !== 'number' || r.dueAt > maxDue) r.dueAt = now + r.intervalDays * DAY_MS;
        if (!r.totalAttempts) r.totalAttempts = 0;
        if (!r.totalWrong) r.totalWrong = 0;
        if (!r.lapses) r.lapses = 0;
        if (!r.reps) r.reps = 0;
        if (!r.streakCorrect) r.streakCorrect = 0;
        if (!r.lastSeenAt) r.lastSeenAt = 0;
        if (!r.previousSeenAt) r.previousSeenAt = r.lastSeenAt || 0;
        if (!r.recentResults) r.recentResults = [];
        delete r.ease; // removed — no longer used
        return r;
    }

    function migrate() {
        try {
            const oldData = localStorage.getItem(OLD_STORAGE_KEY);
            if (oldData && Object.keys(db).length === 0) {
                const oldDb = JSON.parse(oldData);
                console.log('[SR] Migrating v1 spot-level → v2 hand-level...');
                let migrated = 0;
                for (const spotKey in oldDb) {
                    const oldRec = oldDb[spotKey];
                    if (!oldRec || !oldRec.totalAttempts) continue;
                    db[spotKey + '|_LEGACY'] = sanitizeRecord({...oldRec, recentResults: []});
                    migrated++;
                }
                console.log(`[SR] Migrated ${migrated} legacy records.`);
                save();
            }
        } catch(e) { console.warn('[SR Migration] Error:', e); }
        for (const k in db) sanitizeRecord(db[k]);
    }

    function load() {
        try { const s = localStorage.getItem(STORAGE_KEY); if (s) db = JSON.parse(s); } catch(e) {}
        migrate();
        applyVacationMode();
    }

    // 3b — Vacation mode: if you haven't trained in >7 days, shift all due dates
    // forward by (absence - 7) days so you don't return to an overwhelming flood.
    // Capped at 30 days of relief max (extreme absences still catch up gradually).
    function applyVacationMode() {
        const now = Date.now();
        const keys = Object.keys(db).filter(k => !k.endsWith('|_LEGACY'));
        if (keys.length === 0) return;

        // Find when we last trained — max lastSeenAt across all records
        let lastTrainedAt = 0;
        for (const k of keys) {
            if (db[k].lastSeenAt > lastTrainedAt) lastTrainedAt = db[k].lastSeenAt;
        }
        if (lastTrainedAt === 0) return;

        const absenceDays = (now - lastTrainedAt) / DAY_MS;
        if (absenceDays <= 7) return; // normal gap, no adjustment needed

        // Shift due dates forward by the excess absence, capped at 30 days
        const shiftDays = Math.min(absenceDays - 7, 30);
        const shiftMs = shiftDays * DAY_MS;
        let shifted = 0;
        for (const k of keys) {
            const r = db[k];
            if (r.dueAt && r.dueAt < now + 365 * DAY_MS) {
                r.dueAt += shiftMs;
                shifted++;
            }
        }
        if (shifted > 0) {
            console.log(`[SR] Vacation mode: ${absenceDays.toFixed(1)}d absence shifted ${shifted} cards +${shiftDays.toFixed(1)}d`);
            save();
        }
    }
    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch(e) {}
    }
    function getOrCreate(key) {
        if (!db[key]) db[key] = {
            reps: 0, intervalDays: 0, dueAt: 0,
            lapses: 0, lastResult: null, streakCorrect: 0,
            lastSeenAt: 0, previousSeenAt: 0,
            totalAttempts: 0, totalWrong: 0,
            recentResults: []
        };
        return db[key];
    }

    function update(key, grade) {
        const r = getOrCreate(key);
        const now = Date.now();
        r.totalAttempts++;
        r.lastSeenAt = now;
        r.lastResult = grade;
        r.recentResults.push(grade === 'Good');
        if (r.recentResults.length > 50) r.recentResults.shift();

        // How long since last review of THIS hand?
        const daysSinceLast = r.previousSeenAt > 0 ? (now - r.previousSeenAt) / DAY_MS : 999;
        r.previousSeenAt = now;

        // Anti-cramming: if seen again within 2 hours, don't advance interval
        const isCramming = daysSinceLast < 0.08; // ~2 hours

        if (grade === 'Again') {
            r.totalWrong++;
            r.lapses++;
            r.streakCorrect = 0;
            // Don't reset reps to 0 — that's too harsh. Halve them.
            r.reps = Math.max(0, Math.floor(r.reps / 2));
            // Interval drops sharply but not to absolute minimum unless repeated failures
            if (r.lapses >= 3) r.intervalDays = MIN_INTERVAL; // truly struggling
            else r.intervalDays = Math.max(MIN_INTERVAL, r.intervalDays * 0.3);
        } else {
            r.streakCorrect++;

            if (isCramming) {
                // Same session repeat — don't advance interval or reps
            } else {
                r.reps++;
                if (r.reps === 1) r.intervalDays = 0.5;
                else if (r.reps === 2) r.intervalDays = 1;
                else if (r.reps === 3) r.intervalDays = 2;
                else if (r.reps === 4) r.intervalDays = 3;
                else if (r.reps === 5) r.intervalDays = 5;
                else if (r.reps === 6) r.intervalDays = 7;
                else {
                    r.intervalDays = Math.min(MAX_INTERVAL, 7 + (r.reps - 6) * 5);
                }

                // If user got it right after a LONG absence (>2x interval),
                // don't rocket the interval — they're relearning
                if (daysSinceLast > r.intervalDays * 2.5 && r.reps > 3) {
                    r.intervalDays = Math.max(r.intervalDays * 0.6, 1);
                }

                // 3c — Confidence cap: hands with fewer than 15 reps don't escape
                // the 3-week cycle, no matter how many correct answers in a single burst.
                // Rep 15 requires ~15 separate days of review to earn — until then, max 21d.
                if (r.reps < 15 && r.intervalDays > 21) {
                    r.intervalDays = 21;
                }
            }
        }

        r.intervalDays = clampInterval(r.intervalDays);

        // 3b — Fuzz: spread due dates ±15% to prevent mass-expiry clustering.
        // Applied to dueAt only, not intervalDays (keeps decay math clean).
        const fuzz = 1 + (Math.random() * 0.3 - 0.15); // 0.85 to 1.15
        r.dueAt = now + r.intervalDays * DAY_MS * fuzz;
        save();
    }

    function get(key) { return db[key] || null; }
    function getAll() { return db; }

    // ---- TWO-TIER: Spot-level rollup from hand records ----

    function getHandKeysForSpot(spotKey) {
        const prefix = spotKey + '|';
        return Object.keys(db).filter(k => k.startsWith(prefix) && !k.endsWith('|_LEGACY'));
    }

    function getRelevantHandCount(spotKey, edgeClassifier) {
        if (!edgeClassifier) return 40; // reasonable default
        let count = 0;
        for (let i = 0; i < 13; i++) {
            for (let j = 0; j < 13; j++) {
                const r1 = RANKS[i], r2 = RANKS[j];
                let hand = (i === j) ? r1+r2 : (i < j) ? r1+r2+'s' : r2+r1+'o';
                const cat = edgeClassifier(hand, spotKey);
                if (cat === 'EDGE' || cat === 'NORMAL') count++;
            }
        }
        return count || 1;
    }

    function classifySpot(spotKey, edgeClassifier) {
        const handKeys = getHandKeysForSpot(spotKey);

        if (handKeys.length === 0) {
            const legacy = db[spotKey + '|_LEGACY'];
            if (legacy && legacy.totalAttempts > 0) return 'learning';
            return 'unseen';
        }

        // Gather aggregate stats across all hands in this spot
        let totalAttempts = 0;
        let uniqueHandsSeen = 0;
        let recentResults = []; // pooled recent results across hands

        handKeys.forEach(k => {
            const r = db[k];
            if (!r || r.totalAttempts === 0) return;
            totalAttempts += r.totalAttempts;
            uniqueHandsSeen++;
            // Pool recent results (each hand keeps up to 50)
            recentResults.push(...r.recentResults.slice(-30));
        });

        // 1. Sample minimum
        if (totalAttempts < 5) return 'unseen';

        // 2. Recent performance windows
        const recent30 = recentResults.slice(-30);
        const recent10 = recentResults.slice(-10);
        const recent30Acc = recent30.length > 0 ? recent30.filter(x => x).length / recent30.length : 0;
        const recent10Acc = recent10.length > 0 ? recent10.filter(x => x).length / recent10.length : 0;
        const missesInLast10 = recent10.filter(x => !x).length;

        // 3. Struggling: recent accuracy is poor
        if (recent30.length >= 5 && recent30Acc < 0.70) return 'struggling';

        // 4. Mastered: strong recent performance + breadth
        if (uniqueHandsSeen >= 12 && recent30Acc >= 0.85 && recent10Acc >= 0.80 && missesInLast10 <= 2) {
            return 'mastered';
        }

        // 5. Everything else
        return 'learning';
    }

    function getSpotStats(spotKey, edgeClassifier) {
        const handKeys = getHandKeysForSpot(spotKey);
        const now = Date.now();
        const relevantPool = getRelevantHandCount(spotKey, edgeClassifier);
        let totalAttempts = 0, totalWrong = 0, handsSeen = 0, dueCount = 0, handsRelevantSeen = 0;

        handKeys.forEach(k => {
            const r = db[k];
            if (!r || r.totalAttempts === 0) return;
            handsSeen++;
            totalAttempts += r.totalAttempts;
            totalWrong += r.totalWrong;
            if (r.dueAt <= now) dueCount++;
            if (edgeClassifier) {
                const hand = k.split('|').pop();
                const cat = edgeClassifier(hand, spotKey);
                if (cat === 'EDGE' || cat === 'NORMAL') handsRelevantSeen++;
            } else {
                handsRelevantSeen = handsSeen;
            }
        });

        return {
            coverage: Math.round(handsRelevantSeen / relevantPool * 100),
            accuracy: totalAttempts ? Math.round((totalAttempts - totalWrong) / totalAttempts * 100) : 0,
            dueCount, handsSeen, totalAttempts, relevantPool,
            status: classifySpot(spotKey, edgeClassifier)
        };
    }

    function selectSpot(candidateKeys, recentKeys) {
        const now = Date.now();
        const recent = new Set((recentKeys || []).slice(-3));
        const scored = candidateKeys.map(k => {
            const r = db[k];
            if (!r) return { key: k, priority: 3, score: 0 };
            if (r.dueAt <= now) return { key: k, priority: 1, score: now - r.dueAt };
            if (r.intervalDays < 3) return { key: k, priority: 2, score: r.dueAt - now };
            return { key: k, priority: 4, score: r.totalAttempts > 0 ? r.totalWrong / r.totalAttempts : 0 };
        });
        scored.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            if (a.priority === 1) return b.score - a.score;
            if (a.priority === 2) return a.score - b.score;
            if (a.priority === 4) return b.score - a.score;
            return Math.random() - 0.5;
        });
        const againKeys = scored.filter(x => db[x.key] && db[x.key].lastResult === 'Again');
        for (const s of scored) { if (!recent.has(s.key)) return s.key; }
        if (againKeys.length) return againKeys[0].key;
        return scored[0]?.key || candidateKeys[0];
    }

    function getDueSpots(within24h) {
        const now = Date.now();
        const cutoff = within24h ? now + DAY_MS : now;
        return Object.keys(db).filter(k => !k.endsWith('|_LEGACY') && db[k].dueAt <= cutoff);
    }
    function getRecentlyIncorrect(withinDays) {
        const cutoff = Date.now() - withinDays * DAY_MS;
        return Object.keys(db).filter(k => !k.endsWith('|_LEGACY') && db[k].lastResult === 'Again' && db[k].lastSeenAt >= cutoff);
    }
    function getWeakest(n) {
        return Object.entries(db)
            .filter(([k,r]) => !k.endsWith('|_LEGACY') && r.totalAttempts >= 3)
            .sort(([,a],[,b]) => (b.totalWrong/b.totalAttempts) - (a.totalWrong/a.totalAttempts))
            .slice(0, n).map(([k]) => k);
    }

    window.srReport = function() {
        const now = Date.now();
        const all = Object.entries(db).filter(([k]) => !k.endsWith('|_LEGACY'));
        const due = all.filter(([,r]) => r.dueAt <= now);
        console.log(`[SR] Hand records: ${all.length}, Due: ${due.length}`);
        const worst = all.filter(([,r]) => r.totalAttempts >= 3)
            .sort(([,a],[,b]) => (b.totalWrong/b.totalAttempts) - (a.totalWrong/a.totalAttempts)).slice(0, 10);
        console.log('[SR] Worst 10:');
        worst.forEach(([k,r]) => console.log(`  ${k}: ${r.totalWrong}/${r.totalAttempts} wrong interval=${r.intervalDays.toFixed(1)}d`));
    };

    return { load, save, update, get, getOrCreate, getAll, selectSpot, getDueSpots, getRecentlyIncorrect, getWeakest, classifySpot, getSpotStats, getHandKeysForSpot, getRelevantHandCount, reset: function() { db = {}; save(); } };
})();

// ============================================================
// EDGE-CASE WEIGHTING
// ============================================================
const EdgeWeight = (function() {
    // Given a spotKey and hand, return weight category and weight value
    // Uses neighbor-based approach on the 13x13 matrix
    function getCorrectAction(hand, scenario, heroPos, oppPos) {
        if (scenario === 'RFI') {
            return checkRangeHelper(hand, rfiRanges[heroPos]) ? 'RAISE' : 'FOLD';
        } else if (scenario === 'FACING_RFI') {
            const data = facingRfiRanges[`${heroPos}_vs_${oppPos}`];
            if (!data) return 'FOLD';
            if (checkRangeHelper(hand, data["3-bet"])) return '3BET';
            if (data["Call"] && checkRangeHelper(hand, data["Call"])) return 'CALL';
            return 'FOLD';
        } else if (scenario === 'VS_LIMP') {
            // oppPos may include bucket suffix like "UTG|2L" - parse it
            let limpOpp = oppPos, limpBucket = '1L';
            if (oppPos && oppPos.includes('|')) {
                const pp = oppPos.split('|');
                limpOpp = pp[0]; limpBucket = pp[1] || '1L';
            }
            const data = getLimpDataForBucket(heroPos, limpOpp, limpBucket) || allFacingLimps[`${heroPos}_vs_${limpOpp}_Limp`];
            if (!data) return 'FOLD';
            if (checkRangeHelper(hand, getLimpRaise(data))) return 'ISO';
            if (isLimpBBSpot(data)) return 'OVERLIMP'; // BB can't fold; everything else is check
            if (checkRangeHelper(hand, getLimpPassive(data))) return 'OVERLIMP';
            return 'FOLD';
        } else if (scenario === 'SQUEEZE') {
            const data = squeezeRanges[oppPos];
            if (!data) return 'FOLD';
            if (checkRangeHelper(hand, data["Squeeze"])) return 'SQUEEZE';
            if (data["Call"] && checkRangeHelper(hand, data["Call"])) return 'CALL';
            return 'FOLD';
        } else if (scenario === 'SQUEEZE_2C') {
            const data = squeezeVsRfiTwoCallers[oppPos];
            if (!data) return 'FOLD';
            if (checkRangeHelper(hand, data["Squeeze"])) return 'SQUEEZE';
            if (data["Call"] && checkRangeHelper(hand, data["Call"])) return 'CALL';
            return 'FOLD';
        } else {
            const data = rfiVs3BetRanges[`${heroPos}_vs_${oppPos}`];
            if (!data) return 'FOLD';
            if (checkRangeHelper(hand, data["4-bet"])) return '4BET';
            if (checkRangeHelper(hand, data["Call"])) return 'CALL';
            return 'FOLD';
        }
    }

    function getNeighborHands(i, j) {
        // Cardinal neighbors (rank-adjacent, same suit class): primary edge detection
        const neighbors = [];
        if (i > 0)  neighbors.push([i-1, j, 1.0]);
        if (i < 12) neighbors.push([i+1, j, 1.0]);
        if (j > 0)  neighbors.push([i, j-1, 1.0]);
        if (j < 12) neighbors.push([i, j+1, 1.0]);

        // Diagonal neighbors: catch suited/offsuit boundary crossings and gap hands.
        // The suit-crossing diagonal [j,i] (swapped indices, same ranks) is the most
        // important — it's where JTs/JTo, T9s/T9o etc. diverge in range treatment.
        // Other diagonals catch one-rank-up/down connectors crossing region boundaries.
        const diags = [[-1,-1],[-1,1],[1,-1],[1,1]];
        for (const [di, dj] of diags) {
            const ni = i + di, nj = j + dj;
            if (ni < 0 || ni > 12 || nj < 0 || nj > 12) continue;
            // Suit-crossing diagonal: same two ranks, opposite suit orientation
            // Identified by ni+nj === i+j (swapped: ni===j && nj===i)
            const isSuitCross = (ni === j && nj === i);
            neighbors.push([ni, nj, isSuitCross ? 0.75 : 0.5]);
        }
        return neighbors;
    }

    function classify(hand, scenario, heroPos, oppPos, srRecord) {
        // Find grid position
        const r1 = hand[0], r2 = hand[1], type = hand[2] || '';
        const i = RANKS.indexOf(r1), j = RANKS.indexOf(r2);
        const myAction = getCorrectAction(hand, scenario, heroPos, oppPos);

        // Check neighbors — accumulate edge strength from differing-action neighbors.
        // Cardinals (weight 1.0) = strong edge signal.
        // Diagonals: suit-crossing (JTs↔JTo) = 0.75, other diagonals = 0.5.
        const neighbors = getNeighborHands(i, j);
        let edgeStrength = 0;
        for (const [ni, nj, nWeight] of neighbors) {
            const nr1 = RANKS[ni], nr2 = RANKS[nj];
            let nHand;
            if (ni === nj) nHand = nr1 + nr2;
            else if (ni < nj) nHand = nr1 + nr2 + 's';
            else nHand = nr2 + nr1 + 'o';
            const nAction = getCorrectAction(nHand, scenario, heroPos, oppPos);
            if (nAction !== myAction) edgeStrength += nWeight;
        }

        // isEdge: cardinal disagreement or strong diagonal signal
        const isEdge = edgeStrength >= 0.5;
        // isSoftEdge: only diagonal disagreement (suit boundary / gap hand near cutoff)
        const isSoftEdge = edgeStrength > 0 && edgeStrength < 0.5;

        // Trivial trash: always-fold AND far from any playable hand
        const isTrivialTrash = (myAction === 'FOLD') && !isEdge && !isSoftEdge;

        // Check if user has been getting this wrong despite it being "trash"
        const wrongRate = srRecord && srRecord.totalAttempts >= 5
            ? srRecord.totalWrong / srRecord.totalAttempts : 0;
        const trashButMissed = isTrivialTrash && wrongRate >= 0.2;

        let weight, category;
        if (isEdge) {
            weight = 4; category = 'EDGE';
        } else if (isSoftEdge) {
            // Diagonal-only edge: suited/offsuit boundary or gap hand near cutoff
            weight = 2.5; category = 'EDGE';
        } else if (isTrivialTrash && !trashButMissed) {
            weight = 0.25; category = 'TRASH';
        } else {
            weight = 2; category = 'NORMAL';
        }

        if (window.SR_EDGE_DEBUG) {
            console.log(`[EdgeWeight] ${hand} in ${scenario}|${heroPos}${oppPos?'_vs_'+oppPos:''} | action=${myAction} | edgeStrength=${edgeStrength.toFixed(2)} | weight=${weight} (${category})`);
        }

        return { weight, category, action: myAction };
    }

    // Sample a hand using edge weighting for a given spot
    // Returns a hand key string
    // missBoostData: { byHand, recentHandKeys, spotKey } for mistake prioritization
    function sampleHand(scenario, heroPos, oppPos, srDb, missBoostData) {
        const candidates = [];
        const now = Date.now();
        const HOURS_48 = 48 * 60 * 60 * 1000;
        const byHand = missBoostData ? missBoostData.byHand || {} : {};
        const recentKeys = missBoostData ? (missBoostData.recentHandKeys || []) : [];
        const recentSet = new Set(recentKeys.slice(-5));

        for (let i = 0; i < 13; i++) {
            for (let j = 0; j < 13; j++) {
                const r1 = RANKS[i], r2 = RANKS[j];
                let hand;
                if (i === j) hand = r1 + r2;
                else if (i < j) hand = r1 + r2 + 's';
                else hand = r2 + r1 + 'o';
                const oppSuffix = scenario === 'VS_LIMP' ? '_Limp' : '';
                let handSRKey;
                if (scenario === 'SQUEEZE' || scenario === 'SQUEEZE_2C') handSRKey = `${scenario}|${oppPos}|${hand}`;
                else if (scenario === 'VS_LIMP') {
                    // oppPos may carry bucket info as "UTG|2L"
                    let lOpp = oppPos, lBucket = '1L';
                    if (oppPos && oppPos.includes('|')) { const pp = oppPos.split('|'); lOpp = pp[0]; lBucket = pp[1]; }
                    handSRKey = `${scenario}|${heroPos}_vs_${lOpp}_Limp|${lBucket}|${hand}`;
                }
                else handSRKey = `${scenario}|${heroPos}${oppPos ? '_vs_' + oppPos + oppSuffix : ''}|${hand}`;
                const srRec = srDb[handSRKey] || null;
                let { weight } = classify(hand, scenario, heroPos, oppPos, srRec);

                // Mistake-boost layer (non-SR, selection bias only)
                if (missBoostData) {
                    const handStats = byHand[handSRKey];
                    if (handStats) {
                        if (handStats.lastMissedAt && (now - handStats.lastMissedAt) < HOURS_48) {
                            weight *= 2.0;
                        } else if (handStats.total >= 10 && handStats.correct / handStats.total < 0.70) {
                            weight *= 1.5;
                        }
                    }
                }

                candidates.push({ hand, weight, srKey: handSRKey });
            }
        }

        // Variety guard: suppress recently-seen hands unless pool is tiny
        if (recentSet.size > 0 && candidates.length >= 10) {
            candidates.forEach(c => {
                if (recentSet.has(c.srKey)) c.weight *= 0.05;
            });
        }

        // Weighted random selection
        const total = candidates.reduce((s, c) => s + c.weight, 0);
        let rand = Math.random() * total;
        for (const c of candidates) {
            rand -= c.weight;
            if (rand <= 0) return c.hand;
        }
        return candidates[candidates.length - 1].hand;
    }

    return { classify, sampleHand, getCorrectAction };
})();

// Bridge: classify a hand's edge category for a given spotKey
// Returns 'EDGE', 'NORMAL', or 'TRASH'
function edgeClassify(hand, spotKey) {
    // Postflop keys use a different format — return NORMAL for them
    if (typeof isPostflopSpotKey === 'function' && isPostflopSpotKey(spotKey)) return 'NORMAL';

    const parts = spotKey.split('|');
    const scenario = parts[0], spotId = parts[1];
    let heroPos, oppPos;
    if (scenario === 'RFI') { heroPos = spotId; oppPos = ''; }
    else if (scenario === 'VS_LIMP') {
        // spotId may be "BTN_vs_UTG_Limp" or "BTN_vs_UTG_Limp|2L"
        const m = spotId.match(/(.+)_vs_(.+)_Limp/);
        heroPos = m ? m[1] : ''; 
        const rawOpp = m ? m[2] : '';
        // Check for bucket suffix in parts[2]
        const bucket = parts[2] && (parts[2] === '1L' || parts[2] === '2L' || parts[2] === '3P') ? parts[2] : '1L';
        oppPos = bucket !== '1L' ? rawOpp + '|' + bucket : rawOpp;
    } else if (scenario === 'SQUEEZE') {
        const p = parseSqueezeKey(spotId);
        heroPos = p ? p.hero : ''; oppPos = spotId;
    } else if (scenario === 'SQUEEZE_2C') {
        const p = parseSqueeze2CKey(spotId);
        heroPos = p ? p.hero : ''; oppPos = spotId;
    } else {
        const [p, o] = spotId.split('_vs_');
        heroPos = p; oppPos = o;
    }
    const { category } = EdgeWeight.classify(hand, scenario, heroPos, oppPos, null);
    return category;
}

// ============================================================
// REVIEW SESSION STATE
// ============================================================
const REVIEW_DAILY_CAP = 20;

let reviewSession = {
    active: false,
    queue: [],
    recentKeys: [],
    answered: 0,
    maxQ: REVIEW_DAILY_CAP,
    todayDoneKeys: new Set() // hands reviewed this session-day (in-memory)
};

// ── Build today's capped, prioritised review queue ────────────
function buildReviewQueue() {
    const allSpotKeys = getAllSpotKeys();
    const now = Date.now();
    const srDb = SR.getAll();

    // Collect all overdue hand keys, scored by urgency
    const scored = [];
    Object.entries(srDb).forEach(([k, r]) => {
        if (k.endsWith('|_LEGACY')) return;
        if (reviewSession.todayDoneKeys.has(k)) return; // skip already done today
        const lastPipe = k.lastIndexOf('|');
        const spotKey = k.substring(0, lastPipe);
        if (!allSpotKeys.includes(spotKey)) return;
        if (r.dueAt > now) return; // not yet due
        // Score: higher = more urgent. Combine overdueness + error rate
        const overdueDays = (now - r.dueAt) / (24 * 3600 * 1000);
        const errRate = r.totalAttempts > 0 ? r.totalWrong / r.totalAttempts : 0;
        const urgency = overdueDays * 2 + errRate * 3 + (r.lastResult === 'Again' ? 2 : 0);
        scored.push({ key: k, urgency, spotKey, errRate });
    });

    // Sort by urgency descending, take top cap
    scored.sort((a, b) => b.urgency - a.urgency);
    const queue = scored.slice(0, REVIEW_DAILY_CAP).map(s => s.key);

    // If queue is thin, pad with recently-incorrect hands not yet due
    if (queue.length < 5) {
        const incorrectSet = SR.getRecentlyIncorrect(7);
        for (const k of incorrectSet) {
            if (queue.length >= REVIEW_DAILY_CAP) break;
            if (queue.includes(k)) continue;
            const lastPipe = k.lastIndexOf('|');
            if (allSpotKeys.includes(k.substring(0, lastPipe))) queue.push(k);
        }
    }

    return queue;
}

// ── Preview screen ─────────────────────────────────────────────
function showReviewPreview() {
    const queue = buildReviewQueue();
    const allDueCount = SR.getDueSpots(false).length;

    const countEl = document.getElementById('review-count-label');
    const overdueEl = document.getElementById('review-overdue-label');
    const spotListEl = document.getElementById('review-spot-list');

    if (countEl) countEl.textContent = queue.length > 0 ? String(queue.length) : '0';
    if (overdueEl) overdueEl.textContent = allDueCount > REVIEW_DAILY_CAP ? allDueCount + ' total' : allDueCount + ' overdue';

    // Build top spots summary (group by spotKey, pick worst 4)
    if (spotListEl) {
        if (queue.length === 0) {
            spotListEl.innerHTML = '<div class="text-slate-600 text-xs italic">Nothing due right now — great work!</div>';
        } else {
            const spotGroups = {};
            queue.forEach(k => {
                const spotKey = k.substring(0, k.lastIndexOf('|'));
                if (!spotGroups[spotKey]) spotGroups[spotKey] = 0;
                spotGroups[spotKey]++;
            });
            const topSpots = Object.entries(spotGroups)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4);
            spotListEl.innerHTML = topSpots.map(([sk, n]) => {
                const name = prettySpotName(sk);
                return `<div class="flex items-center justify-between py-1 border-b border-slate-800/40 last:border-0">
                    <span class="text-[12px] text-slate-300 font-semibold">${name}</span>
                    <span class="text-[10px] text-amber-400 font-black">${n} hand${n>1?'s':''}</span>
                </div>`;
            }).join('');
        }
    }

    // Show/hide start button
    const startBtn = document.querySelector('#review-preview-screen button[onclick="launchReviewSession()"]');
    if (startBtn) {
        startBtn.disabled = queue.length === 0;
        startBtn.classList.toggle('opacity-40', queue.length === 0);
        startBtn.textContent = queue.length > 0 ? 'START REVIEW' : 'All caught up!';
    }

    // Stash the queue so launchReviewSession can use it
    reviewSession._previewQueue = queue;

    hideAllScreens();
    document.getElementById('review-preview-screen').classList.remove('hidden');
}

function hideReviewPreview() {
    document.getElementById('review-preview-screen').classList.add('hidden');
    showMenu();
}

function launchReviewSession() {
    const queue = reviewSession._previewQueue || buildReviewQueue();
    if (queue.length === 0) return;
    _startReviewWithQueue(queue);
}

function _startReviewWithQueue(candidates) {
    reviewSession.active = true;
    reviewSession.queue = candidates;
    reviewSession.recentKeys = [];
    reviewSession.answered = 0;
    reviewSession.maxQ = candidates.length;

    state.sessionStats = { total: 0, correct: 0, streak: 0 };
    state.sessionLog = [];
    hideAllScreens();
    document.getElementById('trainer-screen').classList.remove('hidden');
    try { ensureTableLayers(true); } catch(_) {}
    updateUI();
    safeGenerateNextRound();
}

// All possible spot keys from the loaded ranges
function getAllSpotKeys() {
    const keys = [];
    Object.keys(rfiRanges).forEach(p => keys.push(`RFI|${p}`));
    Object.keys(facingRfiRanges).forEach(k => keys.push(`FACING_RFI|${k}`));
    Object.keys(rfiVs3BetRanges).forEach(k => keys.push(`RFI_VS_3BET|${k}`));
    Object.keys(allFacingLimps).forEach(k => {
        keys.push(`VS_LIMP|${k}|1L`);
        keys.push(`VS_LIMP|${k}|2L`);
        keys.push(`VS_LIMP|${k}|3P`);
    });
    Object.keys(squeezeRanges).forEach(k => keys.push(`SQUEEZE|${k}`));
    Object.keys(squeezeVsRfiTwoCallers).forEach(k => keys.push(`SQUEEZE_2C|${k}`));
    // Push/fold spots: one per position × stack depth
    PF_STACK_DEPTHS.forEach(bb => {
        Object.keys(PF_PUSH[bb] || {}).forEach(pos => keys.push(`PUSH_FOLD|${pos}|${bb}BB`));
    });
    // Postflop spots (Phase 1)
    if (typeof POSTFLOP_STRATEGY !== 'undefined') {
        Object.keys(POSTFLOP_STRATEGY).forEach(k => keys.push(k));
    }
    return keys;
}

// Legacy alias — keeps the ResizeObserver patch in the IIFE working
function startReviewSession() {
    showReviewPreview();
}

// --- RANGE VALIDATOR ---
(function() {
    const _RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

    // Expand a single range token into explicit hand tokens (e.g. "JJ-77" -> ["JJ","TT","99","88","77"])
    function expandToken(token) {
        const hands = new Set();
        const t = token.trim();

        // "AK" shorthand (2 different ranks, no suffix) — both AKs and AKo
        if (t.length === 2 && /^[AKQJT2-9]{2}$/.test(t) && t[0] !== t[1]) {
            hands.add(t[0]+t[1]+'s'); hands.add(t[0]+t[1]+'o'); return hands;
        }

        // "XX+" — pairs or suited/offsuit ladder
        if (t.endsWith('+')) {
            const base = t.slice(0, -1);
            const suffix = base.endsWith('s') ? 's' : base.endsWith('o') ? 'o' : '';
            const r1 = base[0], r2 = suffix ? base[1] : base[1];
            const ri1 = _RANKS.indexOf(r1), ri2 = suffix ? _RANKS.indexOf(r2) : _RANKS.indexOf(r2);
            if (r1 === r2 && !suffix) {
                // Pair: e.g. QQ+ → QQ,KK,AA
                for (let i = 0; i <= ri1; i++) hands.add(_RANKS[i]+_RANKS[i]);
            } else {
                // Suited/offsuit kicker ladder: e.g. ATs+ → ATs,AJs,AQs,AKs
                for (let i = 0; i <= ri2; i++) {
                    if (_RANKS[i] !== r1) hands.add(r1+_RANKS[i]+(suffix||'s'));
                }
            }
            return hands;
        }

        // "XX-YY" — ranges
        if (t.includes('-')) {
            const dash = t.indexOf('-');
            const s = t.slice(0, dash), e = t.slice(dash+1);
            const sSuffix = s.endsWith('s') ? 's' : s.endsWith('o') ? 'o' : '';
            const eSuffix = e.endsWith('s') ? 's' : e.endsWith('o') ? 'o' : '';
            const sR1 = s[0], sR2 = s[1], eR1 = e[0], eR2 = e[1];
            const sRi1 = _RANKS.indexOf(sR1), sRi2 = _RANKS.indexOf(sR2);
            const eRi1 = _RANKS.indexOf(eR1), eRi2 = _RANKS.indexOf(eR2);

            if (sR1 === sR2 && !sSuffix && eR1 === eR2 && !eSuffix) {
                // Pair range: JJ-77
                for (let i = sRi1; i <= eRi1; i++) hands.add(_RANKS[i]+_RANKS[i]);
            } else if (sSuffix && eSuffix && sR1 === eR1) {
                // Kicker range: ATs-A8s
                for (let i = sRi2; i <= eRi2; i++) {
                    if (_RANKS[i] !== sR1) hands.add(sR1+_RANKS[i]+sSuffix);
                }
            }
            return hands;
        }

        hands.add(t);
        return hands;
    }

    // Expand a full list of tokens into a flat Set of hand strings
    function expandList(list) {
        const result = new Set();
        if (!list) return result;
        for (const token of list) {
            for (const h of expandToken(token)) result.add(h);
        }
        return result;
    }

    // Get all non-fold hands for a spot (union of 3bet/4bet + call)
    function getPlayable(spot) {
        const s = new Set();
        for (const h of expandList(spot['3-bet'] || spot['3bet'] || spot['4-bet'] || spot['4bet'])) s.add(h);
        for (const h of expandList(spot['Call'])) s.add(h);
        return s;
    }

    // Monotonicity rules: if "child" is playable, "parents" must also be playable
    const MONOTONICITY_RULES = [
        // Offsuit ladders
        { child: 'AJo', parents: ['AQo','AKo'], rule: 'AJo present => AQo,AKo must be playable' },
        { child: 'ATo', parents: ['AJo','AQo','AKo'], rule: 'ATo present => AJo+ must be playable' },
        { child: 'KQo', parents: ['AKo'], rule: 'KQo present => AKo must be playable' },
        { child: 'KJo', parents: ['KQo'], rule: 'KJo present => KQo must be playable' },
        // Suited ladders
        { child: 'AJs', parents: ['AQs','AKs'], rule: 'AJs present => AQs,AKs must be playable' },
        { child: 'ATs', parents: ['AJs','AQs','AKs'], rule: 'ATs present => AJs+ must be playable' },
        { child: 'KTs', parents: ['KJs','KQs'], rule: 'KTs present => KJs,KQs must be playable' },
        { child: 'KJs', parents: ['KQs'], rule: 'KJs present => KQs must be playable' },
        { child: 'QTs', parents: ['QJs'], rule: 'QTs present => QJs must be playable' },
        { child: 'JTs', parents: ['QJs'], rule: 'JTs present => QJs must be playable' },
        // Pair ladders
        { child: '77', parents: ['88','99','TT','JJ','QQ','KK','AA'], rule: '77 present => 88+ must be playable' },
        { child: '88', parents: ['99','TT','JJ','QQ','KK','AA'], rule: '88 present => 99+ must be playable' },
        { child: '99', parents: ['TT','JJ','QQ','KK','AA'], rule: '99 present => TT+ must be playable' },
        { child: 'TT', parents: ['JJ','QQ','KK','AA'], rule: 'TT present => JJ+ must be playable' },
    ];

    window.validateAndNormalizeRanges = function(rangesObj) {
        if (!window.RANGE_VALIDATE) return rangesObj;
        let issues = 0;

        for (const [key, spot] of Object.entries(rangesObj)) {
            const playable = getPlayable(spot);
            const callHands = expandList(spot['Call']);
            const warnings = [];

            for (const rule of MONOTONICITY_RULES) {
                if (playable.has(rule.child)) {
                    const missing = rule.parents.filter(p => !playable.has(p));
                    if (missing.length > 0) {
                        warnings.push({ rule: rule.rule, missing, child: rule.child });
                        if (window.RANGE_AUTO_FIX) {
                            // Add missing dominators into Call (or 3bet if child is in 3bet)
                            const in3bet = expandList(spot['3-bet'] || spot['3bet'] || spot['4-bet'] || spot['4bet']).has(rule.child);
                            const bucket = in3bet ? (spot['3-bet'] || spot['3bet'] || spot['4-bet'] || spot['4bet']) : spot['Call'];
                            for (const m of missing) { if (bucket && !bucket.includes(m)) bucket.push(m); }
                        }
                    }
                }
            }

            if (warnings.length > 0) {
                issues++;
                console.warn(`[RangeValidator] ⚠ ${key}:`);
                for (const w of warnings) {
                    console.warn(`  Rule: ${w.rule}`);
                    console.warn(`  Missing: ${w.missing.join(', ')}${window.RANGE_AUTO_FIX ? ' → AUTO-FIXED' : ''}`);
                }
            }
        }

        if (issues === 0) console.log('[RangeValidator] ✓ All ranges passed monotonicity checks.');
        return rangesObj;
    };
})();

// --- CORE LOGIC ---

// ============================================================
// DRILL MODE & MEDALS
// ============================================================
