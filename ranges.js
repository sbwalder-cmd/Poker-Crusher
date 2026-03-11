// ranges.js — Constants, range data, limp engine, push/fold, squeeze, helpers
// Auto-split from PokerCrusher monolith — do not reorder script tags

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const TABLE_ORDER = ['SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN'];
const ALL_POSITIONS = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const POS_LABELS = { 'SB':'SB','BB':'BB','UTG':'UTG','UTG1':'UTG+1','UTG2':'UTG+2','LJ':'LJ','HJ':'HJ','CO':'CO','BTN':'BTN' };
const BET_JITTER = { 'UTG':-6, 'UTG1':-2, 'UTG2':2, 'LJ':6, 'HJ':4, 'CO':2, 'BTN':-2, 'SB':-4, 'BB':4 };

// Seat coords — desktop defaults; mobile overrides applied dynamically
const SEAT_COORDS_DESKTOP = [
    { left: '50%', top: '92%' }, { left: '12%', top: '80%' }, { left: '4%',  top: '50%' },
    { left: '12%', top: '20%' }, { left: '35%', top: '8%'  }, { left: '65%', top: '8%'  },
    { left: '88%', top: '20%' }, { left: '96%', top: '50%' }, { left: '88%', top: '80%' }
];
// Mobile: spread bottom corners wider, pull side seats in, lift hero seat slightly
const SEAT_COORDS_MOBILE = [
    { left: '50%', top: '88%' }, { left: '10%', top: '74%' }, { left: '3%',  top: '46%' },
    { left: '10%', top: '18%' }, { left: '33%', top: '6%'  }, { left: '67%', top: '6%'  },
    { left: '90%', top: '18%' }, { left: '97%', top: '46%' }, { left: '90%', top: '74%' }
];
let SEAT_COORDS = SEAT_COORDS_DESKTOP;

// Ranges Definitions (same as previous)
const rfiRanges = {
    UTG: ['22+', 'AJs+', 'AQo+', 'KJs+', 'KQo', 'QJs', 'JTs', 'T9s'],
    UTG1: ['22+', 'ATs+', 'AQo+', 'KJs+', 'KQo', 'QJs', 'JTs', 'T9s', '98s'],
    UTG2: ['22+', 'A9s+', 'AJo+', 'KJs+', 'KQo', 'QJs', 'JTs', 'T9s', '98s', '87s'],
    LJ: ['22+', 'A8s+', 'AJo+', 'KTs+', 'KQo', 'QJs', 'JTs', 'T9s', '98s', '87s', '76s'],
    HJ: ['22+', 'A5s+', 'AJo+', 'K9s+', 'KJo+', 'QTs+', 'QJo', 'JTs', 'T9s', '98s', '87s', '76s', '65s'],
    CO: ['22+', 'A2s+', 'ATo+', 'K8s+', 'KJo+', 'Q9s+', 'QJo', 'J9s+', 'JTo', 'T9s', 'T8s', '98s', '97s', '87s', '76s', '65s', '54s'],
    BTN: ['22+', 'A2s+', 'A2o+', 'K2s+', 'K9o+', 'Q5s+', 'QTo+', 'J7s+', 'JTo', 'T7s+', 'T9o', '96s+', '98o', '86s+', '75s+', '65s', '54s'],
    SB: ['22+', 'A2s+', 'A2o+', 'K2s+', 'K7o+', 'Q4s+', 'QTo+', 'J6s+', 'J9o+', 'T6s+', 'T9o', '96s+', '85s+', '75s+', '64s+', '53s+', '43s']
};

const facingRfiRanges = {
    // UTG+1 hero
    UTG1_vs_UTG:  { "3-bet": ['QQ+','AK'], "Call": ['JJ-88','AQs','KQs'] },
    // UTG+2 hero
    UTG2_vs_UTG:  { "3-bet": ['QQ+','AK'], "Call": ['JJ-77','AQs','KQs','AJs'] },
    UTG2_vs_UTG1: { "3-bet": ['QQ+','AK'], "Call": ['JJ-77','AQs','KQs','AJs'] },
    // LJ hero
    LJ_vs_UTG:    { "3-bet": ['QQ+','AK'], "Call": ['JJ-77','AQs','KQs','AJs'] },
    LJ_vs_UTG1:   { "3-bet": ['QQ+','AK'], "Call": ['JJ-66','AQs','KQs','AJs'] },
    LJ_vs_UTG2:   { "3-bet": ['QQ+','AK'], "Call": ['JJ-66','AQs','KQs','AJs','KJs'] },
    // HJ hero
    HJ_vs_UTG:    { "3-bet": ['QQ+','AK'], "Call": ['JJ-88','AQs','KQs','AJs'] },
    HJ_vs_UTG1:   { "3-bet": ['QQ+','AK'], "Call": ['JJ-77','AQs','KQs','AJs','KJs'] },
    HJ_vs_UTG2:   { "3-bet": ['QQ+','AK'], "Call": ['JJ-66','AQs','AJs','KQs','KJs','QJs'] },
    HJ_vs_LJ:     { "3-bet": ['QQ+','AK'], "Call": ['JJ-66','AQs','AJs','KQs','KJs','QJs','JTs'] },
    // CO hero
    CO_vs_UTG:    { "3-bet": ['QQ+','AK'], "Call": ['JJ-77','AQs','KQs','AJs'] },
    CO_vs_UTG1:   { "3-bet": ['QQ+','AK'], "Call": ['JJ-66','AQs','KQs','AJs'] },
    CO_vs_UTG2:   { "3-bet": ['QQ+','AK'], "Call": ['JJ-55','AQs','AJs','KQs','KJs','QJs'] },
    CO_vs_LJ:     { "3-bet": ['QQ+','AK'], "Call": ['JJ-55','ATs+','KQs','KJs','QJs','JTs'] },
    CO_vs_HJ:     { "3-bet": ['QQ+','AK'], "Call": ['JJ-55','ATs+','KQs','KJs','QJs','JTs','T9s'] },
    // BTN hero
    BTN_vs_UTG:   { "3-bet": ['QQ+','AK'], "Call": ['JJ-77','AQs','KQs','AJs'] },
    BTN_vs_UTG1:  { "3-bet": ['QQ+','AK'], "Call": ['JJ-66','AQs','KQs','AJs','KJs'] },
    BTN_vs_UTG2:  { "3-bet": ['QQ+','AK'], "Call": ['JJ-55','AJs','AQs','KQs','KJs','QJs','JTs'] },
    BTN_vs_LJ:    { "3-bet": ['QQ+','AK'], "Call": ['JJ-22','ATs+','KTs+','QTs+','JTs','T9s','98s','AJo','AQo','KQo'] },
    BTN_vs_HJ:    { "3-bet": ['QQ+','AK'], "Call": ['JJ-22','ATs+','KTs+','QTs+','JTs','T9s','98s','AJo','AQo','KQo'] },
    BTN_vs_CO:    { "3-bet": ['JJ+','AK','A5s'], "Call": ['TT-22','ATs+','KTs+','QTs+','JTs','T9s','98s','87s','AJo','AQo','KQo'] },
    // SB hero
    SB_vs_UTG:    { "3-bet": ['QQ+','AK'], "Call": ['JJ-77','AQs','KQs'] },
    SB_vs_UTG1:   { "3-bet": ['QQ+','AK'], "Call": ['JJ-77','AQs','KQs'] },
    SB_vs_UTG2:   { "3-bet": ['QQ+','AK'], "Call": ['JJ-66','AQs','AJs','KQs'] },
    SB_vs_LJ:     { "3-bet": ['QQ+','AK'], "Call": ['JJ-66','AQs','AJs','KQs'] },
    SB_vs_HJ:     { "3-bet": ['JJ+','AK'], "Call": ['TT-66','ATs+','KQs','KJs'] },
    SB_vs_CO:     { "3-bet": ['JJ+','AK'], "Call": ['TT-66','ATs+','KQs','KJs','QJs'] },
    SB_vs_BTN:    { "3-bet": ['JJ+','AK'], "Call": ['TT-66','ATs+','KTs+','QTs+','JTs','T9s'] },
    // BB hero
    BB_vs_UTG:    { "3-bet": ['QQ+','AK'], "Call": ['JJ-22','A2s+','KTs+','QTs+','JTs','T9s','AQo','AJo','KQo'] },
    BB_vs_UTG1:   { "3-bet": ['QQ+','AK'], "Call": ['JJ-22','A2s+','KTs+','QTs+','JTs','T9s','98s','AQo','AJo','KQo'] },
    BB_vs_UTG2:   { "3-bet": ['QQ+','AK'], "Call": ['JJ-22','A2s+','K9s+','QTs+','JTs','T9s','98s','AJo+','KQo'] },
    BB_vs_LJ:     { "3-bet": ['QQ+','AK'], "Call": ['JJ-22','A2s+','K9s+','Q9s+','JTs','T9s','98s','AJo+','KQo'] },
    BB_vs_HJ:     { "3-bet": ['JJ+','AK'], "Call": ['TT-22','A2s+','K9s+','Q9s+','J9s+','T9s','98s','AJo+','KQo'] },
    BB_vs_CO:     { "3-bet": ['JJ+','AK','A5s'], "Call": ['TT-22','A2s+','K9s+','Q9s+','J9s+','T9s','98s','87s','AJo+','KQo','KJo'] },
    BB_vs_BTN:    { "3-bet": ['JJ+','AK','A5s-A4s'], "Call": ['TT-22','A2s+','K9s+','Q9s+','J9s+','T9s','98s','87s','76s','AJo+','KQo','KJo','QJo'] },
    BB_vs_SB:     { "3-bet": ['JJ+','AK','A5s-A4s'], "Call": ['TT-22','A2s+','K8s+','Q8s+','J8s+','T8s+','98s','87s','76s','65s','A9o+','KTo+','QTo+','JTo'] }
};

