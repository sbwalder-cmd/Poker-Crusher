// ui.js — Table animation, rendering, buttons, toasts, charts, library, stats, responsive
// Auto-split from PokerCrusher monolith — do not reorder script tags

function getSeatCoords(heroPos, pos) {
    const heroIdx = TABLE_ORDER.indexOf(heroPos);
    const i = TABLE_ORDER.indexOf(pos);
    const slotIdx = (i - heroIdx + 9) % 9;
    return { ...SEAT_COORDS[slotIdx], pos };
}

// Place card backs near a seat, offset toward table center
function placeCardBacks(cardsLayer, coords, animated, folded) {
    const el = document.createElement('div');
    el.className = 'seat-cards';
    // Offset slightly toward center — smaller on mobile
    let cL = parseFloat(coords.left), cT = parseFloat(coords.top);
    let offL = 0, offT = 0;
    const isMob = SEAT_COORDS === SEAT_COORDS_MOBILE;
    const cbOff = isMob ? 3 : 4;
    // Bottom-center seat (hero) needs a bigger upward offset so cards sit above the box
    const isBottomCenter = Math.abs(cL - 50) < 10 && cT > 75;
    if (isBottomCenter) {
        offT = isMob ? -8 : -7;
    } else {
        if (cL < 35) offL = cbOff; else if (cL > 65) offL = -cbOff;
        if (cT < 35) offT = cbOff; else if (cT > 65) offT = -cbOff;
        if (Math.abs(cL - 50) < 15 && cT < 35) offT = cbOff;
        if (Math.abs(cL - 50) < 15 && cT > 65) offT = -cbOff;
    }
    el.style.left = (cL + offL) + '%';
    el.style.top = (cT + offT) + '%';
    el.style.transform = 'translate(-50%, -50%)';
    if (folded) el.style.opacity = '0';
    el.innerHTML = `<div class="card-back${animated ? ' dealing' : ''}"></div><div class="card-back${animated ? ' dealing' : ''}" style="${animated ? 'animation-delay:0.05s' : ''}"></div>`;
    cardsLayer.appendChild(el);
    return el;
}

// Show a floating action badge near a seat (rendered in cards-layer, not inside seat)
function showActionBadge(seatEl, text, badgeClass, duration, cb) {
    const cardsLayer = document.getElementById('cards-layer');
    // Get seat's position as percentages from its style
    const left = seatEl.style.left;
    const top = seatEl.style.top;
    const badge = document.createElement('div');
    badge.className = `action-badge ${badgeClass}`;
    badge.innerText = text;
    badge.style.position = 'absolute';
    badge.style.left = left;
    // Offset upward from the seat — smaller on mobile
    const topPct = parseFloat(top);
    const badgeOff = SEAT_COORDS === SEAT_COORDS_MOBILE ? 6 : 8;
    badge.style.top = (topPct - badgeOff) + '%';
    badge.style.transform = 'translate(-50%, -100%)';
    badge.style.zIndex = '50';
    cardsLayer.appendChild(badge);
    setTimeout(() => {
        badge.style.opacity = '0';
        badge.style.transition = 'opacity 0.2s';
        setTimeout(() => { badge.remove(); if (cb) cb(); }, 220);
    }, duration);
}

// Animate a chip appearing at a position
function animateChip(betsLayer, coords, amountBb, labelOverride) {
    const betDiv = document.createElement('div');
    betDiv.className = 'absolute flex items-center gap-1 z-35 -translate-x-1/2 -translate-y-1/2 pointer-events-none chip-anim';
    const origL = parseFloat(coords.left), origT = parseFloat(coords.top);
    let betL = origL, betT = origT;

    // Base nudge toward table center so chips don't collide with seat/position boxes
    const isMob = (SEAT_COORDS === SEAT_COORDS_MOBILE);
    const bOff = isMob ? 12 : 16;
    if (betL < 45) betL += bOff; else if (betL > 55) betL -= bOff;
    if (betT < 45) betT += bOff; else if (betT > 55) betT -= bOff;

    // Extra vertical clearance for bottom seats (hero area) and top seats
    if (origT > (isMob ? 80 : 84)) betT -= (isMob ? 10 : 12);
    if (origT < (isMob ? 12 : 10)) betT += (isMob ? 8 : 10);

    // Extra horizontal clearance for extreme side seats
    if (origL < (isMob ? 8 : 6)) betL += (isMob ? 10 : 12);
    if (origL > (isMob ? 92 : 94)) betL -= (isMob ? 10 : 12);

                // Small per-position horizontal jitter to prevent adjacent bet overlaps
    if (coords && coords.pos && typeof BET_JITTER !== 'undefined' && BET_JITTER[coords.pos] != null) {
        betL += BET_JITTER[coords.pos];
    }

// Clamp into a safe box so chips never clip off the felt container
    const minL = isMob ? 10 : 8, maxL = isMob ? 90 : 92;
    const minT = isMob ? 12 : 10, maxT = isMob ? 88 : 90;
    betL = Math.max(minL, Math.min(maxL, betL));
    betT = Math.max(minT, Math.min(maxT, betT));

    betDiv.style.left = betL + '%';
    betDiv.style.top = betT + '%';
    betDiv.innerHTML = `<div style="width:var(--chip-size,16px);height:var(--chip-size,16px);" class="rounded-full bg-rose-600 border border-white/20"></div><span style="font-size:var(--chip-font,9px);" class="font-black text-yellow-400 bg-black/40 px-1 rounded">${labelOverride ? labelOverride : bbTo$(amountBb)}</span>`;
    betsLayer.appendChild(betDiv);
    return betDiv;
}

function updateTable(heroPos, oppPos) {
    // Defensive: ensure layers exist before rendering (challenge transitions can drop them)
    try { ensureTableLayers(); } catch(_) {}

    const heroIdx = TABLE_ORDER.indexOf(heroPos);
    const btnEl = document.getElementById('dealer-button');
    let betsLayer = document.getElementById('bets-layer');
    let cardsLayer = document.getElementById('cards-layer');

    if (!betsLayer || !cardsLayer) {
        try { ensureTableLayers(true); } catch(_) {}
        betsLayer = document.getElementById('bets-layer');
        cardsLayer = document.getElementById('cards-layer');
    }
    if (!betsLayer || !cardsLayer) {
        console.warn('[updateTable] Missing table layers; aborting render');
        return;
    }

    betsLayer.innerHTML = '';
    cardsLayer.innerHTML = '';
    
    TABLE_ORDER.forEach((pos, i) => {
        const slotIdx = (i - heroIdx + 9) % 9;
        const coords = SEAT_COORDS[slotIdx];
        const el = document.getElementById(`seat-${pos}`);
        if (el) {
            el.style.left = coords.left; el.style.top = coords.top;

            if (pos === heroPos) el.className = `seat bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-black text-slate-300 seat-active`;
            else if (pos === oppPos) el.className = `seat border rounded-lg flex items-center justify-center font-black bg-rose-900/40 border-rose-500/50 text-rose-200`;
            else el.className = `seat bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-black text-slate-300`;
        }

        // Card backs for all seats (safe)
        try { placeCardBacks(cardsLayer, coords, false, false); } catch(_) {}

        if (pos === 'BTN' && btnEl) {
            let bL = parseFloat(coords.left), bT = parseFloat(coords.top);
            if (bL < 50) bL += 5; else bL -= 5;
            if (bT < 50) bT += 5; else bT -= 5;
            btnEl.style.left = bL + '%'; btnEl.style.top = bT + '%';
        }

        let betAmount = 0;

        const openBB = getOpenSizeBB();

        // Blinds (displayed in $ via formatter)
        if (pos === 'SB') betAmount = 0.5;
        if (pos === 'BB') betAmount = 1;

        // Facing RFI: opponent opened with their random size
        if (state.scenario === 'FACING_RFI' && pos === oppPos) betAmount = getVillainOpenSize$() / BB_DOLLARS;

        // Hero opened, facing 3-bet
        if ((state.scenario === 'RFI_VS_3BET' || state.scenario === 'RFI_VS_3') ) {
            if (pos === heroPos) betAmount = openBB;
            if (pos === oppPos) {
                const villainIP = postflopIP(oppPos, heroPos);
                betAmount = (villainIP ? 3 : 4) * openBB;
            }
        }

        // Vs limpers: show limpers + BB posted
        if (state.scenario === 'VS_LIMP') {
            if (state.limperPositions && state.limperPositions.includes(pos)) betAmount = 1;
            else if (pos === oppPos) betAmount = 1;
        }

        // Squeeze: show opener size and callers matching that size
        if (state.scenario === 'SQUEEZE') {
            if (pos === state.squeezeOpener) betAmount = openBB;
            if (pos === state.squeezeCaller) betAmount = openBB;
        }
        if (state.scenario === 'SQUEEZE_2C') {
            if (pos === state.squeezeOpener) betAmount = openBB;
            if (pos === state.squeezeCaller) betAmount = openBB;
            if (pos === state.squeezeCaller2) betAmount = openBB;
        }

        if (betAmount > 0) {
            const betDiv = document.createElement('div');
            betDiv.className = 'absolute flex items-center gap-1 z-35 -translate-x-1/2 -translate-y-1/2 pointer-events-none';
            let betL = parseFloat(coords.left), betT = parseFloat(coords.top);
            const bOff = SEAT_COORDS === SEAT_COORDS_MOBILE ? 8 : 12;
            if (betL < 45) betL += bOff; else if (betL > 55) betL -= bOff;
            if (betT < 45) betT += bOff; else if (betT > 55) betT -= bOff;
            betDiv.style.left = betL + '%'; betDiv.style.top = betT + '%';
            betDiv.innerHTML = `<div style="width:var(--chip-size,16px);height:var(--chip-size,16px);" class="rounded-full bg-rose-600 border border-white/20"></div><span style="font-size:var(--chip-font,9px);" class="font-black text-yellow-400 bg-black/40 px-1 rounded">${fmt$(betAmount * BB_DOLLARS)}</span>`;
            betsLayer.appendChild(betDiv);
        }
    });
}

// Animated table sequence — positions the seats instantly, then plays the action animation
function runTableAnimation(heroPos, oppPos, scenario, onDone) {
    // Prevent overlapping animations from leaving duplicate chips/bets on screen.
    // If a new round starts while an old animation is mid-flight, the old one becomes "stale"
    // and all pending async steps abort.
    window.__tableAnimToken = (window.__tableAnimToken || 0) + 1;
    const _animToken = window.__tableAnimToken;
    const STALE = Symbol('tableAnimStale');
    const isStale = () => _animToken !== window.__tableAnimToken;


    let __doneCalled = false;

    const heroIdx = TABLE_ORDER.indexOf(heroPos);
    const btnEl = document.getElementById('dealer-button');
    // Mobile Safari can drop absolutely-positioned layers during rapid screen changes.
    try { ensureTableLayers(); } catch(_) {}
    let betsLayer = document.getElementById('bets-layer');
    let cardsLayer = document.getElementById('cards-layer');
    if (!betsLayer || !cardsLayer) {
        try { ensureTableLayers(true); } catch(_) {}
        betsLayer = document.getElementById('bets-layer');
        cardsLayer = document.getElementById('cards-layer');
    }
    if (!betsLayer || !cardsLayer) {
        console.warn('[TableAnim] Missing table layers; skipping animation');
        try { if (onDone) onDone(); } catch(e) {}
        return;
    }
    betsLayer.innerHTML = '';
    cardsLayer.innerHTML = '';

    // Position all seats, reset styles
    const seatCardEls = {};
    TABLE_ORDER.forEach((pos, i) => {
        const slotIdx = (i - heroIdx + 9) % 9;
        const coords = SEAT_COORDS[slotIdx];
        const el = document.getElementById(`seat-${pos}`);
        if (el) { el.style.left = coords.left; el.style.top = coords.top; }
        const isSqueezeOpp = (scenario === 'SQUEEZE' && (pos === state.squeezeOpener || pos === state.squeezeCaller)) || (scenario === 'SQUEEZE_2C' && (pos === state.squeezeOpener || pos === state.squeezeCaller || pos === state.squeezeCaller2));
        const isLimper = scenario === 'VS_LIMP' && state.limperPositions && state.limperPositions.includes(pos);
        if (el && pos === heroPos) el.className = `seat bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-black text-slate-300 seat-active`;
        else if (el && (isSqueezeOpp || isLimper || (pos === oppPos && scenario !== 'SQUEEZE'))) el.className = `seat border rounded-lg flex items-center justify-center font-black bg-rose-900/40 border-rose-500/50 text-rose-200`;
        else if (el) el.className = `seat bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-black text-slate-300`;
        if (pos === 'BTN') {
            let bL = parseFloat(coords.left), bT = parseFloat(coords.top);
            if (bL < 50) bL += 5; else bL -= 5;
            if (bT < 50) bT += 5; else bT -= 5;
            if (btnEl) btnEl.style.left = bL + '%'; if (btnEl) btnEl.style.top = bT + '%';
        }
    });

    const delay = (ms) => new Promise(r => setTimeout(r, ms)).then(() => { if (isStale()) throw STALE; });

    async function animate() {
        try {
        // Step 1: Deal cards to all seats with stagger
        TABLE_ORDER.forEach((pos, i) => {
            const coords = getSeatCoords(heroPos, pos);
            const isHero = pos === heroPos;
            setTimeout(() => {
                seatCardEls[pos] = placeCardBacks(cardsLayer, coords, true, false);
            }, i * 50);
        });
        await delay(TABLE_ORDER.length * 50 + 200);

        // Step 2: Post blinds with chip animation + badge
        const sbCoords = getSeatCoords(heroPos, 'SB');
        const bbCoords = getSeatCoords(heroPos, 'BB');

        if (scenario !== 'RFI_VS_3BET') {
            animateChip(betsLayer, sbCoords, 0.5, '$1');
            showActionBadge(document.getElementById('seat-SB'), 'BLIND', 'badge-blind', 600);
            await delay(200);
            animateChip(betsLayer, bbCoords, 1, '$3');
            showActionBadge(document.getElementById('seat-BB'), 'BLIND', 'badge-blind', 600);
            await delay(350);
        }

        // Step 3: Action sequence - fold positions before the raiser, then raise
        if (scenario === 'RFI') {
            // Fold everyone from UTG up to (but not including) heroPos
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
            const heroActionIdx = actionOrder.indexOf(heroPos);
            if (heroActionIdx > 0) {
                for (let k = 0; k < heroActionIdx; k++) {
                    const foldPos = actionOrder[k];
                    const foldEl = document.getElementById(`seat-${foldPos}`);
                    const cardEl = seatCardEls[foldPos];
                    foldEl.classList.add('seat-folded-state');
                    if (cardEl) { cardEl.classList.add('folding'); }
                    showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                    await delay(120);
                }
            }
            await delay(150);
        } else if (scenario === 'FACING_RFI') {
            // Fold everyone from UTG up to (not including) oppPos, then oppPos raises, then hero acts
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
            const oppActionIdx = actionOrder.indexOf(oppPos);
            const heroActionIdx = actionOrder.indexOf(heroPos);
            // Fold positions before the raiser (oppPos)
            for (let k = 0; k < oppActionIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            // Raiser raises
            const oppCoords = getSeatCoords(heroPos, oppPos);
            animateChip(betsLayer, oppCoords, getVillainOpenSize$() / BB_DOLLARS);
            showActionBadge(document.getElementById(`seat-${oppPos}`), 'RAISE ' + fmt$(getVillainOpenSize$()), 'badge-raise', 700);
            await delay(300);
            // Fold positions between raiser and hero
            for (let k = oppActionIdx + 1; k < 8; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === oppPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            await delay(150);
        } else if (scenario === 'RFI_VS_3BET') {
            // Fold everyone before hero, hero raises, fold between hero and 3bettor, 3bet
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
            const heroActionIdx = actionOrder.indexOf(heroPos);
            const oppActionIdx = actionOrder.indexOf(oppPos);
            // Fold before hero
            for (let k = 0; k < heroActionIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === oppPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            // Hero raises
            const heroCoords = getSeatCoords(heroPos, heroPos);
            animateChip(betsLayer, heroCoords, getOpenSizeBB());
            showActionBadge(document.getElementById(`seat-${heroPos}`), 'RAISE ' + fmt$(getOpenSize$()), 'badge-raise', 700);
            await delay(300);
            // Fold between hero and 3bettor
            for (let k = heroActionIdx + 1; k < 8; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === oppPos || foldPos === heroPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            await delay(150);
            // BB might fold too if oppPos is BB — but BB can 3bet, so show 3bet
            const oppCoords = getSeatCoords(heroPos, oppPos);
            animateChip(betsLayer, oppCoords, 15);
            showActionBadge(document.getElementById(`seat-${oppPos}`), '3-BET ' + bbTo$(15), 'badge-3bet', 800);
            await delay(400);
        } else if (scenario === 'VS_LIMP') {
            // Multi-limp animation: fold to first limper, each limper limps, fold between, hero acts
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
            const allLimpers = state.limperPositions || [oppPos];
            const limperSet = new Set(allLimpers);
            const firstLimperIdx = actionOrder.indexOf(allLimpers[0]);
            
            // Fold before first limper
            for (let k = 0; k < firstLimperIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || limperSet.has(foldPos)) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            
            // Process each limper and fold positions between them
            for (let li = 0; li < allLimpers.length; li++) {
                const lPos = allLimpers[li];
                const lIdx = actionOrder.indexOf(lPos);
                
                // Fold positions between previous limper and this one
                const prevIdx = li === 0 ? firstLimperIdx : actionOrder.indexOf(allLimpers[li - 1]) + 1;
                for (let k = prevIdx; k < lIdx; k++) {
                    const foldPos = actionOrder[k];
                    if (foldPos === heroPos || limperSet.has(foldPos)) continue;
                    const foldEl = document.getElementById(`seat-${foldPos}`);
                    const cardEl = seatCardEls[foldPos];
                    foldEl.classList.add('seat-folded-state');
                    if (cardEl) cardEl.classList.add('folding');
                    showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                    await delay(100);
                }
                
                // This limper limps
                const lCoords = getSeatCoords(heroPos, lPos);
                animateChip(betsLayer, lCoords, 1);
                showActionBadge(document.getElementById(`seat-${lPos}`), 'LIMP', 'badge-limp', 700);
                await delay(300);
            }
            
            // Fold between last limper and hero
            const lastLimperIdx = actionOrder.indexOf(allLimpers[allLimpers.length - 1]);
            for (let k = lastLimperIdx + 1; k < actionOrder.length; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || limperSet.has(foldPos)) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            await delay(150);
        }

        // SQUEEZE: fold to opener, opener raises, fold to caller, caller calls, fold to hero
        else if (scenario === 'SQUEEZE') {
            const opener = state.squeezeOpener;
            const caller = state.squeezeCaller;
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
            const openerIdx = actionOrder.indexOf(opener);
            const callerIdx = actionOrder.indexOf(caller);
            for (let k = 0; k < openerIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            const openerCoords = getSeatCoords(heroPos, opener);
            animateChip(betsLayer, openerCoords, getVillainOpenSize$() / BB_DOLLARS);
            showActionBadge(document.getElementById(`seat-${opener}`), 'RAISE ' + fmt$(getVillainOpenSize$()), 'badge-raise', 700);
            await delay(300);
            for (let k = openerIdx + 1; k < callerIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === opener) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            const callerCoords = getSeatCoords(heroPos, caller);
            animateChip(betsLayer, callerCoords, getVillainOpenSize$() / BB_DOLLARS);
            showActionBadge(document.getElementById(`seat-${caller}`), 'CALL', 'badge-call', 700);
            await delay(300);
            for (let k = callerIdx + 1; k < actionOrder.length; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === opener || foldPos === caller) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            await delay(150);
        }

        // SQUEEZE_2C: fold to opener, opener raises, fold to caller1, caller1 calls, fold to caller2, caller2 calls, fold to hero
        else if (scenario === 'SQUEEZE_2C') {
            const opener = state.squeezeOpener;
            const c1 = state.squeezeCaller;
            const c2 = state.squeezeCaller2;
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
            const openerIdx = actionOrder.indexOf(opener);
            const c1Idx = actionOrder.indexOf(c1);
            const c2Idx = actionOrder.indexOf(c2);
            // Fold before opener
            for (let k = 0; k < openerIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            // Opener raises
            animateChip(betsLayer, getSeatCoords(heroPos, opener), getVillainOpenSize$() / BB_DOLLARS);
            showActionBadge(document.getElementById(`seat-${opener}`), 'RAISE ' + fmt$(getVillainOpenSize$()), 'badge-raise', 700);
            await delay(300);
            // Fold between opener and caller1
            for (let k = openerIdx + 1; k < c1Idx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === opener) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            // Caller1 calls
            animateChip(betsLayer, getSeatCoords(heroPos, c1), getVillainOpenSize$() / BB_DOLLARS);
            showActionBadge(document.getElementById(`seat-${c1}`), 'CALL', 'badge-call', 700);
            await delay(300);
            // Fold between caller1 and caller2
            for (let k = c1Idx + 1; k < c2Idx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === opener || foldPos === c1) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            // Caller2 calls
            animateChip(betsLayer, getSeatCoords(heroPos, c2), getVillainOpenSize$() / BB_DOLLARS);
            showActionBadge(document.getElementById(`seat-${c2}`), 'CALL', 'badge-call', 700);
            await delay(300);
            // Fold between caller2 and hero
            for (let k = c2Idx + 1; k < actionOrder.length; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === opener || foldPos === c1 || foldPos === c2) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            await delay(150);
        }
        if (onDone && !isStale()) { __doneCalled = true; onDone(); }
        } catch (e) {
            if (e === STALE) return; // silently abort stale animations
            console.error(e);
        } finally {
            if (!__doneCalled && !isStale()) {
                try { if (onDone) onDone(); } catch(_e) {}
            }
        }
    }

    animate();
}

function renderHand(handKey) {
    const r1 = handKey[0], r2 = handKey[1], type = handKey[2] || '';
    const suits = ['♠','♥','♣','♦'];
    const s1 = suits[Math.floor(Math.random()*4)];
    let s2 = type === 's' ? s1 : suits.filter(s => s !== s1)[Math.floor(Math.random()*3)];
    const color = (s) => (s === '♥' || s === '♦') ? 'text-rose-600' : 'text-slate-900';
    const card = (r, s) => `
        <div class="hero-card-wrapper" style="width:var(--hero-card-w, 64px);height:var(--hero-card-h, 96px);">
            <div class="hero-card-inner" style="width:100%;height:100%;">
                <div class="hero-card-back-face"></div>
                <div class="hero-card-front card-display flex flex-col items-center" style="width:100%;height:100%;">
                    <div class="h-1/2 w-full flex items-end justify-center pb-1"><span class="font-black leading-none ${color(s)}" style="font-size:var(--hero-rank-size, 32px);">${r}</span></div>
                    <div class="h-1/2 w-full flex items-start justify-center pt-1"><span class="leading-none ${color(s)}" style="font-size:var(--hero-suit-size, 28px);">${s}</span></div>
                </div>
            </div>
        </div>`;
    document.getElementById('hand-display').innerHTML = card(r1, s1) + card(r2, s2);
}

// Show card backs (placeholder) immediately
function renderHeroCardBacks() {
    const card = `
        <div class="hero-card-wrapper" style="width:var(--hero-card-w, 64px);height:var(--hero-card-h, 96px);">
            <div class="hero-card-inner" style="width:100%;height:100%;">
                <div class="hero-card-back-face"></div>
                <div class="hero-card-front card-display flex flex-col items-center" style="width:100%;height:100%;"></div>
            </div>
        </div>`;
    document.getElementById('hand-display').innerHTML = card + card;
}

// Flip hero cards from back to face
function flipHeroCards() {
    const cards = document.querySelectorAll('#hand-display .hero-card-inner');
    cards.forEach((c, i) => {
        setTimeout(() => c.classList.add('flipped'), i * 100);
    });
}


// ==============================
// Live $1/$3 visual bet sizing (display-only)
// ==============================
const STAKES = { SB: 1, BB: 3 };
const BB_DOLLARS = 3; // 1bb = $3

function roundLiveDollars(n) {
// Under $30: nearest $1. $30+: nearest $5 (live realism).
if (!isFinite(n)) return n;
if (n < 30) return Math.round(n);
return Math.round(n / 5) * 5;
}

function fmt$(n) {
const v = roundLiveDollars(n);
return `$${v}`;
}

// --- Hero bet slide animation (visual-only) ---
function _heroSeatPct(pos){
const el = document.getElementById(`seat-${pos}`);
if(!el) return null;
const l = parseFloat(el.style.left);
const t = parseFloat(el.style.top);
if (Number.isNaN(l) || Number.isNaN(t)) return null;
return {left:l, top:t};
}
function _betTargetFromSeatPct(seat, pos){
let betL = seat.left, betT = seat.top;
const isMob = (SEAT_COORDS === SEAT_COORDS_MOBILE);
const bOff = isMob ? 12 : 16;
if (betL < 45) betL += bOff; else if (betL > 55) betL -= bOff;
if (betT < 45) betT += bOff; else if (betT > 55) betT -= bOff;

if (seat.top > (isMob ? 80 : 84)) betT -= (isMob ? 10 : 12);
if (seat.top < (isMob ? 12 : 10)) betT += (isMob ? 8 : 10);

if (seat.left < (isMob ? 8 : 6)) betL += (isMob ? 10 : 12);
if (seat.left > (isMob ? 92 : 94)) betL -= (isMob ? 10 : 12);

if (typeof BET_JITTER !== 'undefined' && pos && BET_JITTER[pos] != null) betL += BET_JITTER[pos];

const minL = isMob ? 10 : 8, maxL = isMob ? 90 : 92;
const minT = isMob ? 12 : 10, maxT = isMob ? 88 : 90;
betL = Math.max(minL, Math.min(maxL, betL));
betT = Math.max(minT, Math.min(maxT, betT));
return {left: betL, top: betT};
}
function animateHeroBetDollars(amountDollars){
try{
const betsLayer = document.getElementById('bets-layer');
if(!betsLayer) return;
const seat = _heroSeatPct(state.currentPos);
if(!seat) return;

const target = _betTargetFromSeatPct(seat, state.currentPos);

// start slightly "in front" of hero (toward table center)
const start = {
    left: seat.left + (target.left - seat.left) * 0.35,
    top:  seat.top  + (target.top  - seat.top)  * 0.35
};

const existing = document.getElementById('hero-bet-anim');
if(existing && existing.parentNode) existing.parentNode.removeChild(existing);

const betDiv = document.createElement('div');
betDiv.id = 'hero-bet-anim';
betDiv.className = 'hero-bet-anim';
betDiv.style.left = start.left + '%';
betDiv.style.top = start.top + '%';
betDiv.innerHTML = `<div style="width:var(--chip-size,16px);height:var(--chip-size,16px);" class="rounded-full bg-indigo-500 border border-white/20"></div>
    <span style="font-size:var(--chip-font,9px);" class="font-black text-yellow-400 bg-black/40 px-1 rounded">${fmt$(amountDollars)}</span>`;
betsLayer.appendChild(betDiv);

requestAnimationFrame(() => {
    betDiv.classList.add('show');
    betDiv.style.left = target.left + '%';
    betDiv.style.top = target.top + '%';
});

setTimeout(() => {
    if(betDiv && betDiv.parentNode){
        betDiv.style.opacity = '0';
        setTimeout(() => { if(betDiv.parentNode) betDiv.parentNode.removeChild(betDiv); }, 220);
    }
}, 850);
} catch(e) { /* no-op */ }
}

function computeHeroBetDollarsForAction(action){
const open$ = getOpenSize$();

// RFI tree
if (state.scenario === 'RFI' && action === 'RAISE') return open$;

// Facing RFI tree
if (state.scenario === 'FACING_RFI' && action === '3BET') return get3betSize$(state.currentPos, state.oppPos, getVillainOpenSize$());

// Vs limpers (action is 'ISO' from renderButtons)
if (state.scenario === 'VS_LIMP' && (action === 'ISO' || action === 'RAISE')) {
const limpers = (state.limperPositions && Array.isArray(state.limperPositions)) ? state.limperPositions.length : (state.numLimpers || 1);
return getIsoSize$(limpers);
}

// Squeeze scenarios (your app uses separate scenario keys for 1 or 2 callers)
if ((state.scenario === 'SQUEEZE' || state.scenario === 'SQUEEZE_1C') && action === 'SQUEEZE') return getSqueezeSize$(state.currentPos, state.squeezeOpener, 1);
if (state.scenario === 'SQUEEZE_2C' && action === 'SQUEEZE') return getSqueezeSize$(state.currentPos, state.squeezeOpener, 2);

if ((state.scenario === 'RFI_VS_3BET' || state.scenario === 'RFI_VS_3') && action === '4BET') return get4betSize$(state.currentPos, state.oppPos);

// Push/fold shove
if (state.scenario === 'PUSH_FOLD' && action === 'SHOVE') {
return (state.stackBB || 10) * BB_DOLLARS;
}

return null;
}

function bbTo$(bb) {
return fmt$(bb * BB_DOLLARS);
}

function postflopIP(heroPos, oppPos) {
// Postflop order in holdem: SB, BB, then UTG..BTN. Later in this order = IP.
const ORDER = ['SB','BB','UTG','UTG1','UTG2','LJ','HJ','CO','BTN'];
return ORDER.indexOf(heroPos) > ORDER.indexOf(oppPos);
}

function getOpenSize$() { return (state && state.config && state.config.openSize) ? state.config.openSize : 15; } // reads from config
function getOpenSizeBB() { return getOpenSize$() / BB_DOLLARS; } // = 5bb

// Villain open size: randomized per-hand from a realistic 1/3 pool.
// Pool weighted toward $15 (most common), but includes the full range you'll face.
// 1/3 live open distribution: $6 min-raise (rare), $10-12 tight, $15 standard (most common), $17-18 occasional, $20 splashy (uncommon), $25 very rare
const VILLAIN_OPEN_POOL = [6, 10, 12, 12, 15, 15, 15, 15, 15, 15, 17, 18, 20, 25];
function pickVillainOpenSize() {
return VILLAIN_OPEN_POOL[Math.floor(Math.random() * VILLAIN_OPEN_POOL.length)];
}
function getVillainOpenSize$() {
return (state && state.villainOpenSize) ? state.villainOpenSize : 15;
}

function getIsoSize$(numLimpers) {
// Iso = 5bb + 1bb per limper
const bb = 5 + (numLimpers || 0);
return bb * BB_DOLLARS;
}


function get4betSize$(heroPos, villainPos){
const open$ = getOpenSize$();
const threeBet$ = get3betSize$(villainPos, heroPos); // villain 3-bet size vs hero open
const heroIP = postflopIP(heroPos, villainPos);
const mult = heroIP ? 2.2 : 2.5;
return roundLiveDollars(threeBet$ * mult);
}
function get3betSize$(heroPos, oppPos, openOverride) {
const open = openOverride !== undefined ? openOverride : getOpenSize$();
const isIP = postflopIP(heroPos, oppPos);
const mult = isIP ? 3.0 : 4.0; // IP: 3× open, OOP: 4× open
return open * mult;
}

function getSqueezeSize$(heroPos, openerPos, numCallers, openOverride) {
const open = openOverride !== undefined ? openOverride : getOpenSize$();
const isIP = postflopIP(heroPos, openerPos);
const base = isIP ? 3.5 : 4.5;
const callers = numCallers || 0;
return open * (base + callers * 1.0);
}

function buttonLabelWithHint(main, hint) {
return main; // hint rendered below buttons
}

function setSizingHint(text) {
const el = document.getElementById('sizing-hint-line');
if (!el) return;
el.textContent = text || '';
}

function renderButtons(hidden) {
const container = document.getElementById('action-buttons');
setSizingHint('');
const stateClass = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
const btnStyle = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;

// Compute sizing context (display only)
const open$ = getOpenSize$();
const openBB = getOpenSizeBB();
const limpers = (state.limperPositions && Array.isArray(state.limperPositions)) ? state.limperPositions.length : 1;

if (state.scenario === 'RFI') {
const raiseMain = `RAISE TO ${fmt$(open$)}`;
const raiseHint = `Open: 5bb (${openBB.toFixed(0)}bb)`;
setSizingHint(raiseHint);
container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="bg-slate-800 border border-slate-600 rounded-2xl font-black text-slate-300">FOLD</button>
    <button onclick="handleInput('RAISE')" ${btnStyle} class="bg-indigo-600 rounded-2xl font-black text-white shadow-lg">${raiseMain}</button>
</div>`;
} else if (state.scenario === 'FACING_RFI') {
const villainOpen$ = getVillainOpenSize$();
const threeBet$ = get3betSize$(state.currentPos, state.oppPos, villainOpen$);
const isIP = postflopIP(state.currentPos, state.oppPos);
const threeMain = `3-BET TO ${fmt$(threeBet$)}`;
const threeHint = isIP ? `IP 3-bet: 3× open (${fmt$(villainOpen$)})` : `OOP 3-bet: 4× open (${fmt$(villainOpen$)})`;
setSizingHint(threeHint);
container.innerHTML = `<div class="grid grid-cols-3 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="bg-slate-800 border border-slate-600 rounded-2xl font-black text-slate-300">FOLD</button>
    <button onclick="handleInput('CALL')" ${btnStyle} class="bg-emerald-700 rounded-2xl font-black text-white shadow-lg">CALL</button>
    <button onclick="handleInput('3BET')" ${btnStyle} class="bg-indigo-600 rounded-2xl font-black text-white shadow-lg">${threeMain}</button>
</div>`;
} else if (state.scenario === 'VS_LIMP') {
const isBB = state.currentPos === 'BB';
const isSB = state.currentPos === 'SB';

const passiveLabel = isBB ? 'CHECK' : isSB ? 'COMPLETE' : 'LIMP';
const raiseAction = 'ISO';
const raiseLabel = (isSB || isBB) ? 'RAISE' : 'ISO RAISE';

const iso$ = getIsoSize$(limpers);
const isoMain = `${raiseLabel} TO ${fmt$(iso$)}`;
const isoHint = `Iso: 5bb + 1bb/limper (${limpers} limper${limpers===1?'':'s'})`;
setSizingHint(isoHint);

container.innerHTML = `<div class="grid grid-cols-3 gap-3 ${stateClass}">
    <button onclick="handleInput('${isBB ? 'OVERLIMP' : 'FOLD'}')" ${btnStyle} class="bg-slate-800 border border-slate-600 rounded-2xl font-black text-slate-300">${isBB ? 'CHECK' : 'FOLD'}</button>
    ${isBB ? '' : `<button onclick="handleInput('OVERLIMP')" ${btnStyle} class="bg-cyan-700 rounded-2xl font-black text-white shadow-lg">${passiveLabel}</button>`}
    <button onclick="handleInput('${raiseAction}')" ${btnStyle} class="bg-orange-600 rounded-2xl font-black text-white shadow-lg ${isBB ? 'col-span-2' : ''}">${isoMain}</button>
</div>`;
} else if (state.scenario === 'SQUEEZE' || state.scenario === 'SQUEEZE_2C') {
const callers = (state.scenario === 'SQUEEZE_2C') ? 2 : 1;
const opener = state.squeezeOpener || state.oppPos; // opener seat if tracked
const villainOpen$ = getVillainOpenSize$();
const squeeze$ = getSqueezeSize$(state.currentPos, opener, callers, villainOpen$);
const isIP = postflopIP(state.currentPos, opener);
const main = `SQUEEZE TO ${fmt$(squeeze$)}`;
const hint = isIP ? `IP squeeze: 3.5× + 1×/caller off ${fmt$(villainOpen$)} open` : `OOP squeeze: 4.5× + 1×/caller off ${fmt$(villainOpen$)} open`;
setSizingHint(hint);

container.innerHTML = `<div class="grid grid-cols-3 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="bg-slate-800 border border-slate-600 rounded-2xl font-black text-slate-300">FOLD</button>
    <button onclick="handleInput('CALL')" ${btnStyle} class="bg-emerald-700 rounded-2xl font-black text-white shadow-lg">CALL</button>
    <button onclick="handleInput('SQUEEZE')" ${btnStyle} class="bg-red-600 rounded-2xl font-black text-white shadow-lg">${main}</button>
</div>`;

} else if (state.scenario === 'RFI_VS_3BET' || state.scenario === 'RFI_VS_3') {
// Defending vs a 3-bet after we opened: Fold / Call / 4-bet (display-only sizing)
const threeBet$ = get3betSize$(state.oppPos, state.currentPos); // villain 3-bet size vs our open
const heroIP = postflopIP(state.currentPos, state.oppPos);
const fourBet$ = get4betSize$(state.currentPos, state.oppPos);
const hint = heroIP ? `IP 4-bet: 2.2× 3-bet (${fmt$(threeBet$)})` : `OOP 4-bet: 2.5× 3-bet (${fmt$(threeBet$)})`;
setSizingHint(hint);

container.innerHTML = `<div class="grid grid-cols-3 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="bg-slate-800 border border-slate-600 rounded-2xl font-black text-slate-300">FOLD</button>
    <button onclick="handleInput('CALL')" ${btnStyle} class="bg-emerald-700 rounded-2xl font-black text-white shadow-lg">CALL</button>
    <button onclick="handleInput('4BET')" ${btnStyle} class="bg-indigo-600 rounded-2xl font-black text-white shadow-lg">4-BET TO ${fmt$(fourBet$)}</button>
</div>`;

} else if (state.scenario === 'PUSH_FOLD') {
const bb$ = (state.stackBB || 10) * 3; // approx $ at 1/3
setSizingHint(`Shoving ${state.stackBB}BB (~$${bb$} at 1/3)`);
container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="bg-slate-800 border border-slate-600 rounded-2xl font-black text-slate-300">FOLD</button>
    <button onclick="handleInput('SHOVE')" ${btnStyle} class="bg-rose-600 rounded-2xl font-black text-white shadow-lg">ALL IN</button>
</div>`;
} else {
container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="bg-slate-800 border border-slate-600 rounded-2xl font-black text-slate-300">FOLD</button>
    <button onclick="handleInput('RAISE')" ${btnStyle} class="bg-indigo-600 rounded-2xl font-black text-white shadow-lg">RAISE</button>
</div>`;
}
}


// Reveal the action buttons (swap hidden -> revealed)
function revealButtons() {
    const grid = document.querySelector('#action-buttons > div');
    if (grid) {
        grid.classList.remove('action-buttons-hidden');
        grid.classList.add('action-buttons-revealed');
    }
}

function checkRangeHelper(hand, list) {
    if (!list) return false;
    const r1 = hand[0], r2 = hand[1], type = hand[2] || ''; // type: '' = pair, 's' = suited, 'o' = offsuit
    const ri1 = RANKS.indexOf(r1), ri2 = RANKS.indexOf(r2);

    for (let item of list) {
        // Exact match
        if (item === hand) return true;

        // "AK" shorthand (no suffix) = matches AKs and AKo
        if (item.length === 2 && !item.endsWith('+')) {
            const ir1 = item[0], ir2 = item[1];
            if (r1 === ir1 && r2 === ir2 && r1 !== r2) return true;
        }

        // "XX+" — pairs (e.g. QQ+) or suited/offsuit (e.g. ATs+)
        if (item.endsWith('+')) {
            const base = item.slice(0, -1);
            const bSuffix = base.endsWith('s') ? 's' : base.endsWith('o') ? 'o' : '';
            const bR1 = base[0], bR2 = base[1];
            const bRi1 = RANKS.indexOf(bR1), bRi2 = RANKS.indexOf(bR2);

            if (bR1 === bR2 && bSuffix === '') {
                // Pair range: e.g. QQ+ means QQ and above
                if (r1 === r2 && type === '' && ri1 <= bRi1) return true;
            } else if (bSuffix === 's') {
                // Suited: e.g. ATs+ means ATs, AJs, AQs, AKs
                if (type === 's' && r1 === bR1 && ri2 <= bRi2) return true;
            } else if (bSuffix === 'o') {
                // Offsuit: e.g. ATo+
                if (type === 'o' && r1 === bR1 && ri2 <= bRi2) return true;
            } else {
                // No suffix, two different ranks: "AK+" matches AKs+AKo
                if (r1 === bR1 && r2 === bR2 && ri2 <= bRi2) return true;
            }
        }

        // "XX-YY" — ranges (e.g. JJ-77, ATs-A8s, AJo-ATo)
        if (item.includes('-') && !item.endsWith('+')) {
            const dashIdx = item.indexOf('-');
            const s = item.slice(0, dashIdx);
            const e = item.slice(dashIdx + 1);
            const sSuffix = s.endsWith('s') ? 's' : s.endsWith('o') ? 'o' : '';
            const eSuffix = e.endsWith('s') ? 's' : e.endsWith('o') ? 'o' : '';
            const sR1 = s[0], sR2 = s[1];
            const eR1 = e[0], eR2 = e[1];
            const sRi1 = RANKS.indexOf(sR1), sRi2 = RANKS.indexOf(sR2);
            const eRi1 = RANKS.indexOf(eR1), eRi2 = RANKS.indexOf(eR2);

            if (sR1 === sR2 && sSuffix === '' && eR1 === eR2 && eSuffix === '') {
                // Pair range: e.g. JJ-77
                if (r1 === r2 && type === '' && ri1 >= sRi1 && ri1 <= eRi1) return true;
            } else if (sSuffix === 's' && eSuffix === 's' && sR1 === eR1) {
                // Suited kicker range: e.g. ATs-A8s
                if (type === 's' && r1 === sR1 && ri2 >= sRi2 && ri2 <= eRi2) return true;
            } else if (sSuffix === 'o' && eSuffix === 'o' && sR1 === eR1) {
                // Offsuit kicker range: e.g. AJo-ATo
                if (type === 'o' && r1 === sR1 && ri2 >= sRi2 && ri2 <= eRi2) return true;
            } else if (sSuffix === '' && eSuffix === '' && sR1 !== sR2) {
                // No suffix range: e.g. "AK-AJ" matches AKs, AKo, AQs, AQo, AJs, AJo
                if (r1 === sR1 && ri2 >= sRi2 && ri2 <= eRi2) return true;
            }
        }
    }
    return false;
}

// Store chart context so bucket toggle can re-render
let _chartCtx = { pos: null, target: null, scenario: null, oppPos: null };

function showChart(pos, target, scenario, oppPos) {
    _chartCtx = { pos, target, scenario, oppPos };
    _renderChart(pos, target, scenario, oppPos);
    document.getElementById('chart-modal').classList.remove('hidden');
}


// === "WHY" EXPLANATIONS for chart modal ===
// Returns a short explanation string for the correct action given hand/scenario/position context.
// Covers edge cases and common confusions — empty string for trivial/obvious situations.
function getWhyText(hand, correctAction, scenario, heroPos, oppPos) {
    const r1 = hand[0], r2 = hand[1], suited = hand[2] === 's', pair = r1 === r2;
    const RANKS_STR = 'AKQJT98765432';
    const rank = r => RANKS_STR.indexOf(r);
    const topRank = rank(r1); // lower index = higher rank
    const isIP = postflopIP(heroPos, oppPos);
    const posLabel = p => POS_LABELS[p] || p;

    // Helper: is this hand a blocker hand (Ax suited/offsuit)?
    const isAx = r1 === 'A' && !pair;
    const isSuited = suited && !pair;
    const isBroadway = !pair && rank(r1) <= 4 && rank(r2) <= 4; // T or better on both
    const isConnector = !pair && Math.abs(rank(r1) - rank(r2)) === 1;
    const isOneGapper = !pair && Math.abs(rank(r1) - rank(r2)) === 2;
    const highRank = Math.min(rank(r1), rank(r2)); // smaller index = stronger

    if (scenario === 'RFI') {
        if (correctAction === 'RAISE') {
            if (pair && rank(r1) >= 6) return `Small pairs have set-mining value — open from ${posLabel(heroPos)} and get stacks in on the flop.`;
            if (isAx && suited && rank(r2) >= 5) return `Ax suited hands have strong equity + nut flush potential — always open from ${posLabel(heroPos)}.`;
            if (isSuited && isConnector) return `Suited connectors make straights and flushes — worth opening from ${posLabel(heroPos)} for their multiway potential.`;
            if (isBroadway) return `Broadway hands dominate calling ranges and have strong showdown value.`;
            return ''; // don't explain obvious opens
        } else { // FOLD
            if (isSuited && isConnector) return `${hand} is too weak to open from ${posLabel(heroPos)} — the range is tight here. Wait for better spots.`;
            if (pair) return `${hand} is marginal from ${posLabel(heroPos)} — not enough equity to profitably open this early.`;
            if (isAx && !suited) return `Weak offsuit Ax hands are dominated too often from ${posLabel(heroPos)} — fold and wait for suited or better kickers.`;
            return `${hand} doesn't have enough raw equity or playability to open from ${posLabel(heroPos)}.`;
        }
    }

    if (scenario === 'FACING_RFI') {
        const opener = posLabel(oppPos);
        const pos = posLabel(heroPos);
        if (correctAction === '3BET') {
            if (pair && rank(r1) <= 2) return `${hand} is a value 3-bet — you have near-top equity. Charge ${opener} to continue.`;
            if (isAx && suited && rank(r2) <= 3) return `A5s–A2s are classic 3-bet bluffs — they block the villain's 4-bet range (AA) and have good equity when called.`;
            if (isAx && suited) return `Strong Ax suited hands are 3-bet value from ${pos} — great equity vs ${opener}'s range and builds pots in position.`;
            if (isBroadway && suited) return `${hand} is a thin 3-bet — strong enough for value, blocks villain's best broadway combos.`;
            return `${hand} 3-bets here for value — your hand dominates ${opener}'s continuing range.`;
        } else if (correctAction === 'CALL') {
            if (pair && rank(r1) >= 5 && rank(r1) <= 8) return `Medium pairs — too strong to fold, not strong enough to 3-bet. Call and set-mine or play fit-or-fold.`;
            if (pair && rank(r1) > 8) return `Small pairs play best as calls vs ${opener} — you want to see a cheap flop and hit your set.`;
            if (isSuited && (isConnector || isOneGapper)) return `${hand} has good implied odds when called — suited rundowns flop well multiway and disguise their strength.`;
            if (isAx && suited) return `${hand} calls here — strong enough to continue but not the nut 3-bet hand from this position.`;
            if (isBroadway) return `${hand} has good equity and dominates ${opener}'s weaker broadway hands — flat and realize that equity.`;
            return `${hand} is a call vs ${opener} — good equity to continue but not strong enough to repot.`;
        } else { // FOLD
            if (isSuited && isConnector) return `${hand} is a fold vs ${opener} — too weak to 3-bet profitably and implied odds aren't there out of position.`;
            if (isAx && !suited) return `Weak offsuit Ax folds vs ${opener} — you'll often be dominated and have no backdoor equity.`;
            if (pair && rank(r1) >= 9) return `${hand} is a fold — too small to set-mine profitably here and not good enough to 3-bet.`;
            return `${hand} doesn't have enough equity or playability to continue vs ${opener}'s opening range.`;
        }
    }

    if (scenario === 'RFI_VS_3BET') {
        const threeBettor = posLabel(oppPos);
        if (correctAction === '4BET') {
            if (pair && rank(r1) <= 2) return `${hand} is a 4-bet for value — you have near-nuts. Get it in.`;
            if (isAx && suited && rank(r2) >= 4) return `A5s–A3s are 4-bet bluffs — they block AA (reducing villain's value combos) and have decent equity if called.`;
            if (isAx && !suited && rank(r2) >= 5) return `Ax offsuit 4-bets as a bluff here — blocks AA combos and folds out hands that have you beat.`;
            return `${hand} 4-bets for value vs ${threeBettor}'s 3-bet range.`;
        } else if (correctAction === 'CALL') {
            if (pair) return `${hand} calls the 3-bet — set-mining odds are good at these depths, and you avoid flipping against a tight 4-bet range.`;
            if (isBroadway && suited) return `${hand} has strong equity vs ${threeBettor}'s 3-bet range — call and realize equity ${isIP ? 'in position' : 'with your hand strength'}.`;
            if (isSuited && (isConnector || isOneGapper)) return `${hand} has the implied odds to call a 3-bet — you flop well and can stack villain on good boards.`;
            return `${hand} calls here — strong enough to continue, not strong enough to 4-bet without blockers.`;
        } else { // FOLD
            if (isSuited && isConnector) return `${hand} folds to the 3-bet — implied odds aren't there at these stack depths${isIP ? '' : ' out of position'}.`;
            if (isAx && !suited) return `Weak offsuit Ax folds vs a 3-bet — you don't block enough and the equity vs a 3-bet range is thin.`;
            return `${hand} isn't strong enough to continue vs ${threeBettor}'s 3-bet — fold and wait for better spots.`;
        }
    }

    if (scenario === 'VS_LIMP') {
        const isBlinds = heroPos === 'SB' || heroPos === 'BB';
        if (correctAction === 'ISO' || correctAction === 'RAISE') {
            if (pair && rank(r1) <= 4) return `${hand} iso-raises to thin the field and build a pot — you have strong equity and don't want multiway action.`;
            if (isBroadway) return `${hand} iso-raises — strong hand that plays best heads-up or short-handed, not multiway.`;
            if (isAx && suited) return `${hand} iso-raises — nut flush potential plus strong equity heads-up.`;
            return `${hand} is strong enough to iso-raise — take initiative and build the pot with a quality hand.`;
        } else if (correctAction === 'OVERLIMP') {
            if (pair && rank(r1) >= 5) return `${hand} overlimps for set value — good implied odds in a multiway pot, no need to iso with a medium pair.`;
            if (isSuited && (isConnector || isOneGapper)) return `${hand} overlimps — suited rundowns want to see cheap multiway flops where they can make disguised straights and flushes.`;
            return `${hand} calls — good multiway value but not strong enough to iso-raise and play heads-up.`;
        } else { // FOLD
            if (!isBlinds) return `${hand} folds — not worth investing even a limp with this hand from ${posLabel(heroPos)}.`;
            return `${hand} folds — even in the blinds, this hand doesn't play well enough multiway.`;
        }
    }

    if (scenario === 'SQUEEZE' || scenario === 'SQUEEZE_2C') {
        const numCallers = scenario === 'SQUEEZE_2C' ? 2 : 1;
        if (correctAction === 'SQUEEZE') {
            if (pair && rank(r1) <= 3) return `${hand} squeezes for value — your hand dominates. More callers = more dead money.`;
            if (isAx && suited && rank(r2) >= 4) return `${hand} is a squeeze bluff — blocks AA/AK combos, and if called you have nut-flush outs.`;
            return `${hand} squeezes — ${numCallers > 1 ? 'two callers means more dead money and' : ''} your hand has strong enough equity to pile it in.`;
        } else if (correctAction === 'CALL') {
            return `${hand} calls — your hand plays well multiway but isn't strong enough to repot vs the opener and ${numCallers} caller${numCallers > 1 ? 's' : ''}.`;
        } else {
            return `${hand} folds — squeezing requires a strong hand or great blocker. This hand has neither here.`;
        }
    }

    return ''; // fallback: no explanation
}

function _renderChart(pos, target, scenario, oppPos) {
    let html = '';
    const legendEl = document.getElementById('chart-legend');
    const bucketToggle = document.getElementById('chart-bucket-toggle');

    // "Why" explanation — only shown when called after a wrong answer (target is the missed hand)
    const whyEl = document.getElementById('chart-why-text');
    if (whyEl && target) {
        try {
            const effOpp = (scenario === 'VS_LIMP') ? `${oppPos}|${state.limperBucket}` : oppPos;
const correctAction = EdgeWeight.getCorrectAction(target, scenario, pos, effOpp);
const why = getWhyText(target, correctAction, scenario, pos, effOpp);
            if (why) {
                whyEl.textContent = why;
                whyEl.classList.remove('hidden');
            } else {
                whyEl.textContent = '';
                whyEl.classList.add('hidden');
            }
        } catch(e) {
            whyEl.textContent = '';
            whyEl.classList.add('hidden');
        }
    } else if (whyEl) {
        whyEl.textContent = '';
        whyEl.classList.add('hidden');
    }
    
    if (scenario === 'RFI') {
        legendEl.innerHTML = `<div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-indigo-600 rounded"></div><span>Raise</span></div>`;
    } else if (scenario === 'VS_LIMP') {
        const lData = getLimpDataForBucket(pos, oppPos, state.limperBucket) || allFacingLimps[`${pos}_vs_${oppPos}_Limp`];
        const isBB = lData && isLimpBBSpot(lData);
        const isBlinds = lData && isLimpBlindSpot(lData);
        const rLabel = isBlinds ? 'Raise' : 'Iso Raise';
        const pLabel = isBB ? 'Check' : isBlinds ? 'Complete' : 'Overlimp';
        legendEl.innerHTML = `<div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-orange-600 rounded"></div><span>${rLabel}</span></div><div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-cyan-700 rounded"></div><span>${pLabel}</span></div>`;
    } else if (scenario === 'SQUEEZE' || scenario === 'SQUEEZE_2C') {
        legendEl.innerHTML = `<div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-red-600 rounded"></div><span>Squeeze</span></div><div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-red-600 rounded sq-bluff-stripe"></div><span>Squeeze (Bluff)</span></div><div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-emerald-600 rounded"></div><span>Call</span></div>`;
    } else {
        const label1 = scenario === 'RFI_VS_3BET' ? '4-Bet' : '3-Bet';
        legendEl.innerHTML = `<div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-indigo-600 rounded"></div><span>${label1}</span></div><div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-emerald-600 rounded"></div><span>Call</span></div>`;
    }

    // Bucket toggle for VS_LIMP
    if (scenario === 'VS_LIMP') {
        const buckets = ['1L', '2L', '3P'];
        const labels = { '1L': '1 Limper', '2L': '2 Limpers', '3P': '3+ Limpers' };
        bucketToggle.classList.remove('hidden');
        bucketToggle.innerHTML = buckets.map(b => {
            const sel = b === state.limperBucket;
            return `<button onclick="switchChartBucket('${b}')" class="px-3 py-1 rounded-full text-[9px] font-bold transition-all ${sel ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}">${labels[b]}</button>`;
        }).join('');
    } else {
        bucketToggle.classList.add('hidden');
        bucketToggle.innerHTML = '';
    }

    for (let i = 0; i < 13; i++) {
        for (let j = 0; j < 13; j++) {
            const r1 = RANKS[i], r2 = RANKS[j];
            let hKey = (i === j) ? r1 + r2 : (i < j ? r1 + r2 + 's' : r2 + r1 + 'o');
            let bg = 'bg-slate-800';
            if (scenario === 'RFI') {
                if (checkRangeHelper(hKey, rfiRanges[pos])) bg = 'bg-indigo-600';
            } else if (scenario === 'FACING_RFI') {
                const d = facingRfiRanges[`${pos}_vs_${oppPos}`];
                if (checkRangeHelper(hKey, d["3-bet"])) bg = 'bg-indigo-600';
                else if (checkRangeHelper(hKey, d["Call"])) bg = 'bg-emerald-600';
            } else if (scenario === 'VS_LIMP') {
                const d = getLimpDataForBucket(pos, oppPos, state.limperBucket) || allFacingLimps[`${pos}_vs_${oppPos}_Limp`];
                if (d && checkRangeHelper(hKey, getLimpRaise(d))) bg = 'bg-orange-600';
                else if (d && checkRangeHelper(hKey, getLimpPassive(d))) bg = 'bg-cyan-700';
            } else if (scenario === 'SQUEEZE') {
                const d = squeezeRanges[oppPos];
                if (d && checkRangeHelper(hKey, d["Squeeze"])) { bg = 'bg-red-600'; if (isSqueezeBluff(hKey, d)) bg = 'bg-red-600 sq-bluff-stripe'; }
                else if (d && d["Call"] && checkRangeHelper(hKey, d["Call"])) bg = 'bg-emerald-600';
            } else if (scenario === 'SQUEEZE_2C') {
                const d = squeezeVsRfiTwoCallers[oppPos];
                if (d && checkRangeHelper(hKey, d["Squeeze"])) { bg = 'bg-red-600'; if (isSqueezeBluff(hKey, d)) bg = 'bg-red-600 sq-bluff-stripe'; }
                else if (d && d["Call"] && checkRangeHelper(hKey, d["Call"])) bg = 'bg-emerald-600';
            } else {
                const d = rfiVs3BetRanges[`${pos}_vs_${oppPos}`];
                if (checkRangeHelper(hKey, d["4-bet"])) bg = 'bg-indigo-600';
                else if (checkRangeHelper(hKey, d["Call"])) bg = 'bg-emerald-600';
            }
            const ring = target ? (hKey === target ? 'ring-[3px] ring-white z-10 scale-110 shadow-xl' : 'opacity-50') : '';
            html += `<div class="aspect-square flex items-center justify-center rounded-[2px] text-[5px] sm:text-[7px] font-black ${bg} ${ring} text-white/95">${hKey}</div>`;
        }
    }
    document.getElementById('chart-container').innerHTML = html;

    // Position label
    if (scenario === 'SQUEEZE') {
        const p = parseSqueezeKey(oppPos);
        document.getElementById('chart-pos-label').innerText = p ? `${POS_LABELS[p.hero]} vs ${POS_LABELS[p.opener]} open, ${POS_LABELS[p.caller]} call` : '';
    } else if (scenario === 'SQUEEZE_2C') {
        const p = parseSqueeze2CKey(oppPos);
        document.getElementById('chart-pos-label').innerText = p ? `${POS_LABELS[p.hero]} vs ${POS_LABELS[p.opener]} open, ${POS_LABELS[p.caller1]} & ${POS_LABELS[p.caller2]} call` : '';
    } else if (scenario === 'VS_LIMP') {
        const bucketTag = { '1L': '1 Limper', '2L': '2 Limpers', '3P': '3+ Limpers' }[state.limperBucket] || '';
        document.getElementById('chart-pos-label').innerText = `${POS_LABELS[pos]} vs ${POS_LABELS[oppPos] || 'Field'} · ${bucketTag}`;
    } else {
        document.getElementById('chart-pos-label').innerText = `${POS_LABELS[pos]} vs ${POS_LABELS[oppPos] || 'Field'}`;
    }
}

function switchChartBucket(bucket) {
    state.limperBucket = bucket;
    _renderChart(_chartCtx.pos, _chartCtx.target, _chartCtx.scenario, _chartCtx.oppPos);
}

let _toastTimer = null;
function showToast(text, type, duration) {
    const container = document.getElementById('toast-container');
    if (!container) { console.warn('[Toast] Missing #toast-container:', text); return; }
    // Clear any existing toast
    if (_toastTimer) clearTimeout(_toastTimer);
    container.innerHTML = '';
    
    const toastClass = type === 'correct' ? 'toast-correct' : 'toast-incorrect';
    const icon = type === 'correct' ? '✓' : '✗';
    const toast = document.createElement('div');
    toast.className = `toast ${toastClass}`;
    toast.style.fontSize = 'var(--toast-font, 12px)';
    toast.style.padding = 'var(--toast-pad-y, 4px) var(--toast-pad-x, 12px)';
    toast.innerHTML = `<span>${icon}</span><span>${text}</span>`;
    container.appendChild(toast);
    
    _toastTimer = setTimeout(() => {
        toast.classList.add('leaving');
        setTimeout(() => { if (container.contains(toast)) container.removeChild(toast); }, 220);
    }, duration || 1200);
}
function clearToast() {
    const container = document.getElementById('toast-container');
    if (_toastTimer) clearTimeout(_toastTimer);
    if (container) container.innerHTML = '';
}

function showConfigMenu() { document.getElementById('config-screen').classList.remove('hidden'); hydrateCloudUI(); hydrateCloudAutoUI(); setDrillMode(drillState.mode); updateConfigUI(); }
function hideConfigMenu() { document.getElementById('config-screen').classList.add('hidden'); }
let _chartIsReview = false;
function closeChart() {
    document.getElementById('chart-modal').classList.add('hidden');
    // Release round guard (user is returning to trainer)
    __endResolve();
    if (document.getElementById('trainer-screen').classList.contains('hidden')) return;
    if (!_chartIsReview) {
        if (!checkDrillComplete() && !checkDailyRunComplete()) safeGenerateNextRound();
    }
    _chartIsReview = false;
}
function startConfiguredTraining() {
    try { __clearNextTimer(); __endResolve(); } catch(_) {}
    try { window.__tableAnimToken = (window.__tableAnimToken || 0) + 1; } catch(_) {}

    state.sessionStats = { total: 0, correct: 0, streak: 0 };
    state.sessionLog = [];

    if (drillState.mode === 'focused') {
        // Save original config, override for drill
        drillState.active = true;
        drillState._savedConfig = JSON.parse(JSON.stringify(state.config));
        state.config.scenarios = [drillState.scenario];
        state.config.positions = [...drillState.positions];
    } else {
        drillState.active = false;
    }

    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('config-screen').classList.add('hidden');
    // Safety: if Challenge overlay is open, close it
    const ch = document.getElementById('challenge-screen');
    if (ch) ch.classList.add('hidden');
    document.getElementById('trainer-screen').classList.remove('hidden');
    updateUI();
    if (typeof updateDrillCounter === 'function') updateDrillCounter(); // IMP 3: guard against missing function
    safeGenerateNextRound();
}
function confirmExit() {
    const hands = state.sessionStats && state.sessionStats.total;
    // No confirmation needed for 0 hands or review sessions
    if (!hands || hands < 3 || reviewSession.active) { exitToMenu(); return; }
    // Show inline confirm by temporarily changing button text
    const btn = document.querySelector('#trainer-screen button[onclick="confirmExit()"]');
    if (!btn) { exitToMenu(); return; }
    if (btn.dataset.confirming === '1') { exitToMenu(); return; }
    btn.dataset.confirming = '1';
    const orig = btn.textContent;
    btn.textContent = 'Sure?';
    btn.classList.add('text-rose-400');
    setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('text-rose-400');
        delete btn.dataset.confirming;
    }, 2500);
}

function exitToMenu() {
    try { __clearNextTimer(); __endResolve(); } catch(_) {}
    try { document.getElementById('dr-round-counter').classList.add('hidden'); } catch(_) {}
    try { document.getElementById('streak-best-block').classList.add('hidden'); } catch(_) {}
    try { window.__tableAnimToken = (window.__tableAnimToken || 0) + 1; } catch(_) {}
    // Clean up postflop UI
    try { if(typeof clearCommunityCards==='function') clearCommunityCards(); } catch(_) {}
    try { if(typeof closePostflopFeedback==='function') closePostflopFeedback(); } catch(_) {}
    state.postflop = null;

    const wasOpenTraining = !drillState.active && !reviewSession.active &&
        !(dailyRunState && dailyRunState.active) &&
        !(typeof challengeState !== 'undefined' && challengeState && challengeState.active);
    const handsPlayed = state.sessionStats && state.sessionStats.total || 0;

    // Restore config if drill was active
    if (drillState._savedConfig) {
        state.config = drillState._savedConfig;
        drillState._savedConfig = null;
    }
    drillState.active = false;
    reviewSession.active = false;

    if (wasOpenTraining && handsPlayed >= 5) {
        showSessionSummary();
    } else {
        document.getElementById('trainer-screen').classList.add('hidden');
        document.getElementById('menu-screen').classList.remove('hidden');
        updateMenuUI();
    }
}

function showReviewComplete() {
    const s = state.sessionStats;
    const total = s.total || 0;
    const correct = s.correct || 0;
    const acc = total ? Math.round(correct / total * 100) : 0;
    const accColor = acc >= 85 ? 'text-emerald-400' : acc >= 70 ? 'text-yellow-400' : 'text-rose-400';

    // Find hands still wrong this session
    const stillWrong = (state.sessionLog || []).filter(e => !e.correct);
    const wrongSpots = [...new Set(stillWrong.map(e => e.spotKey).filter(Boolean))];

    const wrongRows = wrongSpots.slice(0, 4).map(sk =>
        `<div class="text-[11px] text-rose-300 font-semibold py-1 border-b border-slate-800/40 last:border-0">${prettySpotName(sk)}</div>`
    ).join('');

    const el = document.getElementById('review-complete-screen');
    if (!el) { exitToMenu(); return; }
    el.querySelector('#rc-hands').textContent = total;
    el.querySelector('#rc-accuracy').textContent = acc + '%';
    el.querySelector('#rc-accuracy').className = 'text-4xl font-black ' + accColor;
    el.querySelector('#rc-wrong-rows').innerHTML = wrongRows ||
        '<div class="text-emerald-400 text-[11px] font-bold">Clean sweep — all correct!</div>';

    document.getElementById('trainer-screen').classList.add('hidden');
    el.classList.remove('hidden');
}

function closeReviewComplete() {
    const el = document.getElementById('review-complete-screen');
    if (el) el.classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    updateMenuUI();
}

function showSessionSummary() {
    const s = state.sessionStats;
    const total = s.total || 0;
    const correct = s.correct || 0;
    const acc = total ? Math.round(correct / total * 100) : 0;
    const accColor = acc >= 85 ? 'text-emerald-400' : acc >= 70 ? 'text-yellow-400' : acc >= 55 ? 'text-orange-400' : 'text-rose-400';
    const streak = state.global.bestStreak || 0;

    // Find worst spot this session from sessionLog
    const spotErr = {};
    (state.sessionLog || []).forEach(entry => {
        if (!entry.spotKey) return;
        if (!spotErr[entry.spotKey]) spotErr[entry.spotKey] = { w: 0, t: 0 };
        spotErr[entry.spotKey].t++;
        if (!entry.correct) spotErr[entry.spotKey].w++;
    });
    const worstSpots = Object.entries(spotErr)
        .filter(([,v]) => v.t >= 2)
        .map(([k,v]) => ({ key: k, acc: Math.round((v.t-v.w)/v.t*100), wrong: v.w, total: v.t }))
        .sort((a,b) => a.acc - b.acc)
        .slice(0, 3);

    const spotRows = worstSpots.length ? worstSpots.map(sp => {
        const col = sp.acc >= 80 ? 'text-emerald-400' : sp.acc >= 60 ? 'text-yellow-400' : 'text-rose-400';
        return `<div class="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
            <span class="text-[11px] text-slate-300 font-semibold">${prettySpotName(sp.key)}</span>
            <span class="text-[11px] font-black ${col}">${sp.acc}%</span>
        </div>`;
    }).join('') : '<div class="text-slate-600 text-xs italic">Not enough data yet</div>';

    const el = document.getElementById('session-summary-screen');
    if (!el) { document.getElementById('trainer-screen').classList.add('hidden'); document.getElementById('menu-screen').classList.remove('hidden'); updateMenuUI(); return; }

    el.querySelector('#ss-hands').textContent = total;
    el.querySelector('#ss-accuracy').textContent = acc + '%';
    el.querySelector('#ss-accuracy').className = 'text-4xl font-black ' + accColor;
    el.querySelector('#ss-streak').textContent = streak;
    el.querySelector('#ss-spot-rows').innerHTML = spotRows;

    document.getElementById('trainer-screen').classList.add('hidden');
    el.classList.remove('hidden');
}

function closeSessionSummary() {
    const el = document.getElementById('session-summary-screen');
    if (el) el.classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    updateMenuUI();
}
function saveProgress() { localStorage.setItem(profileKey('gto_rfi_stats_v2'), JSON.stringify(state.global)); SR.save(); markCloudDirty(); }
function loadProgress() { const s = localStorage.getItem(profileKey('gto_rfi_stats_v2')); if (s) state.global = JSON.parse(s); if (!state.global.byScenario) state.global.byScenario = {}; if (!state.global.byPos) state.global.byPos = {}; if (!state.global.byPosGroup) state.global.byPosGroup = {}; if (!state.global.bestStreak) state.global.bestStreak = 0; if (!state.global.bySpot) state.global.bySpot = {}; if (!state.global.byHand) state.global.byHand = {}; loadConfig(); loadLimperMix(); SR.load(); try { if(typeof loadPostflopStats==='function') loadPostflopStats(); } catch(_) {} updateMenuUI(); if (window.RANGE_VALIDATE) { validateAndNormalizeRanges(facingRfiRanges); validateAndNormalizeRanges(rfiVs3BetRanges); validateAndNormalizeRanges(allFacingLimps); } }
function updateUI() {
    document.getElementById('accuracy').innerText = (state.sessionStats.total ? Math.round(state.sessionStats.correct/state.sessionStats.total*100) : 0) + '%';
    document.getElementById('streak').innerText = state.sessionStats.streak;
    updateDrillCounter();
    // Show/hide stack badge
    try {
        const sb = document.getElementById('stack-bb-badge');
        if (sb) {
            if (state.scenario === 'PUSH_FOLD' && state.stackBB) {
                sb.textContent = state.stackBB + 'BB';
                sb.classList.remove('hidden');
            } else { sb.classList.add('hidden'); }
        }
    } catch(_) {}
}
function updateMenuUI() {
    const allSpots = getAllSpotKeys();
    const g = state.global;
    const total = g.totalHands || 0;
    const pct = total ? Math.round(g.totalCorrect / total * 100) : 0;

    // Classify spots using two-tier rollup
    function classifySpot(key) { return SR.classifySpot(key, edgeClassify); }
    const tiers = { mastered: 0, learning: 0, struggling: 0, unseen: 0 };
    allSpots.forEach(k => tiers[classifySpot(k)]++);
    const masteryPct = allSpots.length ? Math.round(tiers.mastered / allSpots.length * 100) : 0;
    const dueCount = SR.getDueSpots(false).length;

    // Mini mastery ring
    const rs = 80, rStroke = 7;
    const rr = (rs - rStroke) / 2;
    const rc = 2 * Math.PI * rr;
    const ro2 = rc * (1 - masteryPct / 100);
    const ringCol = masteryPct >= 80 ? '#10b981' : masteryPct >= 50 ? '#eab308' : masteryPct >= 20 ? '#f97316' : '#475569';

    let html = `<div class="flex items-center gap-4">
        <div class="relative shrink-0" style="width:${rs}px;height:${rs}px;">
            <svg width="${rs}" height="${rs}" class="transform -rotate-90">
                <circle cx="${rs/2}" cy="${rs/2}" r="${rr}" fill="none" stroke="#1e293b" stroke-width="${rStroke}"/>
                <circle cx="${rs/2}" cy="${rs/2}" r="${rr}" fill="none" stroke="${ringCol}" stroke-width="${rStroke}" stroke-linecap="round" stroke-dasharray="${rc}" stroke-dashoffset="${ro2}" style="transition:stroke-dashoffset 0.6s ease"/>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-xl font-black text-white">${masteryPct}%</span>
                <span class="text-[7px] text-slate-500 font-bold uppercase">Mastery</span>
            </div>
        </div>
        <div class="flex-1 flex flex-col gap-1.5 text-left">
            <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-emerald-500"></div><span class="text-[11px] text-slate-400 flex-1">Mastered</span><span class="text-[11px] font-black text-emerald-400">${tiers.mastered}</span></div>
            <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-indigo-500"></div><span class="text-[11px] text-slate-400 flex-1">Learning</span><span class="text-[11px] font-black text-indigo-400">${tiers.learning}</span></div>
            <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-rose-500"></div><span class="text-[11px] text-slate-400 flex-1">Struggling</span><span class="text-[11px] font-black text-rose-400">${tiers.struggling}</span></div>
            <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-slate-700"></div><span class="text-[11px] text-slate-400 flex-1">Unseen</span><span class="text-[11px] font-black text-slate-600">${tiers.unseen}</span></div>
        </div>
    </div>
    <div class="mt-4 bg-slate-950/40 border border-slate-800/40 rounded-2xl px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
            <span class="text-lg">🔥</span>
            <div>
                <div class="text-slate-200 font-black text-sm">Daily Run Streak</div>
                <div id="menu-daily-lock" class="text-slate-500 text-[10px] font-bold"></div>
            </div>
        </div>
        <div id="menu-daily-streak" class="text-indigo-200 font-black text-2xl">0</div>
    </div>
`;

    // Coverage bar
    const bM = allSpots.length ? Math.round(tiers.mastered / allSpots.length * 100) : 0;
    const bL = allSpots.length ? Math.round(tiers.learning / allSpots.length * 100) : 0;
    const bS = allSpots.length ? Math.round(tiers.struggling / allSpots.length * 100) : 0;
    html += `<div class="mt-3">
        <div class="w-full bg-slate-800 rounded-full h-1.5 flex overflow-hidden">
            <div class="bg-emerald-500 h-1.5" style="width:${bM}%"></div>
            <div class="bg-indigo-500 h-1.5" style="width:${bL}%"></div>
            <div class="bg-rose-500 h-1.5" style="width:${bS}%"></div>
        </div>
    </div>`;

    // Quick stats row
    html += `<div class="grid grid-cols-3 gap-2 mt-3">
        <div class="bg-slate-950/50 rounded-xl py-2 px-1 border border-slate-800/30 flex flex-col items-center">
            <span class="text-[8px] text-slate-500 uppercase font-bold">Hands</span>
            <span class="text-sm font-black text-slate-300">${total}</span>
        </div>
        <div class="bg-slate-950/50 rounded-xl py-2 px-1 border border-slate-800/30 flex flex-col items-center">
            <span class="text-[8px] text-slate-500 uppercase font-bold">Accuracy</span>
            <span class="text-sm font-black ${pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-yellow-400' : total > 0 ? 'text-orange-400' : 'text-slate-600'}">${total > 0 ? pct + '%' : '—'}</span>
        </div>
        <div class="bg-slate-950/50 rounded-xl py-2 px-1 border border-slate-800/30 flex flex-col items-center">
            <span class="text-[8px] text-slate-500 uppercase font-bold">Streak</span>
            <span class="text-sm font-black text-orange-400">${g.bestStreak || 0}</span>
        </div>
    </div>`;

    document.getElementById('menu-dashboard').innerHTML = html;

    // Daily Run streak/lock
    try {
        const { meta, locked, msLeft } = getDailyRunLockInfo();
        const dsEl = document.getElementById('menu-daily-streak');
        if (dsEl) dsEl.textContent = String(meta.streak || 0);
        const lockEl = document.getElementById('menu-daily-lock');
        if (lockEl) lockEl.textContent = locked ? `Locked: ${formatDuration(msLeft)}` : 'Ready';
    } catch(_) {}

    // Onboarding card — show until 50 hands or dismissed
    try {
        const ob = document.getElementById('menu-onboarding');
        if (ob) {
            const dismissed = localStorage.getItem('pkOnboardingDismissed');
            const totalHands = (state.global && state.global.totalHands) || 0;
            ob.classList.toggle('hidden', !!(dismissed || totalHands >= 50));
        }
    } catch(_) {}

    // Due badge on review button
    const badge = document.getElementById('menu-due-badge');
    const cappedDue = Math.min(dueCount, REVIEW_DAILY_CAP);
    if (dueCount > 0) {
        badge.classList.remove('hidden');
        badge.textContent = dueCount > REVIEW_DAILY_CAP ? REVIEW_DAILY_CAP + '+' : dueCount;
        try { document.getElementById('menu-due-zero').classList.add('hidden'); } catch(_) {}
    } else {
        badge.classList.add('hidden');
        try { document.getElementById('menu-due-zero').classList.remove('hidden'); } catch(_) {}
    }
}
function formatHandKey(r1, r2, s) { const i1 = RANKS.indexOf(r1), i2 = RANKS.indexOf(r2); const hi = i1 < i2 ? r1 : r2, lo = i1 < i2 ? r2 : r1; return hi === lo ? hi + lo : hi + lo + (s ? 's' : 'o'); }

// --- SESSION LOG ---
function formatSpotLabel(rawSpotId) {
    // Squeeze 2C keys: CO_vs_UTG_RFI_UTG1_Call_UTG2_Call
    const sq2 = parseSqueeze2CKey(rawSpotId);
    if (sq2) return `${POS_LABELS[sq2.hero]} vs ${POS_LABELS[sq2.opener]} open, ${POS_LABELS[sq2.caller1]} & ${POS_LABELS[sq2.caller2]} call`;
    // Squeeze keys: CO_vs_UTG_RFI_LJ_Call
    const sq = parseSqueezeKey(rawSpotId);
    if (sq) return `${POS_LABELS[sq.hero]} vs ${POS_LABELS[sq.opener]} open, ${POS_LABELS[sq.caller]} call`;
    // Handle bucket suffixes for limp spots (e.g. from spotKey "VS_LIMP|BTN_vs_UTG_Limp|2L")
    // rawSpotId here might just be "BTN_vs_UTG_Limp" (already split from scenario)
    const clean = rawSpotId.replace(/_Limp$/, '');
    if (clean.includes('_vs_')) {
        return clean.replace('_vs_', ' vs ').split(' ').map(w => POS_LABELS[w] || w).join(' ');
    }
    // Could be a bucket tag like "1L", "2L", "3P" — skip it
    if (rawSpotId === '1L' || rawSpotId === '2L' || rawSpotId === '3P') return '';
    return POS_LABELS[clean] || clean;
}
const SCENARIO_SHORT = { RFI: 'RFI', FACING_RFI: 'vs RFI', RFI_VS_3BET: 'vs 3Bet', VS_LIMP: 'vs Limps', SQUEEZE: 'Squeeze', SQUEEZE_2C: 'Squeeze vs 2C', PUSH_FOLD: 'Push/Fold' };
const ACTION_LABELS = { FOLD: 'Fold', RAISE: 'Raise', CALL: 'Call', '3BET': '3-Bet', '4BET': '4-Bet', ISO: 'Iso Raise', OVERLIMP: 'Overlimp', SQUEEZE: 'Squeeze', SHOVE: 'Shove All-In' };

function showSessionLog() {
    const list = document.getElementById('session-log-list');
    if (state.sessionLog.length === 0) {
        list.innerHTML = '<p class="text-slate-600 text-xs text-center py-6">No hands played yet this session.</p>';
    } else {
        list.innerHTML = state.sessionLog.map((e, idx) => {
            let spot;
            if (e.scenario === 'SQUEEZE') {
                const sq = parseSqueezeKey(e.oppPos);
                spot = sq ? `${POS_LABELS[sq.hero]} vs ${POS_LABELS[sq.opener]}/${POS_LABELS[sq.caller]}` : e.oppPos;
            } else if (e.scenario === 'SQUEEZE_2C') {
                const sq = parseSqueeze2CKey(e.oppPos);
                spot = sq ? `${POS_LABELS[sq.hero]} vs ${POS_LABELS[sq.opener]}/${POS_LABELS[sq.caller1]}/${POS_LABELS[sq.caller2]}` : e.oppPos;
            } else {
                spot = e.oppPos ? `${POS_LABELS[e.pos]} vs ${POS_LABELS[e.oppPos]}` : POS_LABELS[e.pos];
                if (e.scenario === 'VS_LIMP' && e.limperBucket && e.limperBucket !== '1L') {
                    spot += ` (${e.limperBucket})`;
                }
            }
            const resultClass = e.correct ? 'log-row-correct' : 'log-row-incorrect';
            const resultIcon = e.correct ? '✓' : '✗';
            const resultColor = e.correct ? 'text-emerald-400' : 'text-rose-400';
            const actionLabel = ACTION_LABELS[e.action] || e.action;
            const correctLabel = e.isBluff ? 'Squeeze (Bluff)' : (ACTION_LABELS[e.correctAction] || e.correctAction);
            return `<div class="bg-slate-800/60 rounded-xl px-3 py-2.5 ${resultClass} cursor-pointer hover:bg-slate-800 transition-colors" onclick="logRowChart(${idx})">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="${resultColor} font-black text-sm">${resultIcon}</span>
                        <span class="font-black text-sm text-white">${e.hand}</span>
                        <span class="text-[10px] text-slate-400 font-bold">${SCENARIO_SHORT[e.scenario]} · ${spot}</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
                ${!e.correct ? `<div class="mt-1 text-[10px] text-slate-400">You: <span class="text-rose-400 font-bold">${actionLabel}</span> · Correct: <span class="text-emerald-400 font-bold">${correctLabel}</span></div>` : ''}
            </div>`;
        }).join('');
    }
    document.getElementById('session-log-panel').classList.remove('hidden');
}

function hideSessionLog() { document.getElementById('session-log-panel').classList.add('hidden'); }

function logRowChart(idx) {
    const e = state.sessionLog[idx];
    _chartIsReview = true;
    // Restore limper bucket for chart
    if (e.limperBucket) state.limperBucket = e.limperBucket;
    hideSessionLog();
    showChart(e.pos, e.hand, e.scenario, e.oppPos);
}

// --- STATS DRILL-DOWN ---
function showDrilldown(title, contentFn) {
    document.getElementById('drilldown-title').innerText = title;
    const content = document.getElementById('drilldown-content');
    content.innerHTML = '';
    contentFn(content);
    document.getElementById('drilldown-panel').classList.remove('hidden');
}

function hideDrilldown() { document.getElementById('drilldown-panel').classList.add('hidden'); }

function drilldownScenario(sc) {
    const SCENARIO_LABELS = { RFI: 'RFI (Unopened)', FACING_RFI: 'Defending vs RFI', RFI_VS_3BET: 'vs 3-Bet', VS_LIMP: 'Vs Limpers (1–3+)', SQUEEZE: 'Squeeze', SQUEEZE_2C: 'Squeeze vs 2C' };

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
    showDrilldown(SCENARIO_LABELS[sc], (content) => {
        // Find all spots for this scenario
        const spots = Object.keys(state.global.bySpot).filter(k => k.startsWith(sc + '|'));
        if (spots.length === 0) {
            content.innerHTML = '<p class="text-slate-600 text-sm">No data yet. Play some hands in this scenario.</p>';
            return;
        }
        // Sort by accuracy ascending (worst first)
        spots.sort((a, b) => {
            const da = state.global.bySpot[a], db = state.global.bySpot[b];
            return (da.correct/da.total) - (db.correct/db.total);
        });
        const spotsHtml = spots.map(spotKey => {
            const d = state.global.bySpot[spotKey];
            const p = Math.round(d.correct / d.total * 100);
            const parts = spotKey.split('|');
            const spotLabel = formatSpotLabel(parts[1]);
            const color = p >= 80 ? 'text-emerald-400' : p >= 60 ? 'text-yellow-400' : 'text-rose-400';
            const barColor = p >= 80 ? 'bg-emerald-500' : p >= 60 ? 'bg-yellow-500' : 'bg-rose-500';
            return `<div class="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-slate-600 transition-colors" onclick="drilldownSpot('${spotKey}')">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-bold text-slate-200">${spotLabel}</span>
                    <div class="flex items-center gap-2">
                        <span class="font-black text-sm ${color}">${p}%</span>
                        <span class="text-slate-600 text-xs">${d.total} hands</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1.5"><div class="${barColor} h-1.5 rounded-full" style="width:${p}%"></div></div>
            </div>`;
        }).join('');
        content.innerHTML = `<div class="flex flex-col gap-3">${spotsHtml}</div>`;
    });
}

function drilldownPosition(pos) {
    showDrilldown(POS_LABELS[pos] + ' — All Spots', (content) => {
        const spots = Object.keys(state.global.bySpot).filter(k => {
            const parts = k.split('|');
            return parts[1].startsWith(pos + '_vs_') || parts[1] === pos;
        });
        if (spots.length === 0) {
            content.innerHTML = '<p class="text-slate-600 text-sm">No data yet for this position.</p>';
            return;
        }
        spots.sort((a, b) => {
            const da = state.global.bySpot[a], db = state.global.bySpot[b];
            return (da.correct/da.total) - (db.correct/db.total);
        });
        const spotsHtml = spots.map(spotKey => {
            const d = state.global.bySpot[spotKey];
            const p = Math.round(d.correct / d.total * 100);
            const parts = spotKey.split('|');
            const scLabel = SCENARIO_SHORT[parts[0]] || parts[0];
            const spotLabel = formatSpotLabel(parts[1]);
            const color = p >= 80 ? 'text-emerald-400' : p >= 60 ? 'text-yellow-400' : 'text-rose-400';
            const barColor = p >= 80 ? 'bg-emerald-500' : p >= 60 ? 'bg-yellow-500' : 'bg-rose-500';
            return `<div class="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-slate-600 transition-colors" onclick="drilldownSpot('${spotKey}')">
                <div class="flex justify-between items-center mb-2">
                    <div><span class="text-sm font-bold text-slate-200">${spotLabel}</span><span class="text-[10px] text-slate-500 ml-2">${scLabel}</span></div>
                    <div class="flex items-center gap-2">
                        <span class="font-black text-sm ${color}">${p}%</span>
                        <span class="text-slate-600 text-xs">${d.total} hands</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1.5"><div class="${barColor} h-1.5 rounded-full" style="width:${p}%"></div></div>
            </div>`;
        }).join('');
        content.innerHTML = `<div class="flex flex-col gap-3">${spotsHtml}</div>`;
    });
}

function drilldownSpot(spotKey) {
    const parts = spotKey.split('|');
    const sc = parts[0], spotId = parts[1];
    let spotLabel = formatSpotLabel(spotId);
    // Add bucket label for VS_LIMP
    if (sc === 'VS_LIMP' && parts[2]) {
        const bucketLabel = { '1L': '1 Limper', '2L': '2 Limpers', '3P': '3+ Limpers' }[parts[2]] || '';
        if (bucketLabel) spotLabel += ` · ${bucketLabel}`;
    }
    const scLabel = { RFI: 'RFI', FACING_RFI: 'Defending vs RFI', RFI_VS_3BET: 'vs 3-Bet', VS_LIMP: 'Vs Limpers', SQUEEZE: 'Squeeze', SQUEEZE_2C: 'Squeeze vs 2C' }[sc];

    showDrilldown(`${spotLabel} · ${scLabel}`, (content) => {
        const d = state.global.bySpot[spotKey];
        const stats = SR.getSpotStats(spotKey, edgeClassify);
        if (!d && stats.totalAttempts === 0) { content.innerHTML = '<p class="text-slate-600 text-sm">No data.</p>'; return; }
        const pct = d ? Math.round(d.correct / d.total * 100) : stats.accuracy;
        const color = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-yellow-400' : 'text-rose-400';
        const statusColor = { mastered: 'text-emerald-400', learning: 'text-indigo-400', struggling: 'text-rose-400', unseen: 'text-slate-500' }[stats.status];
        const statusLabel = stats.status.charAt(0).toUpperCase() + stats.status.slice(1);

        // Summary with coverage, accuracy, due, status
        let summaryHtml = `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div class="flex justify-between items-center mb-3">
                <span class="text-[10px] text-slate-500 uppercase font-bold">Status</span>
                <span class="text-sm font-black ${statusColor}">${statusLabel}</span>
            </div>
            <div class="grid grid-cols-4 gap-2">
                <div class="text-center"><p class="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Accuracy</p><p class="text-lg font-black ${color}">${stats.accuracy}%</p></div>
                <div class="text-center"><p class="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Coverage</p><p class="text-lg font-black text-slate-200">${stats.coverage}%</p></div>
                <div class="text-center"><p class="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Hands</p><p class="text-lg font-black text-slate-200">${stats.handsSeen}</p></div>
                <div class="text-center"><p class="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Due</p><p class="text-lg font-black ${stats.dueCount > 0 ? 'text-amber-400' : 'text-slate-500'}">${stats.dueCount}</p></div>
            </div>
        </div>`;

        // Per-hand heatmap grid
        let gridHtml = '<div class="bg-slate-900 border border-slate-800 rounded-2xl p-4"><p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">Hand Accuracy Heatmap</p><p class="text-[9px] text-slate-600 mb-3">Green = correct, red = missed, grey = not seen</p><div class="range-grid w-full" style="gap:1px;">';
        for (let i = 0; i < 13; i++) {
            for (let j = 0; j < 13; j++) {
                const r1 = RANKS[i], r2 = RANKS[j];
                const hKey = (i === j) ? r1+r2 : (i < j ? r1+r2+'s' : r2+r1+'o');
                const hd = state.global.byHand[`${spotKey}|${hKey}`];
                let bg, title;
                if (!hd || hd.total === 0) {
                    bg = 'background:#1e293b;';
                    title = `${hKey}: not seen`;
                } else {
                    const hp2 = hd.correct / hd.total;
                    // Green for high accuracy, red for low
                    const r = Math.round(255 * (1 - hp2));
                    const g = Math.round(180 * hp2);
                    bg = `background:rgb(${r},${g},40);`;
                    title = `${hKey}: ${Math.round(hp2*100)}% (${hd.correct}/${hd.total})`;
                }
                gridHtml += `<div class="drilldown-hand-cell" style="${bg}" title="${title}">${hKey}</div>`;
            }
        }
        gridHtml += '</div></div>';

        // Worst hands list
        const handEntries = Object.entries(state.global.byHand)
            .filter(([k]) => k.startsWith(spotKey + '|'))
            .map(([k, v]) => ({ hand: k.split('|').pop(), ...v, pct: Math.round(v.correct/v.total*100) }))
            .filter(e => e.total >= 2)
            .sort((a, b) => a.pct - b.pct)
            .slice(0, 8);

        let worstHtml = '';
        if (handEntries.length > 0) {
            worstHtml = `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">Trickiest Hands</p>
                <div class="flex flex-col gap-2">${handEntries.map(e => {
                    const c2 = e.pct >= 80 ? 'text-emerald-400' : e.pct >= 50 ? 'text-yellow-400' : 'text-rose-400';
                    const b2 = e.pct >= 80 ? 'bg-emerald-500' : e.pct >= 50 ? 'bg-yellow-500' : 'bg-rose-500';
                    return `<div class="flex items-center gap-3">
                        <span class="font-black text-sm text-white w-10 shrink-0">${e.hand}</span>
                        <div class="flex-1 bg-slate-800 rounded-full h-1.5"><div class="${b2} h-1.5 rounded-full" style="width:${e.pct}%"></div></div>
                        <span class="font-black text-xs ${c2} w-10 text-right shrink-0">${e.pct}%</span>
                        <span class="text-[10px] text-slate-600 w-12 text-right shrink-0">${e.correct}/${e.total}</span>
                    </div>`;
                }).join('')}</div>
            </div>`;
        }

        content.innerHTML = summaryHtml + gridHtml + worstHtml;
    });
}

// ============================================================
// RESPONSIVE SCALING SYSTEM
// ============================================================
// Observes the poker felt container and sets CSS custom properties
// so seats, cards, chips, badges, hero cards, and buttons all
// scale proportionally based on the actual rendered table size.
(function() {
    let feltW = 0, feltH = 0;
    function applyScale() {
        const root = document.documentElement.style;
        const main = document.getElementById('trainer-main');
        const isMobile = feltW < 500;
        // Switch seat coordinate set based on screen size
        SEAT_COORDS = isMobile ? SEAT_COORDS_MOBILE : SEAT_COORDS_DESKTOP;
        // Tighten vertical gap on mobile
        if (main) main.style.gap = isMobile ? '2px' : 'clamp(4px,1.2vh,12px)';
        // Seat sizing: ~9% of felt width on desktop, ~11% on mobile
        const seatScale = isMobile ? 0.115 : 0.09;
        const seatW = Math.max(40, Math.round(feltW * seatScale));
        const seatH = Math.round(seatW * 0.68);
        const seatFont = Math.max(8, Math.round(seatW * 0.2));
        root.setProperty('--seat-w', seatW + 'px');
        root.setProperty('--seat-h', seatH + 'px');
        root.setProperty('--seat-font', seatFont + 'px');
        // Card backs on table
        const cbW = Math.max(9, Math.round(feltW * (isMobile ? 0.024 : 0.018)));
        const cbH = Math.round(cbW * 1.4);
        root.setProperty('--cb-w', cbW + 'px');
        root.setProperty('--cb-h', cbH + 'px');
        // Dealer button
        root.setProperty('--dealer-size', Math.max(18, Math.round(feltW * (isMobile ? 0.045 : 0.035))) + 'px');
        root.setProperty('--dealer-font', Math.max(9, Math.round(feltW * (isMobile ? 0.02 : 0.016))) + 'px');
        // Action badge
        const badgeFont = Math.max(7, Math.round(feltW * (isMobile ? 0.018 : 0.014)));
        root.setProperty('--badge-font', badgeFont + 'px');
        root.setProperty('--badge-px', Math.round(badgeFont * 0.5) + 'px');
        root.setProperty('--badge-py', Math.round(badgeFont * 0.15) + 'px');
        root.setProperty('--badge-radius', Math.round(badgeFont * 0.5) + 'px');
        // Chip
        const chipSize = Math.max(14, Math.round(feltW * (isMobile ? 0.035 : 0.028)));
        root.setProperty('--chip-size', chipSize + 'px');
        root.setProperty('--chip-font', Math.max(8, Math.round(chipSize * 0.6)) + 'px');
        // Toast
        const toastFont = Math.max(11, Math.round(feltW * (isMobile ? 0.024 : 0.016)));
        const toastH = Math.round(toastFont * 2.6);
        root.setProperty('--toast-font', toastFont + 'px');
        root.setProperty('--toast-pad-x', Math.round(toastFont * 0.9) + 'px');
        root.setProperty('--toast-pad-y', Math.round(toastFont * 0.35) + 'px');
        root.setProperty('--toast-h', toastH + 'px');
        // Hero cards — larger on mobile
        const cardScale = isMobile ? 0.14 : 0.1;
        const cardHScale = isMobile ? 0.48 : 0.38;
        const cardW = Math.max(40, Math.round(Math.min(feltW * cardScale, feltH * cardHScale)));
        const cardH = Math.round(cardW * 1.5);
        root.setProperty('--hero-card-w', cardW + 'px');
        root.setProperty('--hero-card-h', cardH + 'px');
        root.setProperty('--hero-rank-size', Math.round(cardW * 0.52) + 'px');
        root.setProperty('--hero-suit-size', Math.round(cardW * 0.42) + 'px');
        root.setProperty('--card-gap', Math.round(cardW * 0.2) + 'px');
        // Hint text
        root.setProperty('--hint-size', Math.max(10, Math.round(feltW * (isMobile ? 0.026 : 0.018))) + 'px');
        // Community cards (postflop)
        const ccW = Math.max(28, Math.round(feltW * (isMobile ? 0.09 : 0.065)));
        root.setProperty('--cc-w', ccW + 'px');
        root.setProperty('--cc-h', Math.round(ccW * 1.38) + 'px');
        root.setProperty('--cc-rank-size', Math.round(ccW * 0.4) + 'px');
        root.setProperty('--cc-suit-size', Math.round(ccW * 0.32) + 'px');
        // Action buttons — bigger tap targets on mobile
        const btnPad = Math.max(12, Math.round(feltH * (isMobile ? 0.08 : 0.06)));
        const btnFont = Math.max(13, Math.round(feltW * (isMobile ? 0.034 : 0.022)));
        root.setProperty('--btn-pad', btnPad + 'px');
        root.setProperty('--btn-font', btnFont + 'px');
        root.setProperty('--btn-max-w', Math.min(640, Math.round(feltW * 0.95)) + 'px');
        // Felt border scales
        const feltBorder = Math.max(6, Math.round(feltW * 0.016));
        const feltEl = document.getElementById('poker-felt-container');
        if (feltEl) {
            feltEl.style.borderWidth = feltBorder + 'px';
            // Slightly taller table on mobile for more vertical room
            feltEl.style.aspectRatio = isMobile ? '1.9/1' : '2.1/1';
        }
    }

    const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
            feltW = entry.contentRect.width;
            feltH = entry.contentRect.height;
            applyScale();
        }
    });

    // Start observing once trainer is shown
    const origStart = startConfiguredTraining;
    startConfiguredTraining = function() {
        origStart();
        const felt = document.getElementById('poker-felt-container');
        if (felt) { ro.observe(felt); }
    };
    const origReview = startReviewSession;
    startReviewSession = function() {
        origReview();
        const felt = document.getElementById('poker-felt-container');
        if (felt) { ro.observe(felt); }
    };
    // Clean up on exit
    const origExit = exitToMenu;
    exitToMenu = function() {
        ro.disconnect();
        origExit();
    };
})();

window.onload = function(){ loadProgress(); try{ updateMenuUI(); }catch(e){} try{ updateOpenSizeUI(); }catch(e){} startCloudAutosaveLoop(false); };
function showUserStats() {
    hideAllScreens();
    const screen = document.getElementById('stats-screen');
    if (screen) screen.classList.remove('hidden');

    // Render after screen is visible; if something fails, show a readable error instead of a blank page.
    try {
        renderUserStats();
    } catch (e) {
        const body = document.getElementById('stats-body');
        if (body) {
            body.innerHTML = `
                <div class="p-5 rounded-2xl bg-slate-900 border border-rose-900/40">
                    <div class="text-lg font-bold text-rose-300 mb-2">Stats render error</div>
                    <div class="text-sm text-slate-300">This means a JS error prevented the stats UI from rendering.</div>
                    <pre class="mt-3 text-xs whitespace-pre-wrap text-slate-200 bg-slate-950/60 p-3 rounded-xl overflow-auto">${String(e && (e.stack || e.message || e))}</pre>
                </div>`;
        }
        console.error('renderUserStats failed:', e);
    }
}
function hideUserStats() {
    hideAllScreens();
    showMenu();
}

        // ============================================================
// PROFILE (simple username) — namespaced storage keys
// ============================================================