const rfiVs3BetRanges = {
    // ===== UTG opener =====
    UTG_vs_UTG1:  { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','AQs','KQs','AQo'] },
    UTG_vs_UTG2:  { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','AQs','KQs','AQo'] },
    UTG_vs_LJ:    { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','AQs','KQs','AQo'] },
    UTG_vs_HJ:    { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','AQs','KQs','AQo'] },
    UTG_vs_CO:    { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','AQs','KQs','AQo'] },
    UTG_vs_BTN:   { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','AQs','KQs','AQo'] },
    UTG_vs_SB:    { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','AQs','KQs','AQo'] },
    UTG_vs_BB:    { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','AQs','KQs','AQo'] },
    // ===== UTG+1 opener =====
    UTG1_vs_UTG2: { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','AQs','AJs','KQs','AQo'] },
    UTG1_vs_LJ:   { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','AQs','AJs','KQs','AQo'] },
    UTG1_vs_HJ:   { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','AQs','AJs','KQs','AQo'] },
    UTG1_vs_CO:   { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','AQs','AJs','KQs','AQo'] },
    UTG1_vs_BTN:  { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','AQs','AJs','KQs','AQo'] },
    UTG1_vs_SB:   { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','AQs','KQs','AQo'] },
    UTG1_vs_BB:   { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','AQs','KQs','AQo'] },
    // ===== UTG+2 opener =====
    UTG2_vs_LJ:   { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','88','AQs','AJs','KQs','QJs','JTs','AQo'] },
    UTG2_vs_HJ:   { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','88','AQs','AJs','KQs','QJs','JTs','AQo'] },
    UTG2_vs_CO:   { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','AQs','AJs','KQs','QJs','AQo'] },
    UTG2_vs_BTN:  { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','AQs','AJs','KQs','QJs','AQo'] },
    UTG2_vs_SB:   { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','AQs','AJs','KQs','AQo'] },
    UTG2_vs_BB:   { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','AQs','AJs','KQs','AQo'] },
    // ===== LJ opener =====
    LJ_vs_HJ:     { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','88','AQs','AJs','ATs','KQs','QJs','JTs','T9s','AQo'] },
    LJ_vs_CO:     { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','88','AQs','AJs','KQs','QJs','JTs','T9s','AQo'] },
    LJ_vs_BTN:    { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','88','AQs','AJs','KQs','QJs','JTs','T9s','AQo'] },
    LJ_vs_SB:     { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','88','77','AQs','AJs','KQs','QJs','JTs','T9s','AQo'] },
    LJ_vs_BB:     { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','88','77','AQs','AJs','KQs','QJs','JTs','T9s','AQo'] },
    // ===== HJ opener =====
    HJ_vs_CO:     { "4-bet": ['QQ+','AK'], "Call": ['JJ-66','AQs','AJs','KQs'] },
    HJ_vs_BTN:    { "4-bet": ['QQ+','AK','A5s'], "Call": ['JJ-55','AQs','AJs','KQs'] },
    HJ_vs_SB:     { "4-bet": ['QQ+','AK'], "Call": ['JJ-55','AQs'] },
    HJ_vs_BB:     { "4-bet": ['QQ+','AK'], "Call": ['JJ-55','AQs'] },
    // ===== CO opener =====
    CO_vs_BTN:    { "4-bet": ['QQ+','AK','A5s-A4s'], "Call": ['JJ-55','AQs','AJs','KQs'] },
    CO_vs_SB:     { "4-bet": ['QQ+','AK'], "Call": ['JJ-55','AQs'] },
    CO_vs_BB:     { "4-bet": ['QQ+','AK'], "Call": ['JJ-55','AQs'] },
    // ===== BTN opener =====
    BTN_vs_SB:    { "4-bet": ['QQ+','AK','A5s-A4s'], "Call": ['JJ-44','AQs','AJs','KQs','KJs','QJs','JTs'] },
    BTN_vs_BB:    { "4-bet": ['QQ+','AK','A5s-A4s'], "Call": ['JJ-44','AQs','AJs','KQs','KJs','QJs','JTs'] },
    // ===== SB opener =====
    // ===== SB opener =====
    SB_vs_BB:     { "4-bet": ['AA','KK','QQ','JJ','AKs','AKo'], "Call": ['TT','99','88','77','AQs','AJs','ATs','KQs','QJs','JTs','T9s','AQo'] }
};

const btnFacingLimps = {
    BTN_vs_UTG_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs"],
        "Overlimp": [
            "88","77","66","55","44","33","22",
            "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    BTN_vs_UTG1_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs"],
        "Overlimp": [
            "88","77","66","55","44","33","22",
            "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    BTN_vs_UTG2_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","99","88","AKs","AQs","AJs","ATs","AKo","AQo","KQs","KJs","QJs"],
        "Overlimp": [
            "77","66","55","44","33","22",
            "A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KTs","K9s","QTs","Q9s","JTs","J9s","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    BTN_vs_LJ_Limp: {
        "Iso": [
            "AA","KK","QQ","JJ","TT","99","88","77",
            "AKs","AQs","AJs","ATs","AKo","AQo","AJo",
            "KQs","KJs","QJs","JTs","T9s"
        ],
        "Overlimp": [
            "66","55","44","33","22",
            "A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KTs","K9s","QTs","Q9s","J9s",
            "98s","87s","76s","65s"
        ],
        "Fold": []
    },
    BTN_vs_HJ_Limp: {
        "Iso": [
            "AA","KK","QQ","JJ","TT","99","88","77","66",
            "AKs","AQs","AJs","ATs","A9s",
            "AKo","AQo","AJo",
            "KQs","KJs","KTs","QJs","QTs","JTs","T9s","98s"
        ],
        "Overlimp": [
            "55","44","33","22",
            "A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "K9s","K8s","Q9s","Q8s","J9s","J8s",
            "87s","76s","65s","54s"
        ],
        "Fold": []
    },
    BTN_vs_CO_Limp: {
        "Iso": [
            "AA","KK","QQ","JJ","TT","99","88","77","66","55",
            "AKs","AQs","AJs","ATs","A9s","A8s",
            "AKo","AQo","AJo","ATo",
            "KQs","KJs","KTs","KQo",
            "QJs","QTs","QJo",
            "JTs","JTo",
            "T9s","98s","87s"
        ],
        "Overlimp": [
            "44","33","22",
            "A7s","A6s","A5s","A4s","A3s","A2s",
            "K9s","K8s","K7s",
            "Q9s","Q8s","Q7s",
            "J9s","J8s","J7s",
            "T9o",
            "76s","65s","54s"
        ],
        "Fold": []
    }
};

const coFacingLimps = {
    CO_vs_UTG_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs"],
        "Overlimp": [
            "88","77","66","55","44","33","22",
            "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    CO_vs_UTG1_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs"],
        "Overlimp": [
            "88","77","66","55","44","33","22",
            "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    CO_vs_UTG2_Limp: {
        "Iso": [
            "AA","KK","QQ","JJ","TT","99","88",
            "AKs","AQs","AJs","ATs","AKo","AQo","KQs","KJs","QJs"
        ],
        "Overlimp": [
            "77","66","55","44","33","22",
            "A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KTs","K9s","QTs","Q9s","JTs","J9s","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    CO_vs_LJ_Limp: {
        "Iso": [
            "AA","KK","QQ","JJ","TT","99","88",
            "AKs","AQs","AJs","ATs","AKo","AQo","AJo",
            "KQs","KJs","QJs","JTs","T9s"
        ],
        "Overlimp": [
            "77","66","55","44","33","22",
            "A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KTs","K9s","QTs","Q9s","J9s",
            "98s","87s","76s","65s"
        ],
        "Fold": []
    },
    CO_vs_HJ_Limp: {
        "Iso": [
            "AA","KK","QQ","JJ","TT","99","88","77",
            "AKs","AQs","AJs","ATs","A9s",
            "AKo","AQo","AJo",
            "KQs","KJs","KTs","QJs","QTs","JTs","T9s","98s"
        ],
        "Overlimp": [
            "66","55","44","33","22",
            "A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "K9s","K8s","Q9s","Q8s","J9s","J8s",
            "87s","76s","65s","54s"
        ],
        "Fold": []
    }
};

const hjFacingLimps = {
    HJ_vs_UTG_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs"],
        "Overlimp": [
            "88","77","66","55","44","33","22",
            "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    HJ_vs_UTG1_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs"],
        "Overlimp": [
            "88","77","66","55","44","33","22",
            "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    HJ_vs_UTG2_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs"],
        "Overlimp": [
            "88","77","66","55","44","33","22",
            "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    HJ_vs_LJ_Limp: {
        "Iso": [
            "AA","KK","QQ","JJ","TT","99","88",
            "AKs","AQs","AJs","ATs","AKo","AQo","AJo",
            "KQs","KJs","QJs","JTs","T9s"
        ],
        "Overlimp": [
            "77","66","55","44","33","22",
            "A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KTs","K9s","QTs","Q9s","J9s",
            "98s","87s","76s","65s"
        ],
        "Fold": []
    }
};

const ljFacingLimps = {
    LJ_vs_UTG_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs"],
        "Overlimp": [
            "88","77","66","55","44","33","22",
            "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    LJ_vs_UTG1_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs"],
        "Overlimp": [
            "88","77","66","55","44","33","22",
            "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    LJ_vs_UTG2_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs"],
        "Overlimp": [
            "88","77","66","55","44","33","22",
            "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    }
};

const utg2FacingLimps = {
    UTG2_vs_UTG_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","AKs","AQs","AKo","AQo","KQs"],
        "Overlimp": [
            "99","88","77","66","55","44","33","22",
            "AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    UTG2_vs_UTG1_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","AKs","AQs","AKo","AQo","KQs"],
        "Overlimp": [
            "99","88","77","66","55","44","33","22",
            "AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    }
};

const utg1FacingLimps = {
    UTG1_vs_UTG_Limp: {
        "Iso": ["AA","KK","QQ","JJ","TT","AKs","AQs","AKo","AQo","KQs"],
        "Overlimp": [
            "99","88","77","66","55","44","33","22",
            "AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    }
};

const sbFacingOneLimp = {
    SB_vs_UTG_Limp: {
        "Raise": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs"],
        "Complete": [
            "88","77","66","55","44","33","22",
            "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    SB_vs_UTG1_Limp: {
        "Raise": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs"],
        "Complete": [
            "88","77","66","55","44","33","22",
            "ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    SB_vs_UTG2_Limp: {
        "Raise": [
            "AA","KK","QQ","JJ","TT","99","88",
            "AKs","AQs","AJs","ATs","AKo","AQo","KQs","KJs","QJs"
        ],
        "Complete": [
            "77","66","55","44","33","22",
            "A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KTs","K9s","QTs","Q9s","JTs","J9s","T9s","98s","87s","76s","65s"
        ],
        "Fold": []
    },
    SB_vs_LJ_Limp: {
        "Raise": [
            "AA","KK","QQ","JJ","TT","99","88","77",
            "AKs","AQs","AJs","ATs","AKo","AQo","AJo",
            "KQs","KJs","QJs","JTs","T9s"
        ],
        "Complete": [
            "66","55","44","33","22",
            "A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "KTs","K9s","QTs","Q9s","J9s",
            "98s","87s","76s","65s"
        ],
        "Fold": []
    },
    SB_vs_HJ_Limp: {
        "Raise": [
            "AA","KK","QQ","JJ","TT","99","88","77","66",
            "AKs","AQs","AJs","ATs","A9s","AKo","AQo","AJo",
            "KQs","KJs","KTs","QJs","QTs","JTs","T9s","98s"
        ],
        "Complete": [
            "55","44","33","22",
            "A8s","A7s","A6s","A5s","A4s","A3s","A2s",
            "K9s","K8s","Q9s","Q8s","J9s","J8s",
            "87s","76s","65s","54s"
        ],
        "Fold": []
    },
    SB_vs_CO_Limp: {
        "Raise": [
            "AA","KK","QQ","JJ","TT","99","88","77","66","55",
            "AKs","AQs","AJs","ATs","A9s","A8s",
            "AKo","AQo","AJo","ATo",
            "KQs","KJs","KTs","KQo","QJs","QTs","QJo","JTs","JTo","T9s","98s","87s"
        ],
        "Complete": [
            "44","33","22",
            "A7s","A6s","A5s","A4s","A3s","A2s",
            "K9s","K8s","K7s","Q9s","Q8s","Q7s","J9s","J8s","J7s",
            "76s","65s","54s"
        ],
        "Fold": []
    },
    SB_vs_BTN_Limp: {
        "Raise": [
            "AA","KK","QQ","JJ","TT","99","88","77","66","55","44",
            "AKs","AQs","AJs","ATs","A9s","A8s",
            "AKo","AQo","AJo","ATo",
            "KQs","KJs","KTs","KQo","QJs","QTs","QJo","JTs","JTo","T9s","98s","87s","76s"
        ],
        "Complete": [
            "33","22",
            "A7s","A6s","A5s","A4s","A3s","A2s",
            "K9s","K8s","K7s","Q9s","Q8s","Q7s","J9s","J8s","J7s",
            "65s","54s"
        ],
        "Fold": []
    }
};

const bbFacingLimp = {
    BB_vs_UTG_Limp: {
        "Raise": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs","KJs"],
        "Check": [],
        "Fold": []
    },
    BB_vs_UTG1_Limp: {
        "Raise": ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","AKo","AQo","KQs","KJs"],
        "Check": [],
        "Fold": []
    },
    BB_vs_UTG2_Limp: {
        "Raise": [
            "AA","KK","QQ","JJ","TT","99","88",
            "AKs","AQs","AJs","ATs","AKo","AQo","AJo",
            "KQs","KJs","KTs","QJs"
        ],
        "Check": [],
        "Fold": []
    },
    BB_vs_LJ_Limp: {
        "Raise": [
            "AA","KK","QQ","JJ","TT","99","88","77",
            "AKs","AQs","AJs","ATs","AKo","AQo","AJo",
            "KQs","KJs","KTs","QJs","JTs","T9s"
        ],
        "Check": [],
        "Fold": []
    },
    BB_vs_HJ_Limp: {
        "Raise": [
            "AA","KK","QQ","JJ","TT","99","88","77","66",
            "AKs","AQs","AJs","ATs","A9s","AKo","AQo","AJo","ATo",
            "KQs","KJs","KTs","KQo","QJs","QTs","JTs","T9s","98s"
        ],
        "Check": [],
        "Fold": []
    },
    BB_vs_CO_Limp: {
        "Raise": [
            "AA","KK","QQ","JJ","TT","99","88","77","66","55",
            "AKs","AQs","AJs","ATs","A9s","A8s",
            "AKo","AQo","AJo","ATo",
            "KQs","KJs","KTs","KQo","QJs","QTs","QJo","JTs","JTo","T9s","98s","87s"
        ],
        "Check": [],
        "Fold": []
    },
    BB_vs_BTN_Limp: {
        "Raise": [
            "AA","KK","QQ","JJ","TT","99","88","77","66","55","44",
            "AKs","AQs","AJs","ATs","A9s","A8s","A7s",
            "AKo","AQo","AJo","ATo",
            "KQs","KJs","KTs","KQo","QJs","QTs","QJo","JTs","JTo","T9s","T9o","98s","87s","76s"
        ],
        "Check": [],
        "Fold": []
    }
};

// Merged lookup for all vs-limp ranges
const allFacingLimps = Object.assign({}, btnFacingLimps, coFacingLimps, hjFacingLimps, ljFacingLimps, utg2FacingLimps, utg1FacingLimps, sbFacingOneLimp, bbFacingLimp);

// Helper: get the "raise-like" and "limp-like" arrays from a limp data object
// Handles Iso/Overlimp (non-blind), Raise/Complete (SB), Raise/Check (BB)
function getLimpRaise(d) { return d["Iso"] || d["Raise"] || []; }
function getLimpPassive(d) { return d["Overlimp"] || d["Complete"] || d["Check"] || []; }
function isLimpBlindSpot(d) { return !!d["Raise"] || !!d["Complete"] || !!d["Check"]; }
function isLimpBBSpot(d) { return "Check" in d; }

// ============================================================
// MULTI-LIMP RANGE GENERATION ENGINE
// ============================================================
const LIMPER_MIX_PRESETS = {
    'mostly1': { label: 'Tight (70/22/8)', weights: { '1L': 0.70, '2L': 0.22, '3P': 0.08 } },
    'liveish': { label: 'Live 1/3 (50/32/18)', weights: { '1L': 0.50, '2L': 0.32, '3P': 0.18 } },
    'multiway': { label: 'Active (38/40/22)', weights: { '1L': 0.38, '2L': 0.40, '3P': 0.22 } }
};
let limperMixPreset = 'multiway'; // default: active limpy room
function getLimperMixWeights() { return LIMPER_MIX_PRESETS[limperMixPreset].weights; }
function saveLimperMix() { try { localStorage.setItem(profileKey('gto_limper_mix'), limperMixPreset); } catch(e){} }
function loadLimperMix() { try { const v = localStorage.getItem(profileKey('gto_limper_mix')); if (v && LIMPER_MIX_PRESETS[v]) limperMixPreset = v; } catch(e){} }

// Pick a limper bucket from weights
function pickLimperBucket() {
    const w = getLimperMixWeights();
    const r = Math.random();
    if (r < w['1L']) return '1L';
    if (r < w['1L'] + w['2L']) return '2L';
    return '3P';
}

// Generate valid limper positions for multi-limp scenarios
// limperCount: number of total limpers (1, 2, or 3+)
// heroPos: hero's position
// Returns array of limper positions in table order, all before hero
function generateLimperPositions(limperCount, heroPos) {
    const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];
    const heroIdx = actionOrder.indexOf(heroPos);
    // Positions that can limp: before hero in action order, excluding SB/BB for simplicity
    // (SB completes, BB checks — they don't limp in the traditional sense as first actors)
    const canLimp = actionOrder.slice(0, heroIdx).filter(p => p !== 'SB' && p !== 'BB');
    if (canLimp.length === 0) return [];
    if (canLimp.length < limperCount) return canLimp; // return all available

    // Shuffle and pick limperCount positions, return sorted in table order
    const shuffled = [...canLimp].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, limperCount);
    return picked.sort((a, b) => actionOrder.indexOf(a) - actionOrder.indexOf(b));
}

// Hand classification for tightening
const RANK_VALUES = { A:14,K:13,Q:12,J:11,T:10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2 };
function classifyHandForKeep(hand) {
    const r1 = hand[0], r2 = hand[1], suffix = hand[2] || '';
    const v1 = RANK_VALUES[r1], v2 = RANK_VALUES[r2];
    const isPair = r1 === r2;
    const isSuited = suffix === 's';
    const isOffsuit = suffix === 'o';
    const isBroadway = v1 >= 10 && v2 >= 10;
    const gap = Math.abs(v1 - v2);
    const isConnector = gap === 1;
    const isGapper = gap === 2;
    const isAce = r1 === 'A' || r2 === 'A';

    let score = 0;

    if (isPair) {
        // Premium pairs highest, then descending
        score = 100 + v1; // AA=114, KK=113, ..., 22=102
    } else if (isAce && isSuited) {
        // Suited aces: A5s+ strong, wheel aces decent
        if (v2 >= 12) score = 95; // AKs, AQs
        else if (v2 >= 10) score = 85; // AJs, ATs
        else if (v2 >= 5) score = 60 + v2; // A9s-A5s
        else score = 50 + v2; // A4s-A2s
    } else if (isAce && isOffsuit) {
        if (v2 >= 12) score = 90; // AKo, AQo
        else if (v2 >= 10) score = 70; // AJo, ATo
        else score = 30 + v2; // weak aces
    } else if (isSuited && isBroadway) {
        // KQs, KJs, QJs, JTs, etc
        score = 75 + Math.min(v1, v2) - 10;
    } else if (isOffsuit && isBroadway) {
        // KQo, KJo, QJo, etc — cut first candidates
        score = 40 + Math.min(v1, v2) - 10;
    } else if (isSuited && isConnector) {
        // Suited connectors: 76s+ strong, lower weaker
        score = 55 + Math.min(v1, v2);
    } else if (isSuited && isGapper) {
        // Suited one-gappers
        score = 45 + Math.min(v1, v2);
    } else if (isSuited) {
        // Other suited: K9s, Q9s, J8s etc — dominated suited
        if (v1 >= 13) score = 50 + v2; // Kxs
        else score = 35 + v2; // weaker suited
    } else {
        // Random offsuit
        score = 20 + v2;
    }

    return { score, isPair, isSuited, isConnector: isConnector || isGapper, isAce };
}

// Certain hands should NEVER be "cut" from the aggressive (raise/iso) bucket in multi-limp tightening.
// These are the hands that retain strong EV from isolating even when more limp callers are present.
function isProtectedMultiLimpHand(hand) {
const r1 = hand[0], r2 = hand[1], sfx = hand[2] || '';
const v1 = RANK_VALUES[r1], v2 = RANK_VALUES[r2];
const hi = Math.max(v1, v2), lo = Math.min(v1, v2);
const isPair = r1 === r2;
const isSuited = sfx === 's';
const isAce = r1 === 'A' || r2 === 'A';
const isBroadway = v1 >= 10 && v2 >= 10;

// Keep big pairs raising (they don't want multiway)
if (isPair && hi >= 9) return true; // 99+

// Keep strong Ax raising (value + denies equity); at minimum AQ/AK always.
if (isAce && lo >= 12) return true; // AQ/AK suited or offsuit
if (isAce && isSuited && lo >= 10) return true; // ATs+

// Keep suited broadways raising (including JTs/T9s which play well and deny equity)
if (isSuited && isBroadway) return true;

return false;
}


// Deterministic multi-limp range generation
// baseData: the 1-limp range data object (with Iso/Raise/Overlimp/Complete/Check/Fold keys)
// bucket: '2L' or '3P'
// oopFlag: true if hero is SB or BB
const _multiLimpCache = {};
function generateMultiLimpRanges(baseData, bucket, oopFlag) {
    if (!baseData) return null;
    // Create cache key from the raise+passive arrays + bucket + oopFlag
    const raiseArr = getLimpRaise(baseData);
    const passiveArr = getLimpPassive(baseData);
    const cacheKey = JSON.stringify(raiseArr) + '|' + JSON.stringify(passiveArr) + '|' + bucket + '|' + oopFlag;
    if (_multiLimpCache[cacheKey]) return _multiLimpCache[cacheKey];

    // Tightening percentages
    let cutPct = bucket === '2L' ? 0.25 : 0.45;
    if (oopFlag) cutPct = Math.min(cutPct + 0.12, 0.65);

    // Expand raise hands and score them
    const raiseExpanded = [];
    const raiseSet = new Set();
    // We need to expand the range tokens into individual hands
    // Use a helper to iterate the range
    for (const token of raiseArr) {
        const hands = _expandSingleToken(token);
        hands.forEach(h => {
            if (!raiseSet.has(h)) {
                raiseSet.add(h);
                raiseExpanded.push({ hand: h, ...classifyHandForKeep(h), protected: isProtectedMultiLimpHand(h) });
            }
        });
    }

    // Sort by keepScore ascending (weakest first = cut first)
    raiseExpanded.sort((a, b) => a.score - b.score);

    // Only cut from NON-protected hands, so we never demote core value isolates like AQ/AK or suited broadways.
    const cutPool = raiseExpanded.filter(x => !x.protected);
    const desiredCuts = Math.round(raiseExpanded.length * cutPct);
    const numCut = Math.min(desiredCuts, cutPool.length);

    // Build the cut set from the weakest non-protected hands
    const cutSet = new Set(cutPool.slice(0, numCut).map(x => x.hand));
    const cutHands = raiseExpanded.filter(x => cutSet.has(x.hand));
    const keptHands = raiseExpanded.filter(x => !cutSet.has(x.hand));

    // Build passive set for reference
    const passiveSet = new Set();
    for (const token of passiveArr) {
        _expandSingleToken(token).forEach(h => passiveSet.add(h));
    }

    // Reassign cut hands
    const movedToPassive = [];
    const movedToFold = [];
    cutHands.forEach(c => {
        // Pairs, suited connectors/gappers, suited aces, and strong offsuit Ax/broadways => move to passive
        const v1 = RANK_VALUES[c.hand[0]], v2 = RANK_VALUES[c.hand[1]];
        const hi = Math.max(v1, v2), lo = Math.min(v1, v2);
        const isAce = (c.hand[0] === 'A' || c.hand[1] === 'A');
        const isOff = (c.hand[2] === 'o');
        const isBroadway = v1 >= 10 && v2 >= 10;
        if (c.isPair || (c.isSuited && c.isConnector) || (c.isSuited && c.isAce) || (isAce && isOff && lo >= 10) || (isOff && isBroadway && lo >= 11)) {
            movedToPassive.push(c.hand);
        } else {
            movedToFold.push(c.hand);
        }
    });

    // Build new range object preserving the same action key structure
    const isBB = "Check" in baseData;
    const isBlinds = !!baseData["Raise"];
    const newRaise = keptHands.map(h => h.hand);
    const newPassive = [...passiveArr, ...movedToPassive];
    const newFold = [...(baseData["Fold"] || []), ...movedToFold];

    let result;
    if (isBB) {
        result = { "Raise": newRaise, "Check": newPassive, "Fold": newFold };
    } else if (isBlinds) {
        result = { "Raise": newRaise, "Complete": newPassive, "Fold": newFold };
    } else {
        result = { "Iso": newRaise, "Overlimp": newPassive, "Fold": newFold };
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[MultiLimp] ${bucket} oopFlag=${oopFlag}: cut ${numCut}/${raiseExpanded.length} from raise → ${movedToPassive.length} to passive, ${movedToFold.length} to fold`);
    }

    _multiLimpCache[cacheKey] = result;
    return result;
}

// Expand a single range token into explicit hands (lightweight, no dependency on validator)
function _expandSingleToken(token) {
    const _R = RANKS;
    const hands = [];
    const t = token.trim();
    if (!t) return hands;

    // Exact hand: "AKs", "77", "AKo"
    if (/^[AKQJT2-9]{2}[so]?$/.test(t) && !t.includes('+') && !t.includes('-')) {
        if (t.length === 2 && t[0] !== t[1]) { hands.push(t+'s', t+'o'); }
        else hands.push(t);
        return hands;
    }

    // "XX+"
    if (t.endsWith('+')) {
        const base = t.slice(0, -1);
        const suffix = base.endsWith('s') ? 's' : base.endsWith('o') ? 'o' : '';
        const r1 = base[0], r2 = suffix ? base[1] : base[1];
        const ri1 = _R.indexOf(r1), ri2 = _R.indexOf(r2);
        if (r1 === r2 && !suffix) {
            for (let i = 0; i <= ri1; i++) hands.push(_R[i]+_R[i]);
        } else if (suffix) {
            for (let i = 0; i <= ri2; i++) { if (_R.indexOf(r1) !== i) hands.push(r1+_R[i]+suffix); }
        } else {
            for (let i = 0; i <= ri2; i++) { if (_R.indexOf(r1) !== i) { hands.push(r1+_R[i]+'s'); hands.push(r1+_R[i]+'o'); } }
        }
        return hands;
    }

    // "XX-YY"
    if (t.includes('-')) {
        const [s, e] = t.split('-');
        const sSuffix = s.endsWith('s') ? 's' : s.endsWith('o') ? 'o' : '';
        const eSuffix = e.endsWith('s') ? 's' : e.endsWith('o') ? 'o' : '';
        const sR1 = s[0], sR2 = s[1], eR1 = e[0], eR2 = e[1];
        const sRi1 = _R.indexOf(sR1), sRi2 = _R.indexOf(sR2);
        const eRi1 = _R.indexOf(eR1), eRi2 = _R.indexOf(eR2);
        if (sR1 === sR2 && !sSuffix && eR1 === eR2 && !eSuffix) {
            for (let i = sRi1; i <= eRi1; i++) hands.push(_R[i]+_R[i]);
        } else if (sSuffix === eSuffix && sR1 === eR1) {
            for (let i = sRi2; i <= eRi2; i++) hands.push(sR1+_R[i]+sSuffix);
        } else if (!sSuffix && !eSuffix && sR1 === eR1) {
            for (let i = sRi2; i <= eRi2; i++) { hands.push(sR1+_R[i]+'s'); hands.push(sR1+_R[i]+'o'); }
        }
        return hands;
    }

    hands.push(t);
    return hands;
}

// Get limp range data for any bucket, using generated ranges for 2L/3P
function getLimpDataForBucket(heroPos, firstLimpPos, bucket) {
    const baseKey = `${heroPos}_vs_${firstLimpPos}_Limp`;
    const baseData = allFacingLimps[baseKey];
    if (!bucket || bucket === '1L') return baseData || null;
    if (!baseData) {
        if (window.RANGE_VALIDATE) console.warn(`[MultiLimp] Fallback: no base 1L data for ${baseKey}`);
        return null; // fallback handled by caller
    }
    const oopFlag = heroPos === 'SB' || heroPos === 'BB';
    return generateMultiLimpRanges(baseData, bucket, oopFlag);
}

// Push/fold Nash equilibrium ranges for 6-9 handed live cash
// Keyed as: PF_PUSH[stackBB][heroPos] = [...hands to shove]
// Keyed as: PF_CALL_BB[stackBB][oppPos] = [...hands to call a shove from BB]
// Stack depths: 5, 8, 10, 13, 15, 20

const PF_STACK_DEPTHS = [5, 8, 10, 13, 15, 20];

// Push ranges (shove or fold, unopened pot)
const PF_PUSH = {
  5: {
UTG:  ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","K7s","KQo","KJo","QJs","QTs","Q9s","JTs","J9s","T9s"],
UTG1: ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","KQs","KJs","KTs","K9s","K8s","K7s","KQo","KJo","QJs","QTs","Q9s","JTs","J9s","T9s"],
UTG2: ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","KQo","KJo","KTo","QJs","QTs","Q9s","JTs","J9s","T9s","98s"],
LJ:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","KQo","KJo","KTo","QJs","QTs","Q9s","Q8s","JTs","J9s","T9s","98s","87s"],
HJ:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","KQo","KJo","KTo","K9o","QJs","QTs","Q9s","Q8s","JTs","J9s","J8s","T9s","T8s","98s","87s","76s"],
CO:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","KQo","KJo","KTo","K9o","QJs","QTs","Q9s","Q8s","Q7s","JTs","J9s","J8s","T9s","T8s","98s","87s","76s","65s"],
BTN:  ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","K4s","KQo","KJo","KTo","K9o","K8o","QJs","QTs","Q9s","Q8s","Q7s","Q6s","JTs","J9s","J8s","J7s","T9s","T8s","T7s","98s","87s","76s","65s","54s"],
SB:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o","A4o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","K4s","K3s","KQo","KJo","KTo","K9o","K8o","K7o","QJs","QTs","Q9s","Q8s","Q7s","Q6s","Q5s","JTs","J9s","J8s","J7s","J6s","T9s","T8s","T7s","98s","97s","87s","86s","76s","75s","65s","64s","54s","53s"]
  },
  8: {
UTG:  ["AA","KK","QQ","JJ","TT","99","88","77","66","55","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","KQs","KJs","KTs","K9s","KQo","QJs","QTs","JTs"],
UTG1: ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","KQo","KJo","QJs","QTs","JTs"],
UTG2: ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","KQo","KJo","QJs","QTs","Q9s","JTs","J9s","T9s"],
LJ:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","KQs","KJs","KTs","K9s","K8s","K7s","KQo","KJo","KTo","QJs","QTs","Q9s","JTs","J9s","T9s","98s"],
HJ:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","KQo","KJo","KTo","QJs","QTs","Q9s","Q8s","JTs","J9s","T9s","98s","87s"],
CO:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","KQo","KJo","KTo","K9o","QJs","QTs","Q9s","Q8s","JTs","J9s","J8s","T9s","T8s","98s","87s","76s"],
BTN:  ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","KQo","KJo","KTo","K9o","QJs","QTs","Q9s","Q8s","Q7s","JTs","J9s","J8s","T9s","T8s","98s","87s","76s","65s"],
SB:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","K4s","KQo","KJo","KTo","K9o","K8o","QJs","QTs","Q9s","Q8s","Q7s","Q6s","JTs","J9s","J8s","J7s","T9s","T8s","T7s","98s","97s","87s","76s","65s","54s"]
  },
  10: {
UTG:  ["AA","KK","QQ","JJ","TT","99","88","77","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A5s","AKo","AQo","AJo","KQs","KJs","KTs","KQo","QJs"],
UTG1: ["AA","KK","QQ","JJ","TT","99","88","77","66","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","AKo","AQo","AJo","ATo","KQs","KJs","KTs","KQo","QJs","QTs","JTs"],
UTG2: ["AA","KK","QQ","JJ","TT","99","88","77","66","55","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","AKo","AQo","AJo","ATo","KQs","KJs","KTs","K9s","KQo","KJo","QJs","QTs","JTs"],
LJ:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","KQo","KJo","QJs","QTs","Q9s","JTs","J9s","T9s"],
HJ:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","K7s","KQo","KJo","KTo","QJs","QTs","Q9s","JTs","J9s","T9s","98s"],
CO:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","KQs","KJs","KTs","K9s","K8s","K7s","KQo","KJo","KTo","QJs","QTs","Q9s","Q8s","JTs","J9s","T9s","98s","87s"],
BTN:  ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","KQo","KJo","KTo","K9o","QJs","QTs","Q9s","Q8s","JTs","J9s","J8s","T9s","T8s","98s","87s","76s"],
SB:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","KQo","KJo","KTo","K9o","QJs","QTs","Q9s","Q8s","Q7s","JTs","J9s","J8s","T9s","T8s","98s","87s","76s","65s"]
  },
  13: {
UTG:  ["AA","KK","QQ","JJ","TT","99","88","AKs","AQs","AJs","ATs","A9s","A8s","A5s","AKo","AQo","AJo","KQs","KJs","KQo"],
UTG1: ["AA","KK","QQ","JJ","TT","99","88","77","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A5s","AKo","AQo","AJo","ATo","KQs","KJs","KTs","KQo","QJs"],
UTG2: ["AA","KK","QQ","JJ","TT","99","88","77","66","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","AKo","AQo","AJo","ATo","KQs","KJs","KTs","KQo","KJo","QJs","QTs","JTs"],
LJ:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","KQo","KJo","QJs","QTs","JTs","T9s"],
HJ:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","KQo","KJo","KTo","QJs","QTs","Q9s","JTs","J9s","T9s","98s"],
CO:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","KQs","KJs","KTs","K9s","K8s","K7s","KQo","KJo","KTo","QJs","QTs","Q9s","JTs","J9s","T9s","98s","87s"],
BTN:  ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","KQo","KJo","KTo","K9o","QJs","QTs","Q9s","Q8s","JTs","J9s","J8s","T9s","T8s","98s","87s","76s"],
SB:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","KQo","KJo","KTo","K9o","QJs","QTs","Q9s","Q8s","JTs","J9s","J8s","T9s","T8s","98s","87s","76s","65s"]
  },
  15: {
UTG:  ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","ATs","A9s","A5s","AKo","AQo","AJo","KQs","KQo"],
UTG1: ["AA","KK","QQ","JJ","TT","99","88","AKs","AQs","AJs","ATs","A9s","A8s","A5s","AKo","AQo","AJo","KQs","KJs","KQo"],
UTG2: ["AA","KK","QQ","JJ","TT","99","88","77","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A5s","AKo","AQo","AJo","ATo","KQs","KJs","KQo","QJs"],
LJ:   ["AA","KK","QQ","JJ","TT","99","88","77","66","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","AKo","AQo","AJo","ATo","KQs","KJs","KTs","KQo","KJo","QJs","QTs","JTs"],
HJ:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","KQo","KJo","QJs","QTs","JTs","T9s"],
CO:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","KQo","KJo","KTo","QJs","QTs","Q9s","JTs","J9s","T9s","98s"],
BTN:  ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","KQs","KJs","KTs","K9s","K8s","K7s","KQo","KJo","KTo","QJs","QTs","Q9s","JTs","J9s","T9s","98s","87s"],
SB:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","KQo","KJo","KTo","K9o","QJs","QTs","Q9s","Q8s","JTs","J9s","J8s","T9s","T8s","98s","87s","76s"]
  },
  20: {
UTG:  ["AA","KK","QQ","JJ","TT","AKs","AQs","AJs","ATs","AKo","AQo","KQs"],
UTG1: ["AA","KK","QQ","JJ","TT","99","AKs","AQs","AJs","ATs","A9s","AKo","AQo","AJo","KQs","KQo"],
UTG2: ["AA","KK","QQ","JJ","TT","99","88","AKs","AQs","AJs","ATs","A9s","A5s","AKo","AQo","AJo","KQs","KJs","KQo"],
LJ:   ["AA","KK","QQ","JJ","TT","99","88","77","AKs","AQs","AJs","ATs","A9s","A8s","A5s","AKo","AQo","AJo","ATo","KQs","KJs","KTs","KQo","QJs","JTs"],
HJ:   ["AA","KK","QQ","JJ","TT","99","88","77","66","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A5s","AKo","AQo","AJo","ATo","KQs","KJs","KTs","K9s","KQo","KJo","QJs","QTs","JTs","T9s"],
CO:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","KQo","KJo","QJs","QTs","JTs","T9s","98s"],
BTN:  ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","AKo","AQo","AJo","ATo","A9o","A8o","KQs","KJs","KTs","K9s","K8s","K7s","KQo","KJo","KTo","QJs","QTs","Q9s","JTs","J9s","T9s","98s","87s"],
SB:   ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","KQo","KJo","KTo","QJs","QTs","Q9s","Q8s","JTs","J9s","J8s","T9s","T8s","98s","87s","76s"]
  }
};

// BB call ranges vs a shove (getting ~2:1 roughly, varies by stack)
const PF_CALL_BB = {
  5:  { UTG:"AA,KK,QQ,JJ,TT,99,88,77,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,AKo,AQo,AJo,ATo,A9o,KQs,KJs,KTs,K9s,KQo,QJs".split(","), SB:"AA,KK,QQ,JJ,TT,99,88,77,66,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,AKo,AQo,AJo,ATo,KQs,KJs,KTs,K9s,KQo,KJo,QJs,QTs,JTs".split(",") },
  8:  { UTG:"AA,KK,QQ,JJ,TT,99,AKs,AQs,AJs,ATs,A9s,A8s,A5s,AKo,AQo,AJo,KQs,KQo".split(","), SB:"AA,KK,QQ,JJ,TT,99,88,77,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A5s,AKo,AQo,AJo,ATo,KQs,KJs,KTs,KQo,QJs,JTs".split(",") },
  10: { UTG:"AA,KK,QQ,JJ,TT,AKs,AQs,AJs,ATs,A5s,AKo,AQo,KQs".split(","), SB:"AA,KK,QQ,JJ,TT,99,88,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A5s,AKo,AQo,AJo,KQs,KJs,KTs,KQo,QJs".split(",") },
  13: { UTG:"AA,KK,QQ,JJ,TT,AKs,AQs,AJs,AKo,KQs".split(","), SB:"AA,KK,QQ,JJ,TT,99,AKs,AQs,AJs,ATs,A9s,A5s,AKo,AQo,AJo,KQs,KJs,KQo".split(",") },
  15: { UTG:"AA,KK,QQ,JJ,AKs,AQs,AKo".split(","), SB:"AA,KK,QQ,JJ,TT,99,AKs,AQs,AJs,ATs,A5s,AKo,AQo,KQs,KQo".split(",") },
  20: { UTG:"AA,KK,QQ,AKs,AKo".split(","), SB:"AA,KK,QQ,JJ,TT,AKs,AQs,AJs,AKo,AQo,KQs".split(",") }
};


// ============================================================
// SQUEEZE RANGES (open + 1 caller)
// ============================================================
const squeezeRanges = {
    CO_vs_UTG_RFI_UTG1_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs"],
        "Fold": []
    },
    CO_vs_UTG_RFI_UTG2_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    CO_vs_UTG_RFI_LJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    CO_vs_UTG_RFI_HJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    CO_vs_UTG1_RFI_UTG2_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    CO_vs_UTG1_RFI_LJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    CO_vs_UTG1_RFI_HJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["99","88","AQs","KQs"],
        "Fold": []
    },
    CO_vs_UTG2_RFI_LJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"],
        "SqueezeBluff": [],
        "Call": ["99","88","KQs"],
        "Fold": []
    },
    CO_vs_UTG2_RFI_HJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"],
        "SqueezeBluff": [],
        "Call": ["99","88","KQs"],
        "Fold": []
    },
    CO_vs_LJ_RFI_HJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"],
        "SqueezeBluff": [],
        "Call": ["99","88","KQs"],
        "Fold": []
    },
    BTN_vs_UTG_RFI_UTG1_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs"],
        "Fold": []
    },
    BTN_vs_UTG_RFI_UTG2_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    BTN_vs_UTG_RFI_LJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    BTN_vs_UTG_RFI_HJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    BTN_vs_UTG_RFI_CO_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    BTN_vs_UTG1_RFI_UTG2_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    BTN_vs_UTG1_RFI_LJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["99","88","AQs","KQs"],
        "Fold": []
    },
    BTN_vs_UTG1_RFI_HJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"],
        "SqueezeBluff": [],
        "Call": ["99","88","KQs"],
        "Fold": []
    },
    BTN_vs_UTG1_RFI_CO_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"],
        "SqueezeBluff": [],
        "Call": ["99","88","KQs"],
        "Fold": []
    },
    BTN_vs_UTG2_RFI_LJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"],
        "SqueezeBluff": [],
        "Call": ["99","88","KQs"],
        "Fold": []
    },
    BTN_vs_UTG2_RFI_HJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs"],
        "SqueezeBluff": [],
        "Call": ["88","77","KQs","AJs"],
        "Fold": []
    },
    BTN_vs_UTG2_RFI_CO_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs"],
        "SqueezeBluff": [],
        "Call": ["88","77","KQs","KJs"],
        "Fold": []
    },
    BTN_vs_LJ_RFI_HJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"],
        "SqueezeBluff": [],
        "Call": ["99","88","KQs"],
        "Fold": []
    },
    BTN_vs_LJ_RFI_CO_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs"],
        "SqueezeBluff": [],
        "Call": ["88","77","KQs","KJs"],
        "Fold": []
    },
    BTN_vs_HJ_RFI_CO_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","99","88","AKs","AQs","AJs","AKo","AQo","KQs","KJs","A5s","A4s"],
        "SqueezeBluff": ["A5s","A4s"],
        "Call": ["77","66","QJs","JTs"],
        "Fold": []
    },
    HJ_vs_UTG_RFI_UTG1_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs"],
        "Fold": []
    },
    HJ_vs_UTG_RFI_UTG2_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs"],
        "Fold": []
    },
    HJ_vs_UTG_RFI_LJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    HJ_vs_UTG1_RFI_UTG2_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs"],
        "Fold": []
    },
    HJ_vs_UTG1_RFI_LJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    HJ_vs_UTG2_RFI_LJ_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs","KQs"],
        "Fold": []
    },
    LJ_vs_UTG_RFI_UTG1_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs"],
        "Fold": []
    },
    LJ_vs_UTG_RFI_UTG2_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs"],
        "Fold": []
    },
    LJ_vs_UTG1_RFI_UTG2_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs"],
        "Fold": []
    },
    UTG2_vs_UTG_RFI_UTG1_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"],
        "SqueezeBluff": [],
        "Call": ["TT","99","AQs"],
        "Fold": []
    },
    SB_vs_UTG_RFI_UTG1_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_UTG2_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_UTG2_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG2_RFI_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG2_RFI_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG2_RFI_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG2_RFI_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_LJ_RFI_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_LJ_RFI_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_LJ_RFI_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_HJ_RFI_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","KQs"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_HJ_RFI_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","A5s"], "SqueezeBluff": ["A5s"], "Call": [], "Fold": [] },
    SB_vs_CO_RFI_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs","KQs","A5s"], "SqueezeBluff": ["A5s"], "Call": [], "Fold": [] },
    BB_vs_UTG_RFI_UTG1_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs"], "Fold": [] },
    BB_vs_UTG_RFI_UTG2_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs"], "Fold": [] },
    BB_vs_UTG_RFI_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_UTG2_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs"], "Fold": [] },
    BB_vs_UTG1_RFI_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": ["99","88","AQs","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": ["99","88","AQs","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["99","88","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["99","88","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["99","88","KQs"], "Fold": [] },
    BB_vs_LJ_RFI_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["99","88","KQs"], "Fold": [] },
    BB_vs_LJ_RFI_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["88","77","KQs"], "Fold": [] },
    BB_vs_LJ_RFI_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs"], "SqueezeBluff": [], "Call": ["88","77","KQs","KJs"], "Fold": [] },
    BB_vs_LJ_RFI_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["88","77","KQs","KJs"], "Fold": [] },
    BB_vs_HJ_RFI_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs"], "SqueezeBluff": [], "Call": ["88","77","KQs","KJs"], "Fold": [] },
    BB_vs_HJ_RFI_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","88","AKs","AKo","AQs","AJs","A5s"], "SqueezeBluff": ["A5s"], "Call": ["77","66","KQs","KJs","QJs"], "Fold": [] },
    BB_vs_HJ_RFI_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs"], "SqueezeBluff": [], "Call": ["77","66","KQs","KJs"], "Fold": [] },
    BB_vs_CO_RFI_BTN_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","99","88","AKs","AQs","AJs","AKo","AQo","KQs","KJs","A5s","A4s"],
        "SqueezeBluff": ["A5s","A4s"],
        "Call": ["77","66","QJs","JTs"],
        "Fold": []
    },
    BB_vs_CO_RFI_SB_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","99","88","AKs","AQs","AJs","AKo","KQs","KJs"],
        "SqueezeBluff": [],
        "Call": ["77","66","QJs"],
        "Fold": []
    },
    BB_vs_BTN_RFI_SB_Call: {
        "Squeeze": ["AA","KK","QQ","JJ","TT","99","88","AKs","AQs","AJs","ATs","AKo","AQo","KQs","KJs","QJs","A5s","A4s"],
        "SqueezeBluff": ["A5s","A4s"],
        "Call": ["77","66","55","JTs","T9s"],
        "Fold": []
    }
};

// ============================================================
// SQUEEZE RANGES vs RFI + 2 CALLERS
// ============================================================
const squeezeVsRfiTwoCallers = {
    // LJ (1 valid spot)
    LJ_vs_UTG_RFI_UTG1_Call_UTG2_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    // HJ (4 valid spots)
    HJ_vs_UTG_RFI_UTG1_Call_UTG2_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    HJ_vs_UTG_RFI_UTG1_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    HJ_vs_UTG_RFI_UTG2_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    HJ_vs_UTG1_RFI_UTG2_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    // CO (10 valid spots)
    CO_vs_UTG_RFI_UTG1_Call_UTG2_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    CO_vs_UTG_RFI_UTG1_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    CO_vs_UTG_RFI_UTG1_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    CO_vs_UTG_RFI_UTG2_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    CO_vs_UTG_RFI_UTG2_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    CO_vs_UTG_RFI_LJ_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    CO_vs_UTG1_RFI_UTG2_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    CO_vs_UTG1_RFI_UTG2_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    CO_vs_UTG1_RFI_LJ_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    CO_vs_UTG2_RFI_LJ_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": ["99","88","AQs","KQs"], "Fold": [] },
    // BTN (20 valid spots)
    BTN_vs_UTG_RFI_UTG1_Call_UTG2_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG_RFI_UTG1_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG_RFI_UTG1_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG_RFI_UTG1_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG_RFI_UTG2_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG_RFI_UTG2_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG_RFI_UTG2_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG_RFI_LJ_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG_RFI_LJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG_RFI_HJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG1_RFI_UTG2_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG1_RFI_UTG2_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG1_RFI_UTG2_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG1_RFI_LJ_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG1_RFI_LJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG1_RFI_HJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG2_RFI_LJ_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": ["99","88","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG2_RFI_LJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": ["99","88","AQs","KQs"], "Fold": [] },
    BTN_vs_UTG2_RFI_HJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["99","88","KQs"], "Fold": [] },
    BTN_vs_LJ_RFI_HJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["99","88","KQs"], "Fold": [] },
    // SB (35 valid spots — squeeze-or-fold only)
    SB_vs_UTG_RFI_UTG1_Call_UTG2_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_UTG1_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_UTG1_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_UTG1_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_UTG1_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_UTG2_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_UTG2_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_UTG2_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_UTG2_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_LJ_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_LJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_LJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_HJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_HJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG_RFI_CO_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_UTG2_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_UTG2_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_UTG2_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_UTG2_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_LJ_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_LJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_LJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_HJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_HJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG1_RFI_CO_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG2_RFI_LJ_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG2_RFI_LJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG2_RFI_LJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG2_RFI_HJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG2_RFI_HJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_UTG2_RFI_CO_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_LJ_RFI_HJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_LJ_RFI_HJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_LJ_RFI_CO_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": [], "Fold": [] },
    SB_vs_HJ_RFI_CO_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs","A5s","A4s"], "SqueezeBluff": ["A5s","A4s"], "Call": [], "Fold": [] },
    // BB (56 valid spots)
    BB_vs_UTG_RFI_UTG1_Call_UTG2_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_UTG1_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_UTG1_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_UTG1_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_UTG1_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_UTG1_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_UTG2_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_UTG2_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_UTG2_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_UTG2_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_UTG2_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_LJ_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_LJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_LJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_LJ_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_HJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_HJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_HJ_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_CO_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_CO_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG_RFI_BTN_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_UTG2_Call_LJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_UTG2_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_UTG2_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_UTG2_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_UTG2_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_LJ_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_LJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_LJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_LJ_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_HJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_HJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_HJ_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_CO_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_CO_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG1_RFI_BTN_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","AKs","AKo"], "SqueezeBluff": [], "Call": ["TT","99","AQs","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_LJ_Call_HJ_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": ["99","88","AQs","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_LJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": ["99","88","AQs","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_LJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": ["99","88","AQs","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_LJ_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": ["99","88","AQs","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_HJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": ["99","88","AQs","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_HJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": ["99","88","AQs","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_HJ_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo"], "SqueezeBluff": [], "Call": ["99","88","AQs","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_CO_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["99","88","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_CO_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["99","88","KQs"], "Fold": [] },
    BB_vs_UTG2_RFI_BTN_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["99","88","KQs"], "Fold": [] },
    BB_vs_LJ_RFI_HJ_Call_CO_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["99","88","KQs"], "Fold": [] },
    BB_vs_LJ_RFI_HJ_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["99","88","KQs"], "Fold": [] },
    BB_vs_LJ_RFI_HJ_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["99","88","KQs"], "Fold": [] },
    BB_vs_LJ_RFI_CO_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["88","77","KQs"], "Fold": [] },
    BB_vs_LJ_RFI_CO_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs"], "SqueezeBluff": [], "Call": ["88","77","KQs"], "Fold": [] },
    BB_vs_LJ_RFI_BTN_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs"], "SqueezeBluff": [], "Call": ["88","77","KQs","KJs"], "Fold": [] },
    BB_vs_HJ_RFI_CO_Call_BTN_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs"], "SqueezeBluff": [], "Call": ["88","77","KQs","KJs"], "Fold": [] },
    BB_vs_HJ_RFI_CO_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs"], "SqueezeBluff": [], "Call": ["88","77","KQs","KJs"], "Fold": [] },
    BB_vs_HJ_RFI_BTN_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","88","AKs","AKo","AQs","AJs","A5s"], "SqueezeBluff": ["A5s"], "Call": ["77","66","KQs","KJs","QJs"], "Fold": [] },
    BB_vs_CO_RFI_BTN_Call_SB_Call: { "Squeeze": ["AA","KK","QQ","JJ","TT","99","88","AKs","AQs","AJs","AKo","AQo","KQs","KJs","A5s","A4s"], "SqueezeBluff": ["A5s","A4s"], "Call": ["77","66","QJs","JTs","T9s"], "Fold": [] }
};

// Check if a hand is in the SqueezeBluff subset (graceful if key missing)
function isSqueezeBluff(hand, data) {
    if (!data || !data["SqueezeBluff"] || data["SqueezeBluff"].length === 0) return false;
    return checkRangeHelper(hand, data["SqueezeBluff"]);
}

// Parse squeeze 2-caller key: "CO_vs_UTG_RFI_UTG1_Call_UTG2_Call" -> {hero, opener, caller1, caller2} (must check before 1-caller)
function parseSqueeze2CKey(k) {
    const m = k.match(/^(.+?)_vs_(.+?)_RFI_(.+?)_Call_(.+?)_Call$/);
    return m ? { hero: m[1], opener: m[2], caller1: m[3], caller2: m[4] } : null;
}

// Parse squeeze key: "CO_vs_UTG_RFI_LJ_Call" -> {hero:"CO", opener:"UTG", caller:"LJ"}
function parseSqueezeKey(k) {
    const m = k.match(/^(.+?)_vs_(.+?)_RFI_(.+?)_Call$/);
    return m ? { hero: m[1], opener: m[2], caller: m[3] } : null;
}

function normalizePos(pos) {
    if (!pos) return 'OTHER';
    switch (pos) {
        case 'UTG': case 'UTG1': case 'UTG2': return 'EP';
        case 'LJ': case 'HJ': return 'MP';
        case 'CO': case 'BTN': return 'LP';
        case 'SB': return 'SB';
        case 'BB': return 'BB';
        default: return 'OTHER';
    }
}

// ============================================================
// POSTFLOP MODULE — General Architecture (Phase 1: Flop C-Bet)
// ============================================================
const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' };
const SUITS = ['s', 'h', 'd', 'c'];
const RANK_NUM = { A:14,K:13,Q:12,J:11,T:10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2 };
const FLOP_ARCHETYPES = ['A_HIGH_DRY','A_HIGH_DYNAMIC','BROADWAY_STATIC','BROADWAY_DYNAMIC','MID_DISCONNECTED','MID_CONNECTED','LOW_DISCONNECTED','LOW_CONNECTED','PAIRED_HIGH','PAIRED_LOW','MONOTONE','TRIPS'];
const FLOP_ARCHETYPE_WEIGHTS = { A_HIGH_DRY:0.12,A_HIGH_DYNAMIC:0.10,BROADWAY_STATIC:0.11,BROADWAY_DYNAMIC:0.10,MID_DISCONNECTED:0.09,MID_CONNECTED:0.09,LOW_DISCONNECTED:0.08,LOW_CONNECTED:0.08,PAIRED_HIGH:0.06,PAIRED_LOW:0.05,MONOTONE:0.08,TRIPS:0.04 };
const POSTFLOP_PREFLOP_FAMILIES = {
    BTN_vs_BB:{heroPos:'BTN',villainPos:'BB',positionState:'IP'}, CO_vs_BB:{heroPos:'CO',villainPos:'BB',positionState:'IP'},
    HJ_vs_BB:{heroPos:'HJ',villainPos:'BB',positionState:'IP'}, LJ_vs_BB:{heroPos:'LJ',villainPos:'BB',positionState:'IP'},
    SB_vs_BB:{heroPos:'SB',villainPos:'BB',positionState:'OOP'}, BTN_vs_SB:{heroPos:'BTN',villainPos:'SB',positionState:'IP'},
    CO_vs_BTN:{heroPos:'CO',villainPos:'BTN',positionState:'OOP'}, UTG_vs_BB:{heroPos:'UTG',villainPos:'BB',positionState:'IP'}
};
function classifyFlop(cards) {
    const ranks = cards.map(c => RANK_NUM[c.rank]).sort((a,b) => b-a); const suits = cards.map(c => c.suit);
    let pairedness; if (ranks[0]===ranks[1]&&ranks[1]===ranks[2]) pairedness='trips'; else if (ranks[0]===ranks[1]||ranks[1]===ranks[2]||ranks[0]===ranks[2]) pairedness='paired'; else pairedness='unpaired';
    let flushiness; const suitSet=new Set(suits); if (suitSet.size===1) flushiness='monotone'; else if (suitSet.size===2) flushiness='two_tone'; else flushiness='rainbow';
    const gap1=ranks[0]-ranks[1],gap2=ranks[1]-ranks[2],totalSpread=ranks[0]-ranks[2];
    let connectivity; if (totalSpread<=4&&gap1<=2&&gap2<=2) connectivity='heavy_connected'; else if ((gap1<=2&&gap2<=2)||(gap1<=1||gap2<=1)) connectivity='connected'; else if (gap1<=3||gap2<=3) connectivity='semi_connected'; else connectivity='disconnected';
    let highCard; if (ranks[0]===14) highCard='ace_high'; else if (ranks[0]>=10) highCard='broadway_high'; else if (ranks[0]>=7) highCard='mid_high'; else highCard='low_high';
    const isWet=flushiness==='monotone'||connectivity==='heavy_connected'||connectivity==='connected'||(flushiness==='two_tone'&&connectivity==='semi_connected');
    let archetype; if (pairedness==='trips') archetype='TRIPS'; else if (flushiness==='monotone'&&pairedness==='unpaired') archetype='MONOTONE';
    else if (pairedness==='paired') archetype=(ranks[0]>=10||(ranks[0]===ranks[1]&&ranks[0]>=10)||(ranks[1]===ranks[2]&&ranks[1]>=10))?'PAIRED_HIGH':'PAIRED_LOW';
    else if (highCard==='ace_high') archetype=isWet?'A_HIGH_DYNAMIC':'A_HIGH_DRY'; else if (highCard==='broadway_high') archetype=isWet?'BROADWAY_DYNAMIC':'BROADWAY_STATIC';
    else if (highCard==='mid_high') archetype=(connectivity==='connected'||connectivity==='heavy_connected')?'MID_CONNECTED':'MID_DISCONNECTED';
    else archetype=(connectivity==='connected'||connectivity==='heavy_connected')?'LOW_CONNECTED':'LOW_DISCONNECTED';
    return {archetype,pairedness,flushiness,connectivity,highCard,ranks,suits};
}
function pickFlopArchetype(){const r=Math.random();let c=0;for(const[a,w]of Object.entries(FLOP_ARCHETYPE_WEIGHTS)){c+=w;if(r<c)return a;}return'A_HIGH_DRY';}
function generateFlopForArchetype(t,max){max=max||200;for(let i=0;i<max;i++){const f=_randomFlop();if(classifyFlop(f).archetype===t)return f;}return _fallbackFlop(t);}
function _randomFlop(){const d=[];for(const r of RANKS)for(const s of SUITS)d.push({rank:r,suit:s});for(let i=0;i<3;i++){const j=i+Math.floor(Math.random()*(d.length-i));[d[i],d[j]]=[d[j],d[i]];}return d.slice(0,3);}
function _fallbackFlop(a){const f={A_HIGH_DRY:[{rank:'A',suit:'s'},{rank:'7',suit:'d'},{rank:'2',suit:'c'}],A_HIGH_DYNAMIC:[{rank:'A',suit:'s'},{rank:'T',suit:'s'},{rank:'9',suit:'d'}],BROADWAY_STATIC:[{rank:'K',suit:'s'},{rank:'8',suit:'d'},{rank:'3',suit:'c'}],BROADWAY_DYNAMIC:[{rank:'K',suit:'h'},{rank:'Q',suit:'d'},{rank:'J',suit:'c'}],MID_DISCONNECTED:[{rank:'9',suit:'s'},{rank:'5',suit:'d'},{rank:'2',suit:'c'}],MID_CONNECTED:[{rank:'9',suit:'h'},{rank:'8',suit:'d'},{rank:'6',suit:'c'}],LOW_DISCONNECTED:[{rank:'6',suit:'s'},{rank:'3',suit:'d'},{rank:'2',suit:'c'}],LOW_CONNECTED:[{rank:'5',suit:'h'},{rank:'4',suit:'s'},{rank:'3',suit:'d'}],PAIRED_HIGH:[{rank:'K',suit:'s'},{rank:'K',suit:'d'},{rank:'7',suit:'c'}],PAIRED_LOW:[{rank:'5',suit:'s'},{rank:'5',suit:'d'},{rank:'9',suit:'c'}],MONOTONE:[{rank:'Q',suit:'s'},{rank:'8',suit:'s'},{rank:'4',suit:'s'}],TRIPS:[{rank:'7',suit:'s'},{rank:'7',suit:'d'},{rank:'7',suit:'c'}]};return f[a]||f.A_HIGH_DRY;}
function makePostflopSpotKey(spot){return`${spot.potType}|${spot.preflopFamily}|${spot.street}|${spot.heroRole}|${spot.positionState}|${spot.nodeType}|${spot.boardArchetype}`;}
const POSTFLOP_STRATEGY={};
(function(){
    const IP={A_HIGH_DRY:{bet33:0.80,check:0.20,r:"PFR has massive range advantage on A-high dry boards."},A_HIGH_DYNAMIC:{bet33:0.55,check:0.45,r:"A-high with draws. Range advantage partially offset by flush potential."},BROADWAY_STATIC:{bet33:0.70,check:0.30,r:"PFR retains strong range advantage on dry broadway textures."},BROADWAY_DYNAMIC:{bet33:0.50,check:0.50,r:"Connected broadway boards hit both ranges. Mixed strategy."},MID_DISCONNECTED:{bet33:0.55,check:0.45,r:"Moderate PFR advantage. Mid cards connect more with caller's range."},MID_CONNECTED:{bet33:0.35,check:0.65,r:"Connected mid boards favor the caller's wider range."},LOW_DISCONNECTED:{bet33:0.45,check:0.55,r:"Low boards slightly favor the caller."},LOW_CONNECTED:{bet33:0.25,check:0.75,r:"Low connected boards strongly favor the caller's range."},MONOTONE:{bet33:0.35,check:0.65,r:"Monotone boards reduce PFR's range advantage."},PAIRED_HIGH:{bet33:0.65,check:0.35,r:"PFR has more overpairs and strong kickers on high paired boards."},PAIRED_LOW:{bet33:0.50,check:0.50,r:"Low paired boards are more neutral. Mixed strategy."},TRIPS:{bet33:0.40,check:0.60,r:"Trip boards are rare and equity runs close."}};
    const OOP={A_HIGH_DRY:{bet33:0.65,check:0.35,r:"A-high dry still favors PFR but OOP penalty reduces c-bet frequency."},A_HIGH_DYNAMIC:{bet33:0.40,check:0.60,r:"OOP with draws present. Checking preferred to control pot."},BROADWAY_STATIC:{bet33:0.55,check:0.45,r:"Range advantage present but OOP. C-bet slightly preferred."},BROADWAY_DYNAMIC:{bet33:0.35,check:0.65,r:"Connected broadway OOP. Checking preferred."},MID_DISCONNECTED:{bet33:0.40,check:0.60,r:"Moderate texture OOP. Lean toward checking."},MID_CONNECTED:{bet33:0.25,check:0.75,r:"Connected mid boards OOP. Check heavily."},LOW_DISCONNECTED:{bet33:0.30,check:0.70,r:"Low boards OOP. Check frequently."},LOW_CONNECTED:{bet33:0.15,check:0.85,r:"Low connected OOP. Almost always check."},MONOTONE:{bet33:0.25,check:0.75,r:"Monotone boards OOP. Check heavily."},PAIRED_HIGH:{bet33:0.50,check:0.50,r:"High paired board OOP. Mixed strategy."},PAIRED_LOW:{bet33:0.35,check:0.65,r:"Low paired board OOP. Lean toward checking."},TRIPS:{bet33:0.30,check:0.70,r:"Trip board OOP. Checking preferred."}};
    const OFF={UTG_vs_BB:0.05,LJ_vs_BB:0.03,HJ_vs_BB:0.02,CO_vs_BB:0,BTN_vs_BB:0,BTN_vs_SB:0,SB_vs_BB:0,CO_vs_BTN:-0.03};
    for(const[fk,fi]of Object.entries(POSTFLOP_PREFLOP_FAMILIES)){const base=fi.positionState==='IP'?IP:OOP;const off=OFF[fk]||0;for(const arch of FLOP_ARCHETYPES){const raw=base[arch];if(!raw)continue;const ab=Math.max(0.05,Math.min(0.95,raw.bet33+off));const ac=parseFloat((1-ab).toFixed(2));const actions={check:ac,bet33:parseFloat(ab.toFixed(2))};const pa=ab>=0.50?'bet33':'check';const sk=makePostflopSpotKey({potType:'SRP',preflopFamily:fk,street:'FLOP',heroRole:'PFR',positionState:fi.positionState,nodeType:'CBET_DECISION',boardArchetype:arch});POSTFLOP_STRATEGY[sk]={actions,preferredAction:pa,reasoning:raw.r,simplification:'Phase 1: C-Bet vs Check'};}}
})();
// V3: Config-screen postflop training serves ONLY hero-hand-aware spots.
// Every generated spot must include a real hero hand, a hand class, and a valid
// POSTFLOP_STRATEGY_V2 entry.  The old archetype-only prototype families are
// preserved internally (POSTFLOP_STRATEGY) but are NOT exposed through the
// normal training flow.  Unsupported families will be added in future phases.
function generatePostflopSpot(maxRetries, familyFilter){
    maxRetries = maxRetries || 20;
    // Only pick from hero-hand-aware families (V3 scope: BTN_vs_BB, CO_vs_BB, SB_vs_BB)
    let fams = [...HERO_HAND_AWARE_FAMILIES];
    // Optional family filter: restrict to specified families (for challenge nodes)
    if (familyFilter && Array.isArray(familyFilter) && familyFilter.length > 0) {
        const filtered = fams.filter(f => familyFilter.includes(f));
        // Graceful degradation: if filter excludes all hero-hand-aware families, use the unfiltered set
        if (filtered.length > 0) fams = filtered;
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const fam = fams[Math.floor(Math.random() * fams.length)];
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;

        const arch = pickFlopArchetype();
        const heroHand = _dealPostflopHeroHand(fi.heroPos);
        const fc = _generateFlopNoConflict(arch, heroHand);
        const heroHandClass = classifyFlopHand(heroHand, fc);

        const spot = {
            potType:'SRP', preflopFamily:fam, street:'FLOP', heroRole:'PFR',
            positionState:fi.positionState, nodeType:'CBET_DECISION',
            boardArchetype:arch, heroPos:fi.heroPos, villainPos:fi.villainPos,
            flopCards:fc, flopClassification:classifyFlop(fc),
            heroHand: heroHand,
            heroHandClass: heroHandClass
        };
        spot.spotKey = makePostflopSpotKeyV2(spot);
        spot.strategy = POSTFLOP_STRATEGY_V2[spot.spotKey] || null;

        // Only accept spots with a valid Phase 2 strategy entry
        if (spot.strategy && spot.heroHand && spot.heroHandClass) return spot;
        // Otherwise retry with a different random family / archetype / hand
    }

    // Last resort: force a known-good combination
    console.warn('[Postflop] All retries exhausted; forcing BTN_vs_BB fallback.');
    const fi = POSTFLOP_PREFLOP_FAMILIES['BTN_vs_BB'];
    const arch = 'A_HIGH_DRY';
    const heroHand = _dealPostflopHeroHand('BTN');
    const fc = _generateFlopNoConflict(arch, heroHand);
    const heroHandClass = classifyFlopHand(heroHand, fc);
    const spot = {
        potType:'SRP', preflopFamily:'BTN_vs_BB', street:'FLOP', heroRole:'PFR',
        positionState:'IP', nodeType:'CBET_DECISION',
        boardArchetype:arch, heroPos:'BTN', villainPos:'BB',
        flopCards:fc, flopClassification:classifyFlop(fc),
        heroHand: heroHand,
        heroHandClass: heroHandClass
    };
    spot.spotKey = makePostflopSpotKeyV2(spot);
    spot.strategy = POSTFLOP_STRATEGY_V2[spot.spotKey] || null;
    return spot;
}

function scorePostflopAction(playerAction, strategy, spot) {
    if (!strategy) return {correct:false, grade:'unknown', feedback:'No strategy data.'};
    const preferred = strategy.preferredAction;
    const playerKey = playerAction === 'CBET' ? 'bet33' : 'check';
    const playerFreq = strategy.actions[playerKey] || 0;
    const isCorrect = playerKey === preferred;
    let grade;
    if (playerFreq >= 0.75) grade = 'strong';
    else if (playerFreq >= 0.50) grade = 'marginal';
    else if (playerFreq >= 0.36) grade = 'marginal_wrong';
    else grade = 'clear_wrong';
    const preferredLabel = preferred === 'check' ? 'Check' : 'C-Bet';
    const freqPct = Math.round((strategy.actions[preferred] || 0) * 100);
    let feedback;
    if (isCorrect && grade === 'strong') feedback = `Correct. ${preferredLabel} (${freqPct}%).`;
    else if (isCorrect && grade === 'marginal') feedback = `Correct. Close spot — ${preferredLabel} slightly preferred (${freqPct}%).`;
    else if (!isCorrect && grade === 'marginal_wrong') feedback = `Close, but ${preferredLabel} is preferred here (${freqPct}%).`;
    else feedback = `${preferredLabel} is preferred (${freqPct}%). ${strategy.reasoning}`;
    // Phase 2: add hand class label to feedback when available
    const handClassLabel = (spot && spot.heroHandClass) ? (HAND_CLASS_LABELS[spot.heroHandClass] || spot.heroHandClass) : null;
    if (handClassLabel) feedback += ` [${handClassLabel}]`;
    return {correct:isCorrect, grade, feedback, preferredLabel, freqPct, reasoning:strategy.reasoning};
}

// ============================================================
// PHASE 2: Hero-Hand-Aware Postflop
// ============================================================

// Families that support hero-hand-aware training (V3 scope: BTN_vs_BB, CO_vs_BB, SB_vs_BB)
const HERO_HAND_AWARE_FAMILIES = new Set(['BTN_vs_BB', 'CO_vs_BB', 'SB_vs_BB']);

// --- Flop hand classification ---
const HAND_CLASS_LABELS = {
    OVERPAIR:'Overpair', TOP_PAIR:'Top pair', SECOND_PAIR:'Second pair',
    THIRD_PAIR:'Third pair', UNDERPAIR:'Underpair', SET:'Set', TWO_PAIR_PLUS:'Two pair+',
    OESD:'OESD', GUTSHOT:'Gutshot', NFD:'Nut flush draw',
    FD:'Flush draw', COMBO_DRAW:'Combo draw', ACE_HIGH_BACKDOOR:'Ace-high / backdoor',
    OVERCARDS:'Overcards', AIR:'Air'
};

/**
 * classifyFlopHand — classify hero's hand on the flop.
 * heroHand: { rank1, rank2, suited } (abstract) or { cards: [{rank,suit},{rank,suit}] } (concrete)
 * flopCards: array of {rank, suit}
 * Returns a string hand class.
 */
function classifyFlopHand(heroHand, flopCards) {
    const hr = heroHand.cards || _heroHandToCards(heroHand);
    const h1 = RANK_NUM[hr[0].rank], h2 = RANK_NUM[hr[1].rank];
    const hHigh = Math.max(h1, h2), hLow = Math.min(h1, h2);
    const hSuited = hr[0].suit === hr[1].suit;
    const hSuit = hSuited ? hr[0].suit : null;

    const fRanks = flopCards.map(c => RANK_NUM[c.rank]).sort((a,b) => b - a);
    const fSuits = flopCards.map(c => c.suit);
    const flopTop = fRanks[0], flopMid = fRanks[1], flopBot = fRanks[2];

    // Count how many board cards match each hero rank
    const matchHigh = fRanks.filter(r => r === hHigh).length;
    const matchLow = fRanks.filter(r => r === hLow).length;
    const isPocket = hHigh === hLow;

    // --- Made hands (strongest first) ---

    // Set: hero has a pocket pair that matches a board card
    if (isPocket && matchHigh >= 1) return 'SET';

    // Two pair+: both hero ranks match board cards (and hero is not paired)
    if (!isPocket && matchHigh >= 1 && matchLow >= 1) return 'TWO_PAIR_PLUS';

    // Overpair: pocket pair above the top board card
    if (isPocket && hHigh > flopTop) return 'OVERPAIR';

    // Top pair: one hero card matches the highest board rank
    if (matchHigh >= 1 && hHigh === flopTop) return 'TOP_PAIR';
    if (matchLow >= 1 && hLow === flopTop) return 'TOP_PAIR';

    // Second pair: hero matches the second-highest board rank
    if (matchHigh >= 1 && hHigh === flopMid) return 'SECOND_PAIR';
    if (matchLow >= 1 && hLow === flopMid) return 'SECOND_PAIR';

    // Third pair / bottom pair: hero matches the lowest board rank
    if (matchHigh >= 1 && hHigh === flopBot) return 'THIRD_PAIR';
    if (matchLow >= 1 && hLow === flopBot) return 'THIRD_PAIR';

    // Pocket pairs that don't match the board
    if (isPocket) {
        if (hHigh < flopBot) return 'UNDERPAIR';
        return 'UNDERPAIR'; // mid-pocket pairs between board cards
    }

    // --- Draws ---
    const allRanks = [hHigh, hLow, ...fRanks].sort((a,b) => b - a);
    const uniqueRanks = [...new Set(allRanks)].sort((a,b) => b - a);
    const hasFlushDraw = _countSuitOnBoard(hSuit, fSuits) >= 2 && hSuited;
    const hasBackdoorFD = hSuited && _countSuitOnBoard(hSuit, fSuits) === 1;
    const straightInfo = _straightDrawType(uniqueRanks);
    const hasOESD = straightInfo === 'OESD';
    const hasGutshot = straightInfo === 'GUTSHOT';

    // Nut flush draw: suited hand with 2+ matching suits on board
    const isNFD = hasFlushDraw && (hHigh === 14 || (hHigh >= 13 && _highestFlushCardOnBoard(hSuit, flopCards) < hHigh));

    // Combo draw: flush draw + straight draw
    if (hasFlushDraw && (hasOESD || hasGutshot)) return 'COMBO_DRAW';
    if (isNFD) return 'NFD';
    if (hasFlushDraw) return 'FD';
    if (hasOESD) return 'OESD';
    if (hasGutshot) return 'GUTSHOT';

    // Ace-high with backdoor equity
    if (hHigh === 14 && (hasBackdoorFD || hasGutshot)) return 'ACE_HIGH_BACKDOOR';
    if (hHigh === 14) return 'ACE_HIGH_BACKDOOR'; // Ace-high no pair still has some showdown

    // Overcards: both hero cards above the top board card (no pair, no draw)
    if (hHigh > flopTop && hLow > flopTop) return 'OVERCARDS';

    return 'AIR';
}

function _countSuitOnBoard(suit, boardSuits) {
    if (!suit) return 0;
    return boardSuits.filter(s => s === suit).length;
}

function _highestFlushCardOnBoard(suit, flopCards) {
    let best = 0;
    for (const c of flopCards) { if (c.suit === suit) best = Math.max(best, RANK_NUM[c.rank]); }
    return best;
}

/**
 * Check for straight draws using hero + board ranks.
 * Returns 'OESD', 'GUTSHOT', or null.
 * Checks every 5-card straight window to see if we have 4 of 5 (OESD) or 4 of 5 with gap (gutshot).
 */
function _straightDrawType(sortedUniqueRanks) {
    const ranks = [...sortedUniqueRanks];
    // Add ace as 1 for wheel draws
    if (ranks.includes(14)) ranks.push(1);
    const unique = [...new Set(ranks)];

    let bestDraw = null;

    // Check every possible 5-card straight (A-5 through T-A)
    // A straight window is [low, low+1, low+2, low+3, low+4]
    for (let low = 1; low <= 10; low++) {
        const window5 = [low, low+1, low+2, low+3, low+4];
        const have = window5.filter(r => unique.includes(r)).length;
        if (have >= 4) {
            // 4 of 5 in a straight window
            // Check if it's open-ended (both ends available) or gutshot (one gap inside)
            const missing = window5.filter(r => !unique.includes(r));
            if (missing.length === 1) {
                const gap = missing[0];
                // Open-ended: missing card is at an end of the window
                if (gap === low || gap === low + 4) {
                    bestDraw = 'OESD';
                } else {
                    // Gutshot: missing card is in the middle
                    if (!bestDraw || bestDraw === 'GUTSHOT') bestDraw = 'GUTSHOT';
                }
            } else if (missing.length === 0) {
                // Already have a made straight — for classification purposes, no draw needed
                // (but this shouldn't matter for our use case; treat as strong)
                bestDraw = 'OESD'; // having 5 is even better
            }
        }
    }
    return bestDraw;
}

// Convert abstract heroHand {rank1, rank2, suited} into concrete cards if needed
function _heroHandToCards(h) {
    if (h.cards) return h.cards;
    return [
        { rank: h.rank1, suit: h.suit1 || 's' },
        { rank: h.rank2, suit: h.suit2 || (h.suited ? 's' : 'h') }
    ];
}

// --- Hero hand generation ---

/**
 * Deal a concrete hero hand from the RFI range for a given position.
 * Returns { cards: [{rank, suit}, {rank, suit}], handKey: 'AKs' }
 */
function _dealPostflopHeroHand(heroPos) {
    const range = rfiRanges[heroPos];
    if (!range || range.length === 0) {
        // Fallback: random broadway hand
        return _concreteHand('AK', true);
    }
    // Flatten range into hand keys, pick one
    const allHands = [];
    for (const token of range) {
        for (const h of _expandSingle(token)) allHands.push(h);
    }
    const handKey = allHands[Math.floor(Math.random() * allHands.length)];
    const suited = handKey.endsWith('s');
    const offsuit = handKey.endsWith('o');
    const isPair = handKey.length === 2 || (!suited && !offsuit && handKey[0] === handKey[1]);
    return _concreteHand(handKey, suited);
}

/**
 * Expand a single range token into hand keys (simplified — reuses RANKS indexing).
 * This is a lightweight version for hero dealing; not the full validator expandToken.
 */
function _expandSingle(token) {
    const hands = [];
    const t = token.trim();
    // Exact hand
    if (t.length <= 3 && !t.includes('+') && !t.includes('-')) { hands.push(t); return hands; }
    // XX+ pairs
    if (t.endsWith('+')) {
        const base = t.slice(0, -1);
        const suf = base.endsWith('s') ? 's' : base.endsWith('o') ? 'o' : '';
        const r1 = base[0], r2 = suf ? base[1] : base[1];
        const i1 = RANKS.indexOf(r1), i2 = RANKS.indexOf(r2);
        if (r1 === r2 && !suf) { for (let i = 0; i <= i1; i++) hands.push(RANKS[i]+RANKS[i]); }
        else { for (let i = 0; i <= i2; i++) { if (RANKS[i] !== r1) hands.push(r1+RANKS[i]+(suf||'s')); } }
        return hands;
    }
    // XX-YY ranges
    if (t.includes('-')) {
        const dash = t.indexOf('-');
        const s = t.slice(0,dash), e = t.slice(dash+1);
        const suf = s.endsWith('s')?'s':s.endsWith('o')?'o':'';
        const sR1=s[0],sR2=s[1],eR2=e[1];
        const si1=RANKS.indexOf(sR1),si2=RANKS.indexOf(sR2),ei2=RANKS.indexOf(eR2);
        if (sR1===sR2&&!suf) { for(let i=si1;i<=ei2;i++) hands.push(RANKS[i]+RANKS[i]); }
        else { for(let i=si2;i<=ei2;i++) { if(RANKS[i]!==sR1) hands.push(sR1+RANKS[i]+suf); } }
        return hands;
    }
    // "AK" shorthand
    if (t.length===2 && t[0]!==t[1]) { hands.push(t+'s'); hands.push(t+'o'); return hands; }
    hands.push(t);
    return hands;
}

/**
 * Convert a hand key like 'AKs' into concrete cards with random suits.
 */
function _concreteHand(handKey, suited) {
    const r1 = handKey[0], r2 = handKey[1];
    const isPair = r1 === r2;
    const allSuits = ['s','h','d','c'];
    const s1 = allSuits[Math.floor(Math.random()*4)];
    let s2;
    if (isPair) {
        const others = allSuits.filter(s => s !== s1);
        s2 = others[Math.floor(Math.random()*others.length)];
    } else if (suited) {
        s2 = s1;
    } else {
        const others = allSuits.filter(s => s !== s1);
        s2 = others[Math.floor(Math.random()*others.length)];
    }
    return {
        cards: [{rank:r1, suit:s1}, {rank:r2, suit:s2}],
        handKey: handKey
    };
}

/**
 * Generate flop that doesn't conflict with hero hole cards.
 */
function _generateFlopNoConflict(archetype, heroHand, maxAttempts) {
    maxAttempts = maxAttempts || 300;
    const hCards = heroHand.cards || [];
    const blocked = new Set(hCards.map(c => c.rank + c.suit));
    for (let i = 0; i < maxAttempts; i++) {
        const f = _randomFlop();
        // Check no flop card matches a hero card
        const conflict = f.some(c => blocked.has(c.rank + c.suit));
        if (conflict) continue;
        if (classifyFlop(f).archetype === archetype) return f;
    }
    // Fallback: use fallback flop, filter conflicts
    const fb = _fallbackFlop(archetype);
    return fb.map(c => blocked.has(c.rank+c.suit) ? {rank:c.rank, suit:SUITS.find(s=>!blocked.has(c.rank+s))||c.suit} : c);
}

// --- Hero-hand-aware spot key ---

/**
 * makePostflopSpotKeyV2 — includes heroHandClass for hero-hand-aware spots.
 */
function makePostflopSpotKeyV2(spot) {
    return `${spot.potType}|${spot.preflopFamily}|${spot.street}|${spot.heroRole}|${spot.positionState}|${spot.nodeType}|${spot.boardArchetype}|${spot.heroHandClass}`;
}

// --- Hero-hand-aware strategy registry (Phase 2) ---
// Covers BTN_vs_BB and CO_vs_BB, SRP, IP, FLOP, PFR, CBET_DECISION
// Frequencies are approximate GTO-inspired values; stronger hands bet more.

const POSTFLOP_STRATEGY_V2 = {};

(function() {
    const HAND_CLASSES = [
        'OVERPAIR','TOP_PAIR','SECOND_PAIR','THIRD_PAIR','UNDERPAIR','SET','TWO_PAIR_PLUS',
        'OESD','GUTSHOT','NFD','FD','COMBO_DRAW','ACE_HIGH_BACKDOOR','OVERCARDS','AIR'
    ];

    // Base c-bet frequencies by hand class × board archetype (IP PFR)
    // Format: { handClass: { archetype: bet33 freq } }
    // Missing combos inherit a default per hand class.
    const BASE_IP = {
        SET:              { _default: 0.90, LOW_CONNECTED: 0.80, MONOTONE: 0.75, TRIPS: 0.50 },
        TWO_PAIR_PLUS:    { _default: 0.85, LOW_CONNECTED: 0.75, MONOTONE: 0.70, TRIPS: 0.50 },
        OVERPAIR:         { _default: 0.85, A_HIGH_DRY: 0.90, A_HIGH_DYNAMIC: 0.75, BROADWAY_STATIC: 0.85, BROADWAY_DYNAMIC: 0.70, MID_CONNECTED: 0.65, LOW_CONNECTED: 0.55, MONOTONE: 0.50 },
        TOP_PAIR:         { _default: 0.70, A_HIGH_DRY: 0.80, A_HIGH_DYNAMIC: 0.60, BROADWAY_STATIC: 0.75, BROADWAY_DYNAMIC: 0.55, MID_DISCONNECTED: 0.65, MID_CONNECTED: 0.50, LOW_DISCONNECTED: 0.55, LOW_CONNECTED: 0.40, MONOTONE: 0.40, PAIRED_HIGH: 0.60, PAIRED_LOW: 0.55 },
        SECOND_PAIR:      { _default: 0.35, A_HIGH_DRY: 0.45, BROADWAY_STATIC: 0.40, MID_DISCONNECTED: 0.35, MID_CONNECTED: 0.25, LOW_DISCONNECTED: 0.30, LOW_CONNECTED: 0.20, MONOTONE: 0.20 },
        THIRD_PAIR:       { _default: 0.25, A_HIGH_DRY: 0.35, BROADWAY_STATIC: 0.30, MID_DISCONNECTED: 0.25, MID_CONNECTED: 0.15, LOW_DISCONNECTED: 0.20, LOW_CONNECTED: 0.10, MONOTONE: 0.15 },
        UNDERPAIR:        { _default: 0.30, A_HIGH_DRY: 0.40, BROADWAY_STATIC: 0.35, MID_DISCONNECTED: 0.30, MID_CONNECTED: 0.20, LOW_DISCONNECTED: 0.25, LOW_CONNECTED: 0.15, MONOTONE: 0.15 },
        COMBO_DRAW:       { _default: 0.80, A_HIGH_DRY: 0.60, BROADWAY_STATIC: 0.65, MID_CONNECTED: 0.85, LOW_CONNECTED: 0.80, MONOTONE: 0.75 },
        NFD:              { _default: 0.70, A_HIGH_DRY: 0.50, BROADWAY_STATIC: 0.55, MID_CONNECTED: 0.75, LOW_CONNECTED: 0.70, MONOTONE: 0.60 },
        FD:               { _default: 0.55, A_HIGH_DRY: 0.40, BROADWAY_STATIC: 0.45, MID_CONNECTED: 0.60, LOW_CONNECTED: 0.55, MONOTONE: 0.45 },
        OESD:             { _default: 0.60, A_HIGH_DRY: 0.45, BROADWAY_DYNAMIC: 0.65, MID_CONNECTED: 0.65, LOW_CONNECTED: 0.60 },
        GUTSHOT:          { _default: 0.40, A_HIGH_DRY: 0.35, BROADWAY_DYNAMIC: 0.45, MID_CONNECTED: 0.45, LOW_CONNECTED: 0.40 },
        ACE_HIGH_BACKDOOR:{ _default: 0.45, A_HIGH_DRY: 0.70, A_HIGH_DYNAMIC: 0.55, BROADWAY_STATIC: 0.55, BROADWAY_DYNAMIC: 0.40, MID_DISCONNECTED: 0.40, MID_CONNECTED: 0.30, LOW_DISCONNECTED: 0.35, LOW_CONNECTED: 0.25, MONOTONE: 0.25 },
        OVERCARDS:        { _default: 0.35, A_HIGH_DRY: 0.50, A_HIGH_DYNAMIC: 0.40, BROADWAY_STATIC: 0.45, BROADWAY_DYNAMIC: 0.35, MID_DISCONNECTED: 0.35, MID_CONNECTED: 0.20, LOW_DISCONNECTED: 0.30, LOW_CONNECTED: 0.15, MONOTONE: 0.20, PAIRED_HIGH: 0.35, PAIRED_LOW: 0.30, TRIPS: 0.25 },
        AIR:              { _default: 0.30, A_HIGH_DRY: 0.45, BROADWAY_STATIC: 0.35, MID_DISCONNECTED: 0.30, MID_CONNECTED: 0.15, LOW_DISCONNECTED: 0.25, LOW_CONNECTED: 0.10, MONOTONE: 0.15, PAIRED_HIGH: 0.30, PAIRED_LOW: 0.25, TRIPS: 0.20 }
    };

    // OOP PFR base frequencies — significantly lower c-bet frequency due to positional disadvantage
    const BASE_OOP = {
        SET:              { _default: 0.80, LOW_CONNECTED: 0.70, MONOTONE: 0.65, TRIPS: 0.45 },
        TWO_PAIR_PLUS:    { _default: 0.75, LOW_CONNECTED: 0.65, MONOTONE: 0.60, TRIPS: 0.40 },
        OVERPAIR:         { _default: 0.70, A_HIGH_DRY: 0.80, A_HIGH_DYNAMIC: 0.60, BROADWAY_STATIC: 0.70, BROADWAY_DYNAMIC: 0.55, MID_CONNECTED: 0.50, LOW_CONNECTED: 0.40, MONOTONE: 0.35 },
        TOP_PAIR:         { _default: 0.55, A_HIGH_DRY: 0.65, A_HIGH_DYNAMIC: 0.45, BROADWAY_STATIC: 0.60, BROADWAY_DYNAMIC: 0.40, MID_DISCONNECTED: 0.50, MID_CONNECTED: 0.35, LOW_DISCONNECTED: 0.40, LOW_CONNECTED: 0.25, MONOTONE: 0.25, PAIRED_HIGH: 0.45, PAIRED_LOW: 0.40 },
        SECOND_PAIR:      { _default: 0.20, A_HIGH_DRY: 0.30, BROADWAY_STATIC: 0.25, MID_DISCONNECTED: 0.20, MID_CONNECTED: 0.15, LOW_DISCONNECTED: 0.20, LOW_CONNECTED: 0.10, MONOTONE: 0.10 },
        THIRD_PAIR:       { _default: 0.15, A_HIGH_DRY: 0.20, BROADWAY_STATIC: 0.18, MID_DISCONNECTED: 0.15, MID_CONNECTED: 0.10, LOW_DISCONNECTED: 0.12, LOW_CONNECTED: 0.08, MONOTONE: 0.08 },
        UNDERPAIR:        { _default: 0.18, A_HIGH_DRY: 0.25, BROADWAY_STATIC: 0.22, MID_DISCONNECTED: 0.18, MID_CONNECTED: 0.12, LOW_DISCONNECTED: 0.15, LOW_CONNECTED: 0.08, MONOTONE: 0.08 },
        COMBO_DRAW:       { _default: 0.65, A_HIGH_DRY: 0.45, BROADWAY_STATIC: 0.50, MID_CONNECTED: 0.70, LOW_CONNECTED: 0.65, MONOTONE: 0.55 },
        NFD:              { _default: 0.55, A_HIGH_DRY: 0.35, BROADWAY_STATIC: 0.40, MID_CONNECTED: 0.60, LOW_CONNECTED: 0.55, MONOTONE: 0.45 },
        FD:               { _default: 0.40, A_HIGH_DRY: 0.25, BROADWAY_STATIC: 0.30, MID_CONNECTED: 0.45, LOW_CONNECTED: 0.40, MONOTONE: 0.30 },
        OESD:             { _default: 0.45, A_HIGH_DRY: 0.30, BROADWAY_DYNAMIC: 0.50, MID_CONNECTED: 0.50, LOW_CONNECTED: 0.45 },
        GUTSHOT:          { _default: 0.25, A_HIGH_DRY: 0.20, BROADWAY_DYNAMIC: 0.30, MID_CONNECTED: 0.30, LOW_CONNECTED: 0.25 },
        ACE_HIGH_BACKDOOR:{ _default: 0.30, A_HIGH_DRY: 0.50, A_HIGH_DYNAMIC: 0.35, BROADWAY_STATIC: 0.35, BROADWAY_DYNAMIC: 0.25, MID_DISCONNECTED: 0.25, MID_CONNECTED: 0.15, LOW_DISCONNECTED: 0.20, LOW_CONNECTED: 0.12, MONOTONE: 0.12 },
        OVERCARDS:        { _default: 0.22, A_HIGH_DRY: 0.35, A_HIGH_DYNAMIC: 0.25, BROADWAY_STATIC: 0.28, BROADWAY_DYNAMIC: 0.20, MID_DISCONNECTED: 0.20, MID_CONNECTED: 0.10, LOW_DISCONNECTED: 0.18, LOW_CONNECTED: 0.08, MONOTONE: 0.10, PAIRED_HIGH: 0.22, PAIRED_LOW: 0.18, TRIPS: 0.15 },
        AIR:              { _default: 0.18, A_HIGH_DRY: 0.30, BROADWAY_STATIC: 0.22, MID_DISCONNECTED: 0.18, MID_CONNECTED: 0.08, LOW_DISCONNECTED: 0.15, LOW_CONNECTED: 0.05, MONOTONE: 0.08, PAIRED_HIGH: 0.18, PAIRED_LOW: 0.15, TRIPS: 0.12 }
    };

    // Reasoning templates per hand class
    const REASONING = {
        SET: 'Sets are strong; bet for value and protection.',
        TWO_PAIR_PLUS: 'Two pair+ is strong; bet for value.',
        OVERPAIR: 'Overpairs are premium made hands; bet for value and protection.',
        TOP_PAIR: 'Top pair should usually bet for value, but check on dynamic boards.',
        SECOND_PAIR: 'Second pair has showdown value; check to control pot, or thin value bet on dry boards.',
        THIRD_PAIR: 'Third pair is weak; mostly check to get to showdown cheaply.',
        UNDERPAIR: 'Underpairs are marginal; mostly check to realize equity.',
        COMBO_DRAW: 'Combo draws have great equity and fold equity; bet aggressively.',
        NFD: 'Nut flush draws have strong equity; semi-bluff frequently.',
        FD: 'Flush draws have decent equity; semi-bluff on favorable textures.',
        OESD: 'Open-ended straight draws have ~32% equity; semi-bluff on many textures.',
        GUTSHOT: 'Gutshots have some equity but low hit rate; selective bluffs.',
        ACE_HIGH_BACKDOOR: 'Ace-high with backdoor equity; can bet on favorable textures as a bluff.',
        OVERCARDS: 'Two overcards have some equity and can improve; bet as a bluff on PFR-favorable boards.',
        AIR: 'No made hand or draw; bet as a bluff on PFR-favorable boards, check otherwise.'
    };

    // Family offsets: small adjustments per family
    // CO is slightly tighter than BTN; SB is handled via OOP base tables
    const FAMILY_OFF = { BTN_vs_BB: 0, CO_vs_BB: -0.03, SB_vs_BB: 0 };

    for (const fam of HERO_HAND_AWARE_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        // Use OOP base tables for OOP families, IP for IP families
        const baseTable = fi.positionState === 'OOP' ? BASE_OOP : BASE_IP;

        for (const arch of FLOP_ARCHETYPES) {
            for (const hc of HAND_CLASSES) {
                const baseFreqs = baseTable[hc];
                if (!baseFreqs) continue;
                const raw = baseFreqs[arch] !== undefined ? baseFreqs[arch] : baseFreqs._default;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet33' : 'check';
                const sk = makePostflopSpotKeyV2({
                    potType:'SRP', preflopFamily:fam, street:'FLOP', heroRole:'PFR',
                    positionState:fi.positionState, nodeType:'CBET_DECISION',
                    boardArchetype:arch, heroHandClass:hc
                });
                POSTFLOP_STRATEGY_V2[sk] = {
                    actions: { check: chk, bet33: bet },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'V3: Hero-hand-aware C-Bet'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[PostflopV3] Built ${Object.keys(POSTFLOP_STRATEGY_V2).length} hero-hand-aware strategy entries.`);
    }
})();
const ARCHETYPE_LABELS={A_HIGH_DRY:'A-high dry',A_HIGH_DYNAMIC:'A-high dynamic',BROADWAY_STATIC:'Broadway static',BROADWAY_DYNAMIC:'Broadway dynamic',MID_DISCONNECTED:'Mid disconnected',MID_CONNECTED:'Mid connected',LOW_DISCONNECTED:'Low disconnected',LOW_CONNECTED:'Low connected',PAIRED_HIGH:'Paired high',PAIRED_LOW:'Paired low',MONOTONE:'Monotone',TRIPS:'Trips'};
function flopCardStr(card){return card.rank+(SUIT_SYMBOLS[card.suit]||card.suit);}
function flopStr(cards){return cards.map(flopCardStr).join(' ');}
function flopSuitColor(suit){return(suit==='h'||suit==='d')?'#dc2626':'#0f172a';}
function isPostflopSpotKey(key){return key.startsWith('SRP|')||key.startsWith('3BP|')||key.startsWith('LIMP_POT|');}
