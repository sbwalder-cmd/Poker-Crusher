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

// Families that support hero-hand-aware training (V3: all SRP families)
const HERO_HAND_AWARE_FAMILIES = new Set([
    'BTN_vs_BB', 'CO_vs_BB', 'HJ_vs_BB', 'LJ_vs_BB',
    'SB_vs_BB', 'BTN_vs_SB', 'CO_vs_BTN', 'UTG_vs_BB'
]);

// --- Flop hand classification ---
const HAND_CLASS_LABELS = {
    OVERPAIR:'Overpair', TOP_PAIR:'Top pair', SECOND_PAIR:'Second pair',
    THIRD_PAIR:'Third pair', UNDERPAIR:'Underpair', SET:'Set', TWO_PAIR_PLUS:'Two pair+',
    OESD:'OESD', GUTSHOT:'Gutshot', NFD:'Nut flush draw',
    FD:'Flush draw', COMBO_DRAW:'Combo draw', ACE_HIGH_BACKDOOR:'Ace-high / backdoor',
    OVERCARDS:'Overcards', AIR:'Air'
};

/**
 * _rawToFlopBucket — map a raw evaluateRawHand result to a flop strategy bucket.
 * Uses the same structural logic as _rawToTrainerBucket but outputs the flop-specific
 * bucket names that POSTFLOP_STRATEGY_V2 (c-bet) and POSTFLOP_DEFEND_STRATEGY are keyed on:
 *   SET, TWO_PAIR_PLUS, OVERPAIR, TOP_PAIR, SECOND_PAIR, THIRD_PAIR, UNDERPAIR, AIR
 *
 * Returns null for HIGH_CARD (caller handles draw classification).
 * Note: STRAIGHT_FLUSH / QUADS / FULL_HOUSE / FLUSH / STRAIGHT are rare on the flop and
 * map to the nearest flop bucket that captures correct strategy: TWO_PAIR_PLUS for strong
 * made hands where no finer bucket exists on the flop table.
 */
function _rawToFlopBucket(rawResult, heroCards, boardCards) {
    const { rank } = rawResult;

    // Rank 9: straight flush (extremely rare on flop — treat as SET-tier strong made hand)
    if (rank === 9) return 'SET';

    // Rank 8: quads
    if (rank === 8) return 'TWO_PAIR_PLUS';

    // Rank 7: full house
    if (rank === 7) return 'TWO_PAIR_PLUS';

    // Rank 6: flush
    if (rank === 6) return 'TWO_PAIR_PLUS';

    // Rank 5: straight
    if (rank === 5) return 'TWO_PAIR_PLUS';

    // Rank 4: trips — distinguish SET (pocket pair) vs bare trips on paired board
    if (rank === 4) {
        const h1 = RANK_NUM[heroCards[0].rank], h2 = RANK_NUM[heroCards[1].rank];
        return (h1 === h2) ? 'SET' : 'TWO_PAIR_PLUS'; // trips on flop w/ one hole card = strong value
    }

    // Rank 3: two pair
    if (rank === 3) {
        const h1 = RANK_NUM[heroCards[0].rank], h2 = RANK_NUM[heroCards[1].rank];
        const isPocket = h1 === h2;
        if (isPocket) {
            // Pocket pair + board pair → not hero's two-pair; route to OVERPAIR or UNDERPAIR
            const bFreq = _boardRankFreqs(boardCards);
            const bTop = [...bFreq.keys()].sort((a, b) => b - a)[0];
            return h1 > bTop ? 'OVERPAIR' : 'UNDERPAIR';
        }
        return 'TWO_PAIR_PLUS';
    }

    // Rank 2: one pair — OVERPAIR / TOP_PAIR / SECOND_PAIR / THIRD_PAIR / UNDERPAIR
    if (rank === 2) {
        const h1 = RANK_NUM[heroCards[0].rank], h2 = RANK_NUM[heroCards[1].rank];
        const hHigh = Math.max(h1, h2);
        const isPocket = h1 === h2;
        const bFreq = _boardRankFreqs(boardCards);
        const bRanksSorted = [...bFreq.keys()].sort((a, b) => b - a);
        const bTop = bRanksSorted[0];

        if (isPocket) {
            return hHigh > bTop ? 'OVERPAIR' : 'UNDERPAIR';
        }

        const hLow = Math.min(h1, h2);
        const matchHigh = bFreq.get(hHigh) || 0;
        const pairedRank = matchHigh >= 1 ? hHigh : hLow;
        const bDistinct = [...new Set([...boardCards.map(c => RANK_NUM[c.rank])])].sort((a, b) => b - a);
        if (pairedRank === bDistinct[0]) return 'TOP_PAIR';
        if (bDistinct[1] !== undefined && pairedRank === bDistinct[1]) return 'SECOND_PAIR';
        if (bDistinct[2] !== undefined && pairedRank === bDistinct[2]) return 'THIRD_PAIR';
        return 'UNDERPAIR';
    }

    // Rank 1: HIGH_CARD — caller handles draw classification
    return null;
}

/**
 * classifyFlopHand — classify hero's hand on the flop.
 * heroHand: { rank1, rank2, suited } (abstract) or { cards: [{rank,suit},{rank,suit}] } (concrete)
 * flopCards: array of {rank, suit}
 * Returns a string hand class matching POSTFLOP_STRATEGY_V2 bucket keys.
 *
 * Architecture (unified with classifyTurnHand):
 *   1. evaluateRawHand  → raw rank/label
 *   2. _rawToFlopBucket → flop-specific trainer bucket (made hands)
 *   3. Draw classification for HIGH_CARD / no made pair
 */
function classifyFlopHand(heroHand, flopCards) {
    const hr = heroHand.cards || _heroHandToCards(heroHand);

    // --- Layer 1: raw made-hand evaluation ---
    const raw = evaluateRawHand(hr, flopCards);

    // --- Layer 2: map to flop bucket if a made hand is present ---
    if (raw.rank >= 2) {
        return _rawToFlopBucket(raw, hr, flopCards);
    }

    // --- No made pair: draw classification (unchanged from legacy) ---
    const h1 = RANK_NUM[hr[0].rank], h2 = RANK_NUM[hr[1].rank];
    const hHigh = Math.max(h1, h2), hLow = Math.min(h1, h2);
    const hSuited = hr[0].suit === hr[1].suit;
    const hSuit = hSuited ? hr[0].suit : null;

    const fRanks = flopCards.map(c => RANK_NUM[c.rank]).sort((a, b) => b - a);
    const fSuits = flopCards.map(c => c.suit);
    const flopTop = fRanks[0];

    const allRanks = [hHigh, hLow, ...fRanks].sort((a, b) => b - a);
    const uniqueRanks = [...new Set(allRanks)].sort((a, b) => b - a);
    const hasFlushDraw = hSuited && _countSuitOnBoard(hSuit, fSuits) >= 2;
    const hasBackdoorFD = hSuited && _countSuitOnBoard(hSuit, fSuits) === 1;
    const straightInfo = _straightDrawType(uniqueRanks);
    const hasOESD = straightInfo === 'OESD';
    const hasGutshot = straightInfo === 'GUTSHOT';

    // Nut flush draw: ace or king-high flush draw with no higher flush card on board
    const isNFD = hasFlushDraw && (hHigh === 14 || (hHigh >= 13 && _highestFlushCardOnBoard(hSuit, flopCards) < hHigh));

    if (hasFlushDraw && (hasOESD || hasGutshot)) return 'COMBO_DRAW';
    if (isNFD) return 'NFD';
    if (hasFlushDraw) return 'FD';
    if (hasOESD) return 'OESD';
    if (hasGutshot) return 'GUTSHOT';

    // Ace-high (with or without backdoor equity)
    if (hHigh === 14) return 'ACE_HIGH_BACKDOOR';

    // Overcards: both hero cards above flop top
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

    // Family offsets: small adjustments per family on top of IP/OOP base tables
    // BTN is the widest/most aggressive opener → baseline (0)
    // CO slightly tighter, HJ/LJ tighter still, UTG tightest (strongest range → can bet more)
    // OOP families: SB_vs_BB uses OOP base (0 offset), CO_vs_BTN slightly negative (tighter range OOP)
    const FAMILY_OFF = {
        BTN_vs_BB: 0, CO_vs_BB: -0.03, HJ_vs_BB: -0.02, LJ_vs_BB: -0.01,
        UTG_vs_BB: 0.02,   // UTG has the strongest range → slight bet frequency boost
        BTN_vs_SB: 0.02,   // BTN vs SB: tighter caller, PFR has bigger advantage
        SB_vs_BB: 0,        // OOP base already accounts for positional penalty
        CO_vs_BTN: -0.03    // OOP + wider caller range → bet a touch less
    };

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

// ============================================================
// DEFENDER VS C-BET — SRP Flop (V3.1)
// ============================================================
// Hero is the defender (caller preflop) facing a 33% c-bet from the PFR.
// Actions: fold, call, raise
// Families: BTN_vs_BB (hero=BB), CO_vs_BB (hero=BB), SB_vs_BB (hero=BB)
// In all three families, hero is BB defending.

const DEFENDER_FAMILIES = ['BTN_vs_BB', 'CO_vs_BB', 'SB_vs_BB'];

const POSTFLOP_DEFEND_VS_CBET = {};

(function() {
    const HAND_CLASSES = [
        'OVERPAIR','TOP_PAIR','SECOND_PAIR','THIRD_PAIR','UNDERPAIR','SET','TWO_PAIR_PLUS',
        'OESD','GUTSHOT','NFD','FD','COMBO_DRAW','ACE_HIGH_BACKDOOR','OVERCARDS','AIR'
    ];

    // Base defender frequencies: { handClass: { archetype: { fold, call, raise } } }
    // _default used when archetype not specified.
    // Hero is BB (OOP) facing a 33% c-bet in SRP.
    // General logic:
    //   Strong hands → raise for value, some slow-play (call)
    //   Top pair → mostly call, occasional raise on dry boards
    //   Medium pairs → call or fold depending on texture
    //   Draws → call often, raise sometimes as semi-bluff
    //   Air → mostly fold, bluff raise occasionally

    const BASE = {
        SET:              { _default: { fold: 0.00, call: 0.40, raise: 0.60 },
                            MONOTONE: { fold: 0.00, call: 0.30, raise: 0.70 }, TRIPS: { fold: 0.00, call: 0.55, raise: 0.45 },
                            LOW_CONNECTED: { fold: 0.00, call: 0.35, raise: 0.65 } },
        TWO_PAIR_PLUS:    { _default: { fold: 0.00, call: 0.45, raise: 0.55 },
                            MONOTONE: { fold: 0.00, call: 0.35, raise: 0.65 }, TRIPS: { fold: 0.00, call: 0.60, raise: 0.40 },
                            A_HIGH_DRY: { fold: 0.00, call: 0.50, raise: 0.50 } },
        OVERPAIR:         { _default: { fold: 0.00, call: 0.65, raise: 0.35 },
                            A_HIGH_DRY: { fold: 0.00, call: 0.60, raise: 0.40 }, A_HIGH_DYNAMIC: { fold: 0.00, call: 0.70, raise: 0.30 },
                            BROADWAY_DYNAMIC: { fold: 0.00, call: 0.70, raise: 0.30 }, LOW_CONNECTED: { fold: 0.00, call: 0.55, raise: 0.45 },
                            MONOTONE: { fold: 0.05, call: 0.65, raise: 0.30 } },
        TOP_PAIR:         { _default: { fold: 0.02, call: 0.80, raise: 0.18 },
                            A_HIGH_DRY: { fold: 0.00, call: 0.82, raise: 0.18 }, A_HIGH_DYNAMIC: { fold: 0.05, call: 0.78, raise: 0.17 },
                            BROADWAY_STATIC: { fold: 0.02, call: 0.80, raise: 0.18 }, BROADWAY_DYNAMIC: { fold: 0.05, call: 0.78, raise: 0.17 },
                            MID_CONNECTED: { fold: 0.05, call: 0.75, raise: 0.20 }, LOW_CONNECTED: { fold: 0.05, call: 0.72, raise: 0.23 },
                            MONOTONE: { fold: 0.10, call: 0.72, raise: 0.18 } },
        SECOND_PAIR:      { _default: { fold: 0.25, call: 0.65, raise: 0.10 },
                            A_HIGH_DRY: { fold: 0.20, call: 0.70, raise: 0.10 }, BROADWAY_STATIC: { fold: 0.22, call: 0.68, raise: 0.10 },
                            MID_CONNECTED: { fold: 0.30, call: 0.58, raise: 0.12 }, LOW_CONNECTED: { fold: 0.35, call: 0.52, raise: 0.13 },
                            MONOTONE: { fold: 0.35, call: 0.55, raise: 0.10 } },
        THIRD_PAIR:       { _default: { fold: 0.40, call: 0.52, raise: 0.08 },
                            A_HIGH_DRY: { fold: 0.35, call: 0.57, raise: 0.08 }, MID_CONNECTED: { fold: 0.45, call: 0.45, raise: 0.10 },
                            LOW_CONNECTED: { fold: 0.50, call: 0.40, raise: 0.10 }, MONOTONE: { fold: 0.50, call: 0.42, raise: 0.08 } },
        UNDERPAIR:        { _default: { fold: 0.45, call: 0.48, raise: 0.07 },
                            A_HIGH_DRY: { fold: 0.38, call: 0.55, raise: 0.07 }, MID_CONNECTED: { fold: 0.50, call: 0.42, raise: 0.08 },
                            LOW_CONNECTED: { fold: 0.55, call: 0.38, raise: 0.07 }, MONOTONE: { fold: 0.55, call: 0.38, raise: 0.07 } },
        COMBO_DRAW:       { _default: { fold: 0.02, call: 0.55, raise: 0.43 },
                            A_HIGH_DRY: { fold: 0.05, call: 0.60, raise: 0.35 }, MID_CONNECTED: { fold: 0.00, call: 0.48, raise: 0.52 },
                            LOW_CONNECTED: { fold: 0.00, call: 0.45, raise: 0.55 }, MONOTONE: { fold: 0.05, call: 0.50, raise: 0.45 } },
        NFD:              { _default: { fold: 0.03, call: 0.62, raise: 0.35 },
                            A_HIGH_DRY: { fold: 0.05, call: 0.65, raise: 0.30 }, MID_CONNECTED: { fold: 0.02, call: 0.55, raise: 0.43 },
                            MONOTONE: { fold: 0.05, call: 0.58, raise: 0.37 } },
        FD:               { _default: { fold: 0.08, call: 0.70, raise: 0.22 },
                            A_HIGH_DRY: { fold: 0.10, call: 0.72, raise: 0.18 }, MID_CONNECTED: { fold: 0.05, call: 0.65, raise: 0.30 },
                            MONOTONE: { fold: 0.10, call: 0.68, raise: 0.22 } },
        OESD:             { _default: { fold: 0.05, call: 0.68, raise: 0.27 },
                            A_HIGH_DRY: { fold: 0.10, call: 0.70, raise: 0.20 }, BROADWAY_DYNAMIC: { fold: 0.03, call: 0.62, raise: 0.35 },
                            MID_CONNECTED: { fold: 0.03, call: 0.60, raise: 0.37 }, LOW_CONNECTED: { fold: 0.03, call: 0.58, raise: 0.39 } },
        GUTSHOT:          { _default: { fold: 0.30, call: 0.58, raise: 0.12 },
                            A_HIGH_DRY: { fold: 0.35, call: 0.55, raise: 0.10 }, BROADWAY_DYNAMIC: { fold: 0.25, call: 0.60, raise: 0.15 },
                            MID_CONNECTED: { fold: 0.25, call: 0.58, raise: 0.17 } },
        ACE_HIGH_BACKDOOR:{ _default: { fold: 0.35, call: 0.52, raise: 0.13 },
                            A_HIGH_DRY: { fold: 0.25, call: 0.60, raise: 0.15 }, A_HIGH_DYNAMIC: { fold: 0.30, call: 0.55, raise: 0.15 },
                            BROADWAY_STATIC: { fold: 0.30, call: 0.55, raise: 0.15 }, MID_CONNECTED: { fold: 0.40, call: 0.47, raise: 0.13 },
                            LOW_CONNECTED: { fold: 0.45, call: 0.43, raise: 0.12 }, MONOTONE: { fold: 0.42, call: 0.45, raise: 0.13 } },
        OVERCARDS:        { _default: { fold: 0.50, call: 0.40, raise: 0.10 },
                            A_HIGH_DRY: { fold: 0.40, call: 0.48, raise: 0.12 }, BROADWAY_STATIC: { fold: 0.42, call: 0.46, raise: 0.12 },
                            MID_DISCONNECTED: { fold: 0.50, call: 0.40, raise: 0.10 }, LOW_CONNECTED: { fold: 0.60, call: 0.32, raise: 0.08 },
                            MONOTONE: { fold: 0.58, call: 0.34, raise: 0.08 } },
        AIR:              { _default: { fold: 0.72, call: 0.18, raise: 0.10 },
                            A_HIGH_DRY: { fold: 0.65, call: 0.22, raise: 0.13 }, BROADWAY_STATIC: { fold: 0.68, call: 0.20, raise: 0.12 },
                            MID_DISCONNECTED: { fold: 0.72, call: 0.18, raise: 0.10 }, MID_CONNECTED: { fold: 0.78, call: 0.14, raise: 0.08 },
                            LOW_CONNECTED: { fold: 0.82, call: 0.12, raise: 0.06 }, MONOTONE: { fold: 0.78, call: 0.14, raise: 0.08 },
                            TRIPS: { fold: 0.68, call: 0.20, raise: 0.12 } }
    };

    const REASONING = {
        SET: 'Sets should raise for value and protection. Sometimes slow-play on dry boards.',
        TWO_PAIR_PLUS: 'Two pair+ is strong; raise frequently, call to trap on dry textures.',
        OVERPAIR: 'Overpairs are strong vs a c-bet range; mostly call, raise on wet boards for protection.',
        TOP_PAIR: 'Top pair is a core calling hand. Rarely fold. Raise occasionally for value on dry boards.',
        SECOND_PAIR: 'Second pair is a medium-strength call. Fold on very wet boards.',
        THIRD_PAIR: 'Third/bottom pair is marginal. Call on dry boards, fold on wet/dynamic boards.',
        UNDERPAIR: 'Underpairs are weak. Call sometimes on dry boards, fold on wet textures.',
        COMBO_DRAW: 'Combo draws have excellent equity. Raise as a semi-bluff frequently.',
        NFD: 'Nut flush draws have strong equity. Call or raise as a semi-bluff.',
        FD: 'Flush draws have decent equity. Mostly call, raise occasionally.',
        OESD: 'Open-ended draws have ~32% equity. Call is standard, raise on wet boards.',
        GUTSHOT: 'Gutshots are marginal. Call with good implied odds, fold weak gutshots.',
        ACE_HIGH_BACKDOOR: 'Ace-high with backdoor equity. Call on favorable boards, fold on wet ones.',
        OVERCARDS: 'Two overcards have some equity but no pair. Call sparingly, mostly fold.',
        AIR: 'No made hand or draw. Fold is default; raise-bluff occasionally on PFR-favorable boards.'
    };

    // Family offsets: SB_vs_BB defender defends slightly wider (SB opened tighter range)
    const FAM_OFF = { BTN_vs_BB: 0, CO_vs_BB: 0.02, SB_vs_BB: 0.03 };
    // Positive offset → less folding (wider defense). Applied as: fold -= off, call += off/2, raise += off/2

    for (const fam of DEFENDER_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const off = FAM_OFF[fam] || 0;

        for (const arch of FLOP_ARCHETYPES) {
            for (const hc of HAND_CLASSES) {
                const hcData = BASE[hc];
                if (!hcData) continue;
                const raw = hcData[arch] || hcData._default;
                if (!raw) continue;

                // Apply family offset
                let fold = Math.max(0, raw.fold - off);
                let call = raw.call + off * 0.5;
                let raise = raw.raise + off * 0.5;
                // Normalize to sum to 1
                const total = fold + call + raise;
                fold = parseFloat((fold / total).toFixed(2));
                call = parseFloat((call / total).toFixed(2));
                raise = parseFloat((1 - fold - call).toFixed(2));
                // Clamp
                fold = Math.max(0, Math.min(1, fold));
                call = Math.max(0, Math.min(1, call));
                raise = Math.max(0, Math.min(1, raise));

                // Determine preferred action
                let preferred;
                if (fold >= call && fold >= raise) preferred = 'fold';
                else if (raise >= call && raise >= fold) preferred = 'raise';
                else preferred = 'call';

                const sk = makePostflopSpotKeyV2({
                    potType:'SRP', preflopFamily:fam, street:'FLOP', heroRole:'DEFENDER',
                    positionState:'OOP', nodeType:'VS_CBET_DECISION',
                    boardArchetype:arch, heroHandClass:hc
                });
                POSTFLOP_DEFEND_VS_CBET[sk] = {
                    actions: { fold, call, raise },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'V3.1: Defender vs C-Bet'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[DefendVsCbet] Built ${Object.keys(POSTFLOP_DEFEND_VS_CBET).length} defender strategy entries.`);
    }
})();

// --- Defender spot generation ---

/**
 * Generate a defender-vs-cbet postflop spot.
 * Hero is BB (defender). Villain is the PFR who c-bets.
 * familyFilter: optional array of family keys to restrict.
 */
function generateDefenderSpot(maxRetries, familyFilter) {
    maxRetries = maxRetries || 20;
    let fams = [...DEFENDER_FAMILIES];
    if (familyFilter && Array.isArray(familyFilter) && familyFilter.length > 0) {
        const filtered = fams.filter(f => familyFilter.includes(f));
        if (filtered.length > 0) fams = filtered;
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const fam = fams[Math.floor(Math.random() * fams.length)];
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;

        const arch = pickFlopArchetype();
        // Hero is BB (the defender) — deal from BB's calling range vs this villain
        const villainPos = fi.heroPos; // fi.heroPos is the PFR position
        const heroHand = _dealDefenderHeroHand(villainPos);
        if (!heroHand) continue;
        const fc = _generateFlopNoConflict(arch, heroHand);
        const heroHandClass = classifyFlopHand(heroHand, fc);

        const spot = {
            potType:'SRP', preflopFamily:fam, street:'FLOP', heroRole:'DEFENDER',
            positionState:'OOP', nodeType:'VS_CBET_DECISION',
            boardArchetype:arch,
            heroPos:'BB', villainPos:villainPos,
            flopCards:fc, flopClassification:classifyFlop(fc),
            heroHand: heroHand,
            heroHandClass: heroHandClass
        };
        spot.spotKey = makePostflopSpotKeyV2(spot);
        spot.strategy = POSTFLOP_DEFEND_VS_CBET[spot.spotKey] || null;

        if (spot.strategy && spot.heroHand && spot.heroHandClass) return spot;
    }

    // Fallback
    console.warn('[DefendVsCbet] Retries exhausted; forcing BTN_vs_BB fallback.');
    const heroHand = _dealDefenderHeroHand('BTN') || _concreteHand('AK', true);
    const arch = 'A_HIGH_DRY';
    const fc = _generateFlopNoConflict(arch, heroHand);
    const heroHandClass = classifyFlopHand(heroHand, fc);
    const spot = {
        potType:'SRP', preflopFamily:'BTN_vs_BB', street:'FLOP', heroRole:'DEFENDER',
        positionState:'OOP', nodeType:'VS_CBET_DECISION',
        boardArchetype:arch, heroPos:'BB', villainPos:'BTN',
        flopCards:fc, flopClassification:classifyFlop(fc),
        heroHand: heroHand, heroHandClass: heroHandClass
    };
    spot.spotKey = makePostflopSpotKeyV2(spot);
    spot.strategy = POSTFLOP_DEFEND_VS_CBET[spot.spotKey] || null;
    return spot;
}

/**
 * Deal a concrete hero hand from BB's calling range vs a specific villain position.
 * Returns { cards: [{rank, suit}, {rank, suit}], handKey: 'AKs' } or null.
 */
function _dealDefenderHeroHand(villainPos) {
    const key = 'BB_vs_' + villainPos;
    const data = facingRfiRanges[key];
    if (!data || !data['Call'] || data['Call'].length === 0) {
        // Fallback: use a reasonable generic calling range
        return _concreteHand('AJs', true);
    }
    const callRange = data['Call'];
    const allHands = [];
    for (const token of callRange) {
        for (const h of _expandSingle(token)) allHands.push(h);
    }
    if (allHands.length === 0) return _concreteHand('AJs', true);
    const handKey = allHands[Math.floor(Math.random() * allHands.length)];
    const suited = handKey.endsWith('s');
    return _concreteHand(handKey, suited);
}

// --- Defender action scoring ---

function scoreDefenderAction(playerAction, strategy, spot) {
    if (!strategy) return { correct: false, grade: 'unknown', feedback: 'No strategy data.' };
    const actions = strategy.actions;
    const preferred = strategy.preferredAction;
    const playerKey = playerAction.toLowerCase(); // fold, call, raise
    const playerFreq = actions[playerKey] || 0;
    const isCorrect = playerKey === preferred;

    let grade;
    if (playerFreq >= 0.50) grade = 'strong';
    else if (playerFreq >= 0.30) grade = 'marginal';
    else if (playerFreq >= 0.15) grade = 'marginal_wrong';
    else grade = 'clear_wrong';

    const preferredLabel = preferred.charAt(0).toUpperCase() + preferred.slice(1);
    const freqPct = Math.round((actions[preferred] || 0) * 100);

    let feedback;
    if (isCorrect && grade === 'strong') feedback = `Correct. ${preferredLabel} (${freqPct}%).`;
    else if (isCorrect && grade === 'marginal') feedback = `Correct. Close spot — ${preferredLabel} slightly preferred (${freqPct}%).`;
    else if (!isCorrect && grade === 'marginal_wrong') feedback = `Close, but ${preferredLabel} is preferred here (${freqPct}%).`;
    else feedback = `${preferredLabel} is preferred (${freqPct}%). ${strategy.reasoning}`;

    const handClassLabel = (spot && spot.heroHandClass) ? (HAND_CLASS_LABELS[spot.heroHandClass] || spot.heroHandClass) : null;
    if (handClassLabel) feedback += ` [${handClassLabel}]`;

    return { correct: isCorrect, grade, feedback, preferredLabel, freqPct, reasoning: strategy.reasoning };
}

// ============================================================
// SRP POSTFLOP PHASE 2 — TURN ARCHITECTURE
// ============================================================
// Covers: turn card family classification, turn hand reclassification,
// turn strategy (PFR barrel + defender response), turn spot generation.
// Only SRP is implemented. 3BP / limp-pot / squeeze-pot left for future phases.

// --- Turn card family constants ---
const TURN_FAMILIES = [
    'BRICK', 'LOW_BLANK', 'OVERCARD', 'ACE_OVERCARD', 'BROADWAY_OVERCARD',
    'BOARD_PAIR', 'FLUSH_COMPLETE', 'STRAIGHT_COMPLETE', 'DYNAMIC_CONNECTOR'
];

const TURN_FAMILY_LABELS = {
    BRICK: 'Brick', LOW_BLANK: 'Low blank', OVERCARD: 'Overcard',
    ACE_OVERCARD: 'Ace overcard', BROADWAY_OVERCARD: 'Broadway overcard',
    BOARD_PAIR: 'Board pair', FLUSH_COMPLETE: 'Flush card',
    STRAIGHT_COMPLETE: 'Straight card', DYNAMIC_CONNECTOR: 'Dynamic connector'
};

// Turn hand classes — ordered strongest → weakest (used by strategy table iterators).
// STRAIGHT_FLUSH: both royal flush and straight flush map here (strategy is identical).
// QUADS: four of a kind — exposed as its own bucket for accuracy.
// FULL_HOUSE: includes pocket pair on paired board, or one-hole-card trips + separate board pair.
// SET: pocket pair + exactly one board card of that rank (no board pair of that rank).
// TRIPS: one unpaired hole card matches a board rank appearing ≥2 times on the board.
// BOARD_TRIPS: all 3 board cards are the same rank; hero does NOT contribute to the trip rank.
const TURN_HAND_CLASSES = [
    'STRAIGHT_FLUSH', 'QUADS', 'FULL_HOUSE', 'FLUSH', 'STRAIGHT',
    'SET', 'TRIPS', 'BOARD_TRIPS', 'TWO_PAIR', 'OVERPAIR',
    'TOP_PAIR', 'SECOND_PAIR', 'THIRD_PAIR', 'UNDERPAIR',
    'COMBO_DRAW', 'STRONG_DRAW', 'OESD', 'GUTSHOT',
    'ACE_HIGH', 'OVERCARDS', 'AIR'
];

const TURN_HAND_CLASS_LABELS = {
    STRAIGHT_FLUSH: 'Straight flush', QUADS: 'Quads', FULL_HOUSE: 'Full house',
    FLUSH: 'Flush', STRAIGHT: 'Straight', SET: 'Set', TRIPS: 'Trips',
    BOARD_TRIPS: 'Board trips',
    TWO_PAIR: 'Two pair', OVERPAIR: 'Overpair', TOP_PAIR: 'Top pair',
    SECOND_PAIR: 'Second pair', THIRD_PAIR: 'Third pair', UNDERPAIR: 'Underpair',
    COMBO_DRAW: 'Combo draw', STRONG_DRAW: 'Flush draw (turn)',
    OESD: 'OESD', GUTSHOT: 'Gutshot',
    ACE_HIGH: 'Ace-high', OVERCARDS: 'Overcards', AIR: 'Air'
};

// =============================================================================
// RAW HAND EVALUATOR — two-layer postflop evaluation architecture
// =============================================================================
//
// Layer 1: evaluateRawHand(heroCards, boardCards)
//   Returns { rank: 1-9, label: string } matching standard poker hand strength.
//   Works for any board size (3 flop, 4 turn, 5 river) — no street-specific hacks.
//   Hand ranks (9 = strongest):
//     9 STRAIGHT_FLUSH (includes ROYAL_FLUSH)
//     8 QUADS
//     7 FULL_HOUSE
//     6 FLUSH
//     5 STRAIGHT
//     4 TRIPS
//     3 TWO_PAIR
//     2 PAIR
//     1 HIGH_CARD
//
// Layer 2: _rawToTrainerBucket(rawResult, heroCards, boardCards)
//   Maps raw eval into trainer strategy buckets (TURN_HAND_CLASSES).
//   Preserves poker-teaching distinctions: SET vs TRIPS, OVERPAIR vs TOP_PAIR, etc.
//   QUADS and STRAIGHT_FLUSH are exposed as trainer buckets.
//   ROYAL_FLUSH maps to STRAIGHT_FLUSH bucket (same strategy; label updated in LABELS).
//
// classifyTurnHand() delegates made-hand detection to this pipeline,
// then appends existing draw logic for hands with no made pair/better.
// =============================================================================

/**
 * _boardRankFreqs — frequency map of ranks across any number of board cards.
 * Works identically for 3 (flop), 4 (turn), or 5 (river) community cards.
 * Returns Map<rankNum, count>.
 */
function _boardRankFreqs(cards) {
    const freq = new Map();
    for (const c of cards) {
        const r = RANK_NUM[c.rank];
        freq.set(r, (freq.get(r) || 0) + 1);
    }
    return freq;
}

// --- Helper: check if sortedUniqueRanks contains a made straight (5 consecutive) ---
function _hasMadeStraight(sortedUniqueRanks) {
    const ranks = [...sortedUniqueRanks];
    if (ranks.includes(14)) ranks.push(1); // ace can play low
    const unique = [...new Set(ranks)];
    for (let low = 1; low <= 10; low++) {
        const window5 = [low, low+1, low+2, low+3, low+4];
        const have = window5.filter(r => unique.includes(r)).length;
        if (have >= 5) return true;
    }
    return false;
}

// --- Helper: check if 4-card board (3 flop + turn) enables obvious straight ---
function _turnBoardHasStraightDanger(allBoardRanks) {
    const ranks = [...allBoardRanks];
    if (ranks.includes(14)) ranks.push(1);
    const unique = [...new Set(ranks)];
    for (let low = 1; low <= 10; low++) {
        const window5 = [low, low+1, low+2, low+3, low+4];
        const have = window5.filter(r => unique.includes(r)).length;
        if (have >= 4) return true;
    }
    return false;
}

/**
 * _hasStraightFlush — check if hero + board contains a 5-card straight flush.
 * allCards: combined array of hero cards + board cards (any length ≥ 5).
 * Returns true if any 5-card combination forms a straight flush.
 * Uses suit grouping + per-suit straight detection.
 */
function _hasStraightFlush(allCards) {
    // Group ranks by suit
    const bySuit = {};
    for (const c of allCards) {
        const s = c.suit, r = RANK_NUM[c.rank];
        if (!bySuit[s]) bySuit[s] = [];
        bySuit[s].push(r);
    }
    for (const ranks of Object.values(bySuit)) {
        if (ranks.length < 5) continue;
        const withLow = ranks.includes(14) ? [...ranks, 1] : [...ranks];
        const unique = [...new Set(withLow)];
        for (let lo = 1; lo <= 10; lo++) {
            const w = [lo, lo+1, lo+2, lo+3, lo+4];
            if (w.every(r => unique.includes(r))) return true;
        }
    }
    return false;
}

/**
 * _isRoyalFlush — straight flush with T-J-Q-K-A all of same suit.
 */
function _isRoyalFlush(allCards) {
    const bySuit = {};
    for (const c of allCards) {
        const s = c.suit, r = RANK_NUM[c.rank];
        if (!bySuit[s]) bySuit[s] = [];
        bySuit[s].push(r);
    }
    const royal = new Set([10, 11, 12, 13, 14]);
    for (const ranks of Object.values(bySuit)) {
        if (royal.size === [...royal].filter(r => ranks.includes(r)).length) return true;
    }
    return false;
}

/**
 * evaluateRawHand — Layer 1 raw evaluator.
 * heroCards: array of 2 card objects {rank, suit}
 * boardCards: array of 3-5 card objects {rank, suit}
 * Returns { rank: number (1-9), label: string }
 *
 * Rank scale (9 = best):
 *   9 = STRAIGHT_FLUSH (includes royal flush — label will say ROYAL_FLUSH if applicable)
 *   8 = QUADS
 *   7 = FULL_HOUSE
 *   6 = FLUSH
 *   5 = STRAIGHT
 *   4 = TRIPS
 *   3 = TWO_PAIR
 *   2 = PAIR
 *   1 = HIGH_CARD
 */
function evaluateRawHand(heroCards, boardCards) {
    const allCards = [...heroCards, ...boardCards];
    const allRankNums = allCards.map(c => RANK_NUM[c.rank]);
    const freq = _boardRankFreqs(allCards); // rank → count across ALL cards

    // Frequency counts
    let quads = 0, trips = 0, pairs = 0;
    for (const cnt of freq.values()) {
        if (cnt >= 4) quads++;
        else if (cnt === 3) trips++;
        else if (cnt === 2) pairs++;
    }

    // Flush detection: any suit appearing ≥ 5 times among all cards
    const suitFreq = {};
    for (const c of allCards) suitFreq[c.suit] = (suitFreq[c.suit] || 0) + 1;
    const hasFlush = Object.values(suitFreq).some(n => n >= 5);

    // Straight detection (unique ranks across all cards)
    const uniqueAllRanks = [...new Set(allRankNums)].sort((a, b) => b - a);
    const hasStraight = _hasMadeStraight(uniqueAllRanks);

    // Straight flush
    const hasSF = (hasFlush || hasStraight) && _hasStraightFlush(allCards);

    // --- Evaluate in descending strength order ---
    if (hasSF) {
        const label = _isRoyalFlush(allCards) ? 'ROYAL_FLUSH' : 'STRAIGHT_FLUSH';
        return { rank: 9, label };
    }
    if (quads >= 1)                    return { rank: 8, label: 'QUADS' };
    if (trips >= 1 && pairs >= 1)      return { rank: 7, label: 'FULL_HOUSE' };
    if (trips >= 2)                    return { rank: 7, label: 'FULL_HOUSE' }; // two sets of trips = FH
    if (hasFlush)                      return { rank: 6, label: 'FLUSH' };
    if (hasStraight)                   return { rank: 5, label: 'STRAIGHT' };
    if (trips >= 1)                    return { rank: 4, label: 'TRIPS' };
    if (pairs >= 2)                    return { rank: 3, label: 'TWO_PAIR' };
    if (pairs === 1)                   return { rank: 2, label: 'PAIR' };
    return { rank: 1, label: 'HIGH_CARD' };
}

/**
 * _rawToTrainerBucket — Layer 2 mapping.
 * Converts a raw evaluateRawHand result into a TURN_HAND_CLASSES trainer bucket,
 * adding poker-teaching distinctions (SET vs TRIPS, OVERPAIR vs TOP_PAIR, etc.)
 * that the raw evaluator does not distinguish.
 *
 * rawResult:  { rank, label } from evaluateRawHand
 * heroCards:  the 2 hero hole cards
 * boardCards: the community cards (3 or 4 or 5)
 * Returns a TURN_HAND_CLASSES key string.
 */
function _rawToTrainerBucket(rawResult, heroCards, boardCards) {
    const { rank, label } = rawResult;

    // --- Rank 9: straight flush / royal flush ---
    if (rank === 9) return 'STRAIGHT_FLUSH'; // ROYAL_FLUSH maps here; label shown via TURN_HAND_CLASS_LABELS

    // --- Rank 8: quads ---
    if (rank === 8) return 'QUADS';

    // --- Rank 7: full house ---
    if (rank === 7) return 'FULL_HOUSE';

    // --- Rank 6: flush ---
    if (rank === 6) return 'FLUSH';

    // --- Rank 5: straight ---
    if (rank === 5) return 'STRAIGHT';

    // --- Rank 4: trips — distinguish SET / TRIPS / BOARD_TRIPS ---
    if (rank === 4) {
        const h1 = RANK_NUM[heroCards[0].rank], h2 = RANK_NUM[heroCards[1].rank];
        const isPocket = h1 === h2;
        if (isPocket) return 'SET';  // pocket pair flopped/turned a set

        // Detect BOARD_TRIPS: the trip rank appears 3 times on the board itself,
        // meaning hero contributes zero cards to the three-of-a-kind.
        const bFreq = _boardRankFreqs(boardCards);
        for (const [r, cnt] of bFreq.entries()) {
            if (cnt >= 3 && r !== h1 && r !== h2) return 'BOARD_TRIPS';
        }
        return 'TRIPS';              // one hole card matches a board rank appearing ≥2 times
    }

    // --- Rank 3: two pair ---
    // Edge case: pocket pair + board has its own separate pair = raw eval sees TWO_PAIR,
    // but hero's pocket pair is not paired with the board. This is OVERPAIR or UNDERPAIR,
    // not a hero-made two pair. Detect by checking if either hole card touches the board.
    if (rank === 3) {
        const h1 = RANK_NUM[heroCards[0].rank], h2 = RANK_NUM[heroCards[1].rank];
        const isPocket = h1 === h2;
        if (isPocket) {
            // Pocket pair + board pair = board two-pair, not hero two-pair.
            // Route to OVERPAIR or UNDERPAIR based on whether pocket beats board top.
            const bFreq = _boardRankFreqs(boardCards);
            const bTop = [...bFreq.keys()].sort((a, b) => b - a)[0];
            return h1 > bTop ? 'OVERPAIR' : 'UNDERPAIR';
        }
        return 'TWO_PAIR';
    }

    // --- Rank 2: one pair — distinguish OVERPAIR / TOP_PAIR / SECOND_PAIR / THIRD_PAIR / UNDERPAIR ---
    if (rank === 2) {
        const h1 = RANK_NUM[heroCards[0].rank], h2 = RANK_NUM[heroCards[1].rank];
        const hHigh = Math.max(h1, h2), hLow = Math.min(h1, h2);
        const isPocket = h1 === h2;
        const bFreq = _boardRankFreqs(boardCards);
        const bRanksSorted = [...bFreq.keys()].sort((a, b) => b - a); // sorted desc unique
        const bTop = bRanksSorted[0];

        if (isPocket) {
            // Pocket pair not hitting board (if it hit board, raw eval gives TRIPS or better)
            if (hHigh > bTop) return 'OVERPAIR';
            return 'UNDERPAIR';
        }

        // Unpaired hand: find which hole card pairs a board rank
        const matchHigh = bFreq.get(hHigh) || 0;
        const matchLow  = bFreq.get(hLow)  || 0;
        const pairedRank = matchHigh >= 1 ? hHigh : hLow;

        const bDistinct = [...new Set([...boardCards.map(c => RANK_NUM[c.rank])])].sort((a, b) => b - a);
        if (pairedRank === bDistinct[0]) return 'TOP_PAIR';
        if (bDistinct[1] !== undefined && pairedRank === bDistinct[1]) return 'SECOND_PAIR';
        if (bDistinct[2] !== undefined && pairedRank === bDistinct[2]) return 'THIRD_PAIR';
        return 'UNDERPAIR'; // shouldn't normally reach here with well-formed input
    }

    // --- Rank 1: high card — no pair at all, classify as AIR ---
    return 'AIR';
}

/**
 * classifyTurnCard — classify the turn card relative to the flop.
 * turnCard: { rank, suit }
 * flopCards: array of 3 { rank, suit }
 * Returns a TURN_FAMILIES key.
 */
function classifyTurnCard(turnCard, flopCards) {
    const fRanks = flopCards.map(c => RANK_NUM[c.rank]).sort((a, b) => b - a);
    const fSuits = flopCards.map(c => c.suit);
    const tRank = RANK_NUM[turnCard.rank];
    const tSuit = turnCard.suit;
    const fTop = fRanks[0];
    const fBot = fRanks[2];

    // BOARD_PAIR: turn card pairs one of the flop cards
    if (fRanks.includes(tRank)) return 'BOARD_PAIR';

    // FLUSH_COMPLETE: 3 flop cards of one suit + turn brings 4th; or 2+2 two-tone flop + matching turn
    const suitCount = {};
    for (const s of fSuits) suitCount[s] = (suitCount[s] || 0) + 1;
    for (const [s, cnt] of Object.entries(suitCount)) {
        if (cnt >= 2 && tSuit === s) return 'FLUSH_COMPLETE';
    }

    // STRAIGHT_COMPLETE: turn + flop creates 4 cards in a 5-card straight window
    const allBoardRanks = [...fRanks, tRank];
    if (_turnBoardHasStraightDanger(allBoardRanks)) return 'STRAIGHT_COMPLETE';

    // ACE_OVERCARD: ace not previously on board
    if (tRank === 14 && !fRanks.includes(14)) return 'ACE_OVERCARD';

    // BROADWAY_OVERCARD: T/J/Q/K overcard above flop top
    if (tRank > fTop && tRank >= 10) return 'BROADWAY_OVERCARD';

    // OVERCARD: any card above flop top
    if (tRank > fTop) return 'OVERCARD';

    // LOW_BLANK: low card (≤5) well below the flop
    if (tRank <= 5 && tRank < fBot) return 'LOW_BLANK';

    // DYNAMIC_CONNECTOR: mid-range card close to flop ranks (adds draws)
    if (tRank >= 4 && tRank <= 9) {
        const minGap = Math.min(...fRanks.map(r => Math.abs(r - tRank)));
        if (minGap <= 3) return 'DYNAMIC_CONNECTOR';
    }

    return 'BRICK';
}

// =============================================================================
// TURN TEXTURE CLASSIFICATION — rich texture analysis for strategy modifiers
// =============================================================================
//
// classifyTurnTexture returns { primaryTexture, flags } describing how the turn
// card changes the board.  The primaryTexture is the single most relevant label;
// flags are boolean attributes that can overlap (e.g. an overcard can also add
// straight pressure).  Strategy modifiers use these flags for fine-grained
// frequency adjustments on top of the base turnFamily-keyed tables.
//
// TURN_TEXTURE_LABELS maps primaryTexture values to human-readable text shown
// in trainer feedback.

const TURN_TEXTURE_LABELS = {
    BLANK:               'Blank',
    LOW_BLANK:           'Low blank',
    OVERCARD:            'Overcard',
    BROADWAY_OVERCARD:   'Broadway overcard',
    ACE_OVERCARD:        'Ace overcard',
    TOP_CARD_PAIR:       'Top-card pair',
    MIDDLE_CARD_PAIR:    'Middle-card pair',
    BOTTOM_CARD_PAIR:    'Bottom-card pair',
    FLUSH_COMPLETING:    'Flush completer',
    FLUSH_DRAWING:       'Flush draw card',
    STRAIGHT_COMPLETING: 'Straight completer',
    STRAIGHT_DRAWING:    'Straight draw card',
    DYNAMIC_SHIFT:       'Dynamic shift'
};

/**
 * classifyTurnTexture — rich turn card texture analysis.
 * flopCards: array of 3 {rank, suit}
 * turnCard: {rank, suit}
 * Returns { primaryTexture: string, flags: {…boolean…} }
 */
function classifyTurnTexture(flopCards, turnCard) {
    const fRanks = flopCards.map(c => RANK_NUM[c.rank]).sort((a, b) => b - a);
    const fSuits = flopCards.map(c => c.suit);
    const tRank  = RANK_NUM[turnCard.rank];
    const tSuit  = turnCard.suit;
    const fTop   = fRanks[0];
    const fMid   = fRanks[1];
    const fBot   = fRanks[2];

    // ── Flush analysis ──
    const suitCount = {};
    for (const s of fSuits) suitCount[s] = (suitCount[s] || 0) + 1;
    const flopMaxSuited = Math.max(...Object.values(suitCount));
    // Monotone flop (3 suited) + turn matches = 4 flush
    const completesFlush = (flopMaxSuited === 3 && suitCount[tSuit] === 3) ||
                           (flopMaxSuited === 2 && suitCount[tSuit] === 2);
    // Flush density: turn creates 3 cards of one suit on the board (but not 4).
    // This is meaningful because villain could have 2 of that suit for a flush draw.
    // On a rainbow flop, the turn can only create 2-of-suit at most — not strategically
    // meaningful for flush density.  On a two-tone flop, matching the majority suit
    // completes flush (handled above); matching the minority suit creates 2+1+1 = not
    // 3-suited.  So the main case is: two-tone flop where turn matches one of the
    // two suits, creating 3-of-suit but not 4.
    let addsFlushDensity = false;
    if (!completesFlush) {
        // Count suits on full 4-card board
        const boardSuitCount = {};
        for (const s of fSuits) boardSuitCount[s] = (boardSuitCount[s] || 0) + 1;
        boardSuitCount[tSuit] = (boardSuitCount[tSuit] || 0) + 1;
        // 3-of-suit on board = meaningful flush density (possible flush draw for villain)
        addsFlushDensity = Object.values(boardSuitCount).some(n => n === 3);
    }

    // ── Board pair analysis ──
    const pairsTopCard    = tRank === fTop;
    const pairsMiddleCard = tRank === fMid && fMid !== fTop; // distinct middle
    const pairsBottomCard = tRank === fBot && fBot !== fMid; // distinct bottom
    const isBoardPair     = pairsTopCard || pairsMiddleCard || pairsBottomCard;

    // ── Overcard analysis ──
    const isOvercard         = tRank > fTop && !isBoardPair;
    const isBroadwayOvercard = isOvercard && tRank >= 10; // T, J, Q, K, A
    const isAceOvercard      = isOvercard && tRank === 14;

    // ── Straight analysis ──
    const allBoardRanks = [...fRanks, tRank];
    const completesStraight = !isBoardPair && _turnBoardHasStraightDanger(allBoardRanks);
    // Straight pressure: turn is close to flop ranks (within 2 gap) but doesn't
    // complete a 4-in-a-row straight window.  Measures increased draw density.
    let addsStraightPressure = false;
    if (!completesStraight && !isBoardPair) {
        const minGap = Math.min(...fRanks.map(r => Math.abs(r - tRank)));
        if (minGap <= 2 && tRank >= 3 && tRank <= 13) addsStraightPressure = true;
        // Also when turn + any 2 flop cards span ≤ 4 (creates gutshot / OESD density)
        if (!addsStraightPressure && minGap <= 3 && tRank >= 4 && tRank <= 12) {
            // Check if turn + flop create 3-in-a-row within a 5-card window
            const withAceLow = allBoardRanks.includes(14) ? [...allBoardRanks, 1] : [...allBoardRanks];
            const unique = [...new Set(withAceLow)].sort((a, b) => a - b);
            for (let lo = 1; lo <= 10; lo++) {
                const w5 = [lo, lo+1, lo+2, lo+3, lo+4];
                if (w5.filter(r => unique.includes(r)).length >= 3) {
                    addsStraightPressure = true;
                    break;
                }
            }
        }
    }

    // ── Blank detection ──
    const isBlank = !isOvercard && !isBoardPair && !completesFlush && !completesStraight &&
                    !addsStraightPressure && !addsFlushDensity && tRank < fTop;
    const isLowBlank = isBlank && tRank <= 5;

    // ── Dynamic shift: umbrella for high-volatility turns ──
    const isDynamicShift = completesFlush || completesStraight ||
                           (isBroadwayOvercard && (addsStraightPressure || addsFlushDensity)) ||
                           (isAceOvercard) ||
                           (addsStraightPressure && addsFlushDensity);

    // ── Primary texture (most relevant single label) ──
    let primaryTexture;
    if (completesFlush)            primaryTexture = 'FLUSH_COMPLETING';
    else if (completesStraight)    primaryTexture = 'STRAIGHT_COMPLETING';
    else if (pairsTopCard)         primaryTexture = 'TOP_CARD_PAIR';
    else if (pairsMiddleCard)      primaryTexture = 'MIDDLE_CARD_PAIR';
    else if (pairsBottomCard)      primaryTexture = 'BOTTOM_CARD_PAIR';
    else if (isAceOvercard)        primaryTexture = 'ACE_OVERCARD';
    else if (isBroadwayOvercard)   primaryTexture = 'BROADWAY_OVERCARD';
    else if (isOvercard)           primaryTexture = 'OVERCARD';
    else if (isDynamicShift)       primaryTexture = 'DYNAMIC_SHIFT';
    else if (addsFlushDensity)     primaryTexture = 'FLUSH_DRAWING';
    else if (addsStraightPressure) primaryTexture = 'STRAIGHT_DRAWING';
    else if (isLowBlank)           primaryTexture = 'LOW_BLANK';
    else                           primaryTexture = 'BLANK';

    return {
        primaryTexture,
        flags: {
            isBlank,
            isLowBlank,
            isOvercard,
            isBroadwayOvercard,
            isAceOvercard,
            isBoardPair,
            pairsTopCard,
            pairsMiddleCard,
            pairsBottomCard,
            completesFlush,
            addsFlushDensity,
            completesStraight,
            addsStraightPressure,
            isDynamicShift
        }
    };
}

// =============================================================================
// TURN TEXTURE MODIFIERS — adjust base strategy frequencies by texture flags
// =============================================================================
//
// _applyTurnTextureModifier takes a base bet frequency (from the pre-computed
// turnFamily-keyed strategy table) and adjusts it based on the richer turnTexture
// flags.  Returns a modified frequency clamped to [0.05, 0.95].
//
// The modifiers are small additive adjustments that stack.  They represent
// directionally correct poker intuitions without solver precision.

/**
 * _turnTextureModifier — compute additive frequency offset for bet/barrel.
 * Positive = bet more, negative = bet less.
 * heroHandClass: TURN_HAND_CLASSES key
 * flags: turnTexture.flags object
 */
function _turnTextureModifier(heroHandClass, flags) {
    let mod = 0;

    // === BLANK / LOW_BLANK: safe runout favors continued aggression ===
    if (flags.isBlank || flags.isLowBlank) {
        // Value hands bet more freely on bricks
        if (['OVERPAIR','TOP_PAIR','TWO_PAIR','SET','TRIPS','BOARD_TRIPS'].includes(heroHandClass)) {
            mod += 0.04;
        }
        // Semi-bluffs improve (less danger, more fold equity)
        if (['COMBO_DRAW','STRONG_DRAW','OESD','GUTSHOT'].includes(heroHandClass)) {
            mod += 0.03;
        }
        // Even air gets a small bump on pure bricks
        if (['ACE_HIGH','OVERCARDS','AIR'].includes(heroHandClass)) {
            mod += 0.02;
        }
        // Extra bump for true low blanks (2-5 below the board)
        if (flags.isLowBlank) mod += 0.02;
    }

    // === OVERCARD: changes range dynamics ===
    if (flags.isOvercard) {
        // Top pair / second pair slow down (they got weaker)
        if (['TOP_PAIR','SECOND_PAIR','THIRD_PAIR'].includes(heroHandClass)) {
            mod -= 0.04;
        }
        // Overpair slows down on overcard (esp. non-ace broadway)
        if (heroHandClass === 'OVERPAIR') {
            mod -= 0.03;
        }
        // Underpair: even worse
        if (heroHandClass === 'UNDERPAIR') {
            mod -= 0.04;
        }
    }

    // === BROADWAY OVERCARD: PFR range advantage improves ===
    if (flags.isBroadwayOvercard) {
        // For PFR (caller context handled by defend modifier): range advantage
        // means air/overcards get slightly better bluff opportunities
        if (['ACE_HIGH','OVERCARDS','AIR'].includes(heroHandClass)) {
            mod += 0.02;
        }
        // Strong hands unaffected or slight plus from range advantage
        if (['SET','TWO_PAIR','TRIPS','BOARD_TRIPS','FULL_HOUSE'].includes(heroHandClass)) {
            mod += 0.01;
        }
    }

    // === ACE OVERCARD: dramatic shift ===
    if (flags.isAceOvercard) {
        // Most non-ace made hands slow down significantly
        if (['OVERPAIR','TOP_PAIR','SECOND_PAIR','THIRD_PAIR','UNDERPAIR'].includes(heroHandClass)) {
            mod -= 0.06;
        }
        // Ace-high itself improves (hit top pair if we have ace)
        if (heroHandClass === 'ACE_HIGH') {
            mod += 0.03;
        }
    }

    // === BOARD PAIR: specific pair location matters ===
    if (flags.isBoardPair) {
        // Trips / full house / quads get correctly stronger
        if (['TRIPS','BOARD_TRIPS','FULL_HOUSE','QUADS','SET'].includes(heroHandClass)) {
            mod += 0.03;
        }
        // Thin value hands slow down (fewer bluff catchers in villain range)
        if (['TOP_PAIR','SECOND_PAIR','OVERPAIR'].includes(heroHandClass)) {
            mod -= 0.03;
        }
        // Bluffs generally reduce on paired boards
        if (['ACE_HIGH','OVERCARDS','AIR','GUTSHOT'].includes(heroHandClass)) {
            mod -= 0.04;
        }
    }
    // Top card pair: strongest board pair effect for one-pair hands
    if (flags.pairsTopCard) {
        if (['TOP_PAIR','OVERPAIR'].includes(heroHandClass)) {
            mod -= 0.02; // additional slowdown
        }
    }
    // Bottom card pair: less threatening, can still barrel
    if (flags.pairsBottomCard) {
        if (['OVERPAIR','TOP_PAIR'].includes(heroHandClass)) {
            mod += 0.02; // partially offset — bottom pair is less scary
        }
    }

    // === FLUSH COMPLETING: major equity shift ===
    if (flags.completesFlush) {
        // Made flush bets strongly
        if (heroHandClass === 'FLUSH') {
            mod += 0.05;
        }
        // Non-flush one-pair hands slow down a lot
        if (['TOP_PAIR','SECOND_PAIR','THIRD_PAIR','OVERPAIR','UNDERPAIR'].includes(heroHandClass)) {
            mod -= 0.06;
        }
        // Naked bluffs reduce substantially
        if (['ACE_HIGH','OVERCARDS','AIR'].includes(heroHandClass)) {
            mod -= 0.06;
        }
        // Two pair / set: still bet but cautiously
        if (['TWO_PAIR','SET'].includes(heroHandClass)) {
            mod -= 0.03;
        }
    }

    // === FLUSH DRAWING: increased flush density but not completing ===
    if (flags.addsFlushDensity) {
        // Flush draws themselves improve (more outs visible, more disguise)
        if (['STRONG_DRAW','COMBO_DRAW'].includes(heroHandClass)) {
            mod += 0.02;
        }
        // Made hands slightly more cautious
        if (['TOP_PAIR','SECOND_PAIR','OVERPAIR'].includes(heroHandClass)) {
            mod -= 0.02;
        }
    }

    // === STRAIGHT COMPLETING: medium hands slow down ===
    if (flags.completesStraight) {
        // Made straight bets hard
        if (heroHandClass === 'STRAIGHT') {
            mod += 0.04;
        }
        // Medium-strength one-pair hands slow way down
        if (['TOP_PAIR','SECOND_PAIR','OVERPAIR','UNDERPAIR'].includes(heroHandClass)) {
            mod -= 0.05;
        }
        // Bluffs reduce
        if (['ACE_HIGH','OVERCARDS','AIR','GUTSHOT'].includes(heroHandClass)) {
            mod -= 0.04;
        }
    }

    // === STRAIGHT DRAWING: draw pressure increases ===
    if (flags.addsStraightPressure) {
        // OESD / combo draws get more aggressive
        if (['OESD','COMBO_DRAW'].includes(heroHandClass)) {
            mod += 0.03;
        }
        // Medium hands slightly cautious
        if (['TOP_PAIR','SECOND_PAIR'].includes(heroHandClass)) {
            mod -= 0.02;
        }
    }

    // === DYNAMIC SHIFT: general volatility increase ===
    if (flags.isDynamicShift) {
        // Strong hands polarize more (bet or check, less middle ground)
        if (['SET','TWO_PAIR','FLUSH','STRAIGHT'].includes(heroHandClass)) {
            mod += 0.02;
        }
        // Marginal hands check more
        if (['SECOND_PAIR','THIRD_PAIR','UNDERPAIR'].includes(heroHandClass)) {
            mod -= 0.03;
        }
    }

    return mod;
}

/**
 * _applyTurnTextureModifier — apply texture modifier to a base frequency.
 * Returns adjusted frequency clamped to [0.05, 0.95].
 */
function _applyTurnTextureModifier(baseFreq, heroHandClass, turnTexture) {
    if (!turnTexture || !turnTexture.flags) return baseFreq;
    const mod = _turnTextureModifier(heroHandClass, turnTexture.flags);
    return Math.max(0.05, Math.min(0.95, parseFloat((baseFreq + mod).toFixed(2))));
}

/**
 * _applyDefenderTextureModifier — apply texture modifier to defender fold/call/raise.
 * Returns adjusted {fold, call, raise} normalized to sum=1.
 */
function _applyDefenderTextureModifier(baseFCR, heroHandClass, turnTexture) {
    if (!turnTexture || !turnTexture.flags) return baseFCR;
    const flags = turnTexture.flags;
    let foldAdj = 0, callAdj = 0, raiseAdj = 0;

    // Defender-specific adjustments (BB facing turn bet)
    // On blanks: defend more (less scary for medium hands)
    if (flags.isBlank || flags.isLowBlank) {
        if (['TOP_PAIR','SECOND_PAIR','OVERPAIR'].includes(heroHandClass)) {
            foldAdj -= 0.04; callAdj += 0.03; raiseAdj += 0.01;
        }
        if (['COMBO_DRAW','STRONG_DRAW','OESD'].includes(heroHandClass)) {
            foldAdj -= 0.03; callAdj += 0.02; raiseAdj += 0.01;
        }
    }
    // Overcard turns: defender weaker (villain likely has more overcards)
    if (flags.isOvercard) {
        if (['TOP_PAIR','SECOND_PAIR','THIRD_PAIR'].includes(heroHandClass)) {
            foldAdj += 0.04; callAdj -= 0.03; raiseAdj -= 0.01;
        }
    }
    if (flags.isAceOvercard) {
        if (['OVERPAIR','TOP_PAIR','SECOND_PAIR'].includes(heroHandClass)) {
            foldAdj += 0.05; callAdj -= 0.04; raiseAdj -= 0.01;
        }
    }
    // Board pair: defender with trips raises more; weak hands fold more
    if (flags.isBoardPair) {
        if (['TRIPS','BOARD_TRIPS','FULL_HOUSE','QUADS'].includes(heroHandClass)) {
            raiseAdj += 0.04; callAdj -= 0.02; foldAdj -= 0.02;
        }
        if (['ACE_HIGH','OVERCARDS','AIR'].includes(heroHandClass)) {
            foldAdj += 0.04; callAdj -= 0.03; raiseAdj -= 0.01;
        }
    }
    // Flush completing: non-flush hands fold more; flush raises more
    if (flags.completesFlush) {
        if (heroHandClass === 'FLUSH') {
            raiseAdj += 0.06; callAdj -= 0.03; foldAdj -= 0.03;
        }
        if (['TOP_PAIR','SECOND_PAIR','OVERPAIR','UNDERPAIR'].includes(heroHandClass)) {
            foldAdj += 0.06; callAdj -= 0.04; raiseAdj -= 0.02;
        }
    }
    // Straight completing: similar pattern
    if (flags.completesStraight) {
        if (heroHandClass === 'STRAIGHT') {
            raiseAdj += 0.05; callAdj -= 0.02; foldAdj -= 0.03;
        }
        if (['TOP_PAIR','SECOND_PAIR','OVERPAIR'].includes(heroHandClass)) {
            foldAdj += 0.05; callAdj -= 0.03; raiseAdj -= 0.02;
        }
    }

    let fold  = Math.max(0, baseFCR.fold + foldAdj);
    let call  = Math.max(0, baseFCR.call + callAdj);
    let raise = Math.max(0, baseFCR.raise + raiseAdj);
    const total = fold + call + raise;
    if (total <= 0) return baseFCR;
    fold  = parseFloat((fold  / total).toFixed(2));
    call  = parseFloat((call  / total).toFixed(2));
    raise = parseFloat((1 - fold - call).toFixed(2));
    return {
        fold:  Math.max(0, Math.min(1, fold)),
        call:  Math.max(0, Math.min(1, call)),
        raise: Math.max(0, Math.min(1, raise))
    };
}

// =============================================================================
// TURN TEXTURE-AWARE REASONING — contextual feedback per texture + hand class
// =============================================================================

/**
 * _turnTextureReasoningTag — short texture explanation appended to feedback.
 * Returns a string like "Blank turn favors continued betting." or ''.
 */
function _turnTextureReasoningTag(turnTexture) {
    if (!turnTexture) return '';
    const pt = turnTexture.primaryTexture;
    const f  = turnTexture.flags;

    if (f.completesFlush)
        return 'Flush-completing turn shifts equities; non-flush hands check more.';
    if (f.completesStraight)
        return 'Straight-completing turn increases danger; medium hands slow down.';
    if (f.isAceOvercard)
        return 'Ace overcard dramatically changes range dynamics; PFR range improves.';
    if (f.isBroadwayOvercard)
        return 'Broadway overcard improves PFR range advantage.';
    if (f.isOvercard)
        return 'Overcard turn weakens flop-made hands and shifts range dynamics.';
    if (f.pairsTopCard)
        return 'Top-card paired turn reduces thin value and slows bluffs.';
    if (f.pairsMiddleCard)
        return 'Middle-card paired turn moderately reduces aggression.';
    if (f.pairsBottomCard)
        return 'Bottom-card paired turn is less threatening but still changes value thresholds.';
    if (f.isBoardPair)
        return 'Board-pair turn reduces value threshold and slows bluffs.';
    if (f.isDynamicShift)
        return 'Dynamic turn increases board volatility; ranges polarize.';
    if (f.addsFlushDensity)
        return 'Turn adds flush density; slight caution for non-flush holdings.';
    if (f.addsStraightPressure)
        return 'Turn adds straight draw pressure; connectivity increases.';
    if (f.isLowBlank)
        return 'Low blank favors continued value/protection betting.';
    if (f.isBlank)
        return 'Blank turn favors continued aggression with value and draws.';

    return '';
}

// =============================================================================
// CONTEXT-AWARE TURN REASONING BUILDER
// =============================================================================
//
// _buildTurnReasoning produces non-contradictory trainer feedback by combining:
//   1. A base sentence for the hand class
//   2. A texture-aware follow-up that references only conditions actually present
//
// It replaces the old static TURN_REASONING strings at enrichment time so that
// lines like "fold only to ace overcards" never appear when the board already
// contains an ace.

/**
 * _buildTurnReasoning — context-aware reasoning for turn trainer feedback.
 * opts: {
 *   heroHandClass: TURN_HAND_CLASSES key,
 *   turnTexture:   { primaryTexture, flags },
 *   nodeType:      string (TURN_CBET_DECISION | TURN_VS_BET_DECISION | TURN_DELAYED_CBET_DECISION),
 *   heroHand:      { cards: [{rank,suit},{rank,suit}] } (optional),
 *   boardCards:    array of 4 {rank,suit} (optional — flopCards + turnCard)
 * }
 * Returns a string.
 */
function _buildTurnReasoning(opts) {
    const hc = opts.heroHandClass || 'AIR';
    const tex = opts.turnTexture || null;
    const flags = tex ? tex.flags : {};
    const pt = tex ? tex.primaryTexture : '';
    const isDefend = opts.nodeType === 'TURN_VS_BET_DECISION';
    const isDelayed = opts.nodeType === 'TURN_DELAYED_CBET_DECISION';

    // --- Base sentence by hand class ---
    let base = '';
    switch (hc) {
        case 'STRAIGHT_FLUSH':
            base = isDefend
                ? 'Straight flush — raise for maximum value.'
                : 'Straight flush — the virtual nuts. Bet for maximum value.';
            break;
        case 'QUADS':
            base = isDefend
                ? 'Quads — raise to build the pot.'
                : 'Quads — near-unbeatable. Bet or slow-play to extract value.';
            break;
        case 'FULL_HOUSE':
            base = isDefend
                ? 'Full house — raise for value.'
                : 'Full house — near-nutted. Bet for value on most turns.';
            break;
        case 'FLUSH':
            base = isDefend
                ? 'Made flush — raise for value, or flat to trap.'
                : 'Flush made — bet for value. Occasionally check back to balance.';
            break;
        case 'STRAIGHT':
            base = isDefend
                ? 'Made straight — raise for value, or flat to keep bluffs in.'
                : 'Straight made — bet for value on most turns.';
            break;
        case 'SET':
            base = isDefend
                ? 'Set is very strong — raise or flat to build the pot.'
                : (isDelayed
                    ? 'Set after check-through — now is the time to build the pot.'
                    : 'Set is extremely strong — value bet consistently.');
            break;
        case 'TRIPS':
            base = isDefend
                ? 'Hero-made trips — strong value hand. Raise or call confidently.'
                : (isDelayed
                    ? 'Hero-made trips after check-through — strong hand. Bet for value now.'
                    : 'Hero-made trips on a paired board — bet for value consistently.');
            break;
        case 'BOARD_TRIPS':
            base = isDefend
                ? 'Trips are on the board — kicker and blockers matter. Mostly call; raise only with premium kickers.'
                : (isDelayed
                    ? 'Board trips after check-through — this is a kicker / showdown-value spot, not a pure value hand.'
                    : 'Trips are on the board — this is a kicker / showdown-value spot. Bet selectively with strong kickers.');
            break;
        case 'TWO_PAIR':
            base = isDefend
                ? 'Two pair — raise for value, call on scary runouts.'
                : (isDelayed
                    ? 'Two pair — bet for value and protection.'
                    : 'Two pair is strong — bet for value and protection.');
            break;
        case 'OVERPAIR':
            base = isDefend
                ? 'Overpair is strong — mostly call.'
                : (isDelayed
                    ? 'Overpair — check-through capped your range. Bet cautiously on safe turns.'
                    : 'Overpair is a solid value hand on safe turns.');
            break;
        case 'TOP_PAIR':
            base = isDefend
                ? 'Top pair is mainly a calling hand here.'
                : (isDelayed
                    ? 'Top pair — delayed bet on safe turns; check on dynamic turns.'
                    : 'Top pair is a core value/protection hand.');
            break;
        case 'SECOND_PAIR':
            base = isDefend
                ? 'Second pair is marginal — call only on safe turns.'
                : 'Second pair has limited value. Checking is usually preferred.';
            break;
        case 'THIRD_PAIR':
            base = isDefend
                ? 'Third pair is weak — mostly fold facing a second barrel.'
                : 'Third pair is weak — mostly check to see the river cheaply.';
            break;
        case 'UNDERPAIR':
            base = isDefend
                ? 'Underpair is too weak for most turn calls.'
                : 'Underpair is marginal — mostly check for pot control.';
            break;
        case 'COMBO_DRAW':
            base = isDefend
                ? 'Combo draw — raise as semi-bluff; you have outs and fold equity.'
                : 'Combo draw has excellent equity — semi-bluff frequently.';
            break;
        case 'STRONG_DRAW':
            base = isDefend
                ? 'Flush draw — call often; raise as semi-bluff occasionally.'
                : 'Flush draw on the turn — semi-bluff on favorable turns.';
            break;
        case 'OESD':
            base = isDefend
                ? 'OESD — call with good pot odds. Raise on very favorable turns.'
                : 'OESD — semi-bluff as balanced barrel.';
            break;
        case 'GUTSHOT':
            base = isDefend
                ? 'Gutshot alone — thin equity; mostly fold unless pot odds are excellent.'
                : 'Gutshot — selective bluffs only, mostly check.';
            break;
        case 'ACE_HIGH':
            base = isDefend
                ? 'Ace-high — fold to most turn bets without a draw.'
                : (isDelayed
                    ? 'Ace-high — delayed bluff only on safe turns where range advantage is clear.'
                    : 'Ace-high with no pair — bluff on safe turns, check on scary ones.');
            break;
        case 'OVERCARDS':
            base = isDefend
                ? 'Overcards only — usually fold on the turn.'
                : 'Overcards only — bluff occasionally on safe turns, mostly check.';
            break;
        case 'AIR':
            base = isDefend
                ? 'No hand — fold. Raise-bluff is occasionally correct on safe boards.'
                : 'No hand — give up unless the turn is very favorable for a bluff.';
            break;
        default:
            base = '';
    }

    // --- Texture-aware follow-up (only append conditions that are actually true) ---
    let addon = '';

    if (flags.completesFlush) {
        if (hc === 'FLUSH') {
            addon = 'Flush-completing turn is ideal — bet/raise for value.';
        } else if (['TOP_PAIR','SECOND_PAIR','OVERPAIR','UNDERPAIR','THIRD_PAIR'].includes(hc)) {
            addon = 'Flush-completing turn reduces value of one-pair hands.';
        } else if (['SET','TWO_PAIR','TRIPS'].includes(hc)) {
            addon = 'Flush-completing turn warrants caution despite strong hand.';
        } else if (['BOARD_TRIPS'].includes(hc)) {
            addon = 'Flush-completing turn makes board-trips kicker hands even more marginal.';
        }
    } else if (flags.completesStraight) {
        if (hc === 'STRAIGHT') {
            addon = 'Straight-completing turn is ideal — bet/raise for value.';
        } else if (['TOP_PAIR','SECOND_PAIR','OVERPAIR'].includes(hc)) {
            addon = 'Straight-completing turn makes one-pair hands thinner.';
        } else if (['BOARD_TRIPS'].includes(hc)) {
            addon = 'Straight-completing turn adds more danger to a board-trips kicker spot.';
        }
    } else if (flags.isAceOvercard) {
        if (['OVERPAIR','TOP_PAIR','SECOND_PAIR','UNDERPAIR','THIRD_PAIR'].includes(hc)) {
            addon = 'Ace overcard dramatically changes range dynamics — slow down.';
        } else if (hc === 'ACE_HIGH') {
            addon = 'Ace turn improves your ace-high (may now be top pair).';
        } else if (hc === 'BOARD_TRIPS') {
            addon = 'Ace overcard on board-trips favors stronger kickers.';
        }
    } else if (flags.isBroadwayOvercard) {
        if (['TOP_PAIR','SECOND_PAIR','OVERPAIR'].includes(hc)) {
            addon = 'Broadway overcard turn weakens medium made hands.';
        } else if (['ACE_HIGH','OVERCARDS','AIR'].includes(hc)) {
            addon = 'Broadway overcard improves PFR range advantage for bluffs.';
        }
    } else if (flags.isOvercard) {
        if (['TOP_PAIR','SECOND_PAIR','OVERPAIR','THIRD_PAIR'].includes(hc)) {
            addon = 'Overcard turn weakens flop-made hands.';
        }
    } else if (flags.isBoardPair) {
        if (['TOP_PAIR','SECOND_PAIR','OVERPAIR'].includes(hc)) {
            addon = 'Board-pair turn reduces thin value and slows bluffs.';
        } else if (['TRIPS','BOARD_TRIPS'].includes(hc)) {
            addon = 'Board-pair turn is favorable for trips-type hands.';
        }
    } else if (flags.isDynamicShift) {
        if (['TOP_PAIR','SECOND_PAIR','OVERPAIR'].includes(hc)) {
            addon = 'Dynamic turn increases board volatility — prefer pot control.';
        }
    } else if (flags.addsFlushDensity && !flags.addsStraightPressure) {
        if (['TOP_PAIR','SECOND_PAIR','OVERPAIR'].includes(hc)) {
            addon = 'Turn adds flush density — slight caution for non-flush holdings.';
        }
    } else if (flags.addsStraightPressure && !flags.addsFlushDensity) {
        if (['TOP_PAIR','SECOND_PAIR'].includes(hc)) {
            addon = 'Turn adds straight draw pressure — connectivity increases.';
        }
    } else if (flags.isLowBlank) {
        if (['OVERPAIR','TOP_PAIR','SET','TRIPS','TWO_PAIR','BOARD_TRIPS'].includes(hc)) {
            addon = 'Low blank favors continued value/protection betting.';
        }
    } else if (flags.isBlank) {
        if (['OVERPAIR','TOP_PAIR','SET','TRIPS','TWO_PAIR','BOARD_TRIPS'].includes(hc)) {
            addon = 'Blank turn favors continued aggression with value and draws.';
        }
    }

    if (addon) return base + ' ' + addon;
    return base;
}

/**
 * classifyTurnHand — classify hero's hand on the turn (4 community cards).
 * heroHand: { cards: [{rank, suit}, {rank, suit}] } or abstract form
 * flopCards: array of 3 { rank, suit }
 * turnCard: { rank, suit }
 * Returns a TURN_HAND_CLASSES key.
 *
 * Architecture:
 *   1. Call evaluateRawHand (Layer 1) to detect made hand accurately.
 *   2. If a made hand is found, map through _rawToTrainerBucket (Layer 2) and return.
 *   3. If no made hand (HIGH_CARD), fall through to existing draw classification.
 *
 * This means board-pair upgrades (trips, full house, etc.) are never swallowed by
 * weaker checks — the raw evaluator handles them correctly regardless of board shape.
 */
function classifyTurnHand(heroHand, flopCards, turnCard) {
    const hr = heroHand.cards || _heroHandToCards(heroHand);
    const boardCards = [...flopCards, turnCard];

    // --- Layer 1: raw made-hand evaluation ---
    const raw = evaluateRawHand(hr, boardCards);

    if (raw.rank >= 2) {
        // Has at least a pair — map to trainer bucket and return.
        return _rawToTrainerBucket(raw, hr, boardCards);
    }

    // --- No made pair: draw classification ---
    // (mirrors original logic; unchanged for backward compatibility)
    const h1 = RANK_NUM[hr[0].rank], h2 = RANK_NUM[hr[1].rank];
    const hHigh = Math.max(h1, h2), hLow = Math.min(h1, h2);
    const hSuited = hr[0].suit === hr[1].suit;
    const hSuit = hSuited ? hr[0].suit : null;
    const bRanks = boardCards.map(c => RANK_NUM[c.rank]).sort((a, b) => b - a);
    const bSuits = boardCards.map(c => c.suit);
    const allRanks = [hHigh, hLow, ...bRanks];
    const uniqueRanks = [...new Set(allRanks)].sort((a, b) => b - a);

    const hasFlushDraw = hSuited && _countSuitOnBoard(hSuit, bSuits) === 2;
    const straightInfo = _straightDrawType(uniqueRanks);
    const hasOESD    = straightInfo === 'OESD';
    const hasGutshot = straightInfo === 'GUTSHOT';

    if (hasFlushDraw && (hasOESD || hasGutshot)) return 'COMBO_DRAW';
    if (hasFlushDraw) return 'STRONG_DRAW';
    if (hasOESD)     return 'OESD';
    if (hasGutshot)  return 'GUTSHOT';

    // No made hand, no draw
    if (hHigh === 14) return 'ACE_HIGH';
    if (hHigh > bRanks[0] && hLow > bRanks[0]) return 'OVERCARDS';
    return 'AIR';
}

// --- Deal a random turn card not conflicting with flop or hero hand ---
function _dealTurnCard(flopCards, heroHand) {
    const blocked = new Set();
    for (const c of flopCards) blocked.add(c.rank + c.suit);
    const hCards = (heroHand && heroHand.cards) ? heroHand.cards : [];
    for (const c of hCards) blocked.add(c.rank + c.suit);
    const deck = [];
    for (const r of RANKS) for (const s of SUITS) { if (!blocked.has(r + s)) deck.push({ rank: r, suit: s }); }
    if (!deck.length) return { rank: '2', suit: 'c' }; // ultra-rare fallback
    return deck[Math.floor(Math.random() * deck.length)];
}

// --- Turn spot key builders ---

/**
 * makeTurnCBetSpotKeyV1 — PFR firing turn after flop c-bet was called.
 * Key: SRP|{family}|TURN|PFR|{positionState}|TURN_CBET_DECISION|{turnFamily}|{heroHandClass}
 */
function makeTurnCBetSpotKeyV1(spot) {
    return `SRP|${spot.preflopFamily}|TURN|PFR|${spot.positionState}|TURN_CBET_DECISION|${spot.turnFamily}|${spot.heroHandClass}`;
}

/**
 * makeTurnDefendSpotKeyV1 — defender (BB) facing a turn bet after calling flop c-bet.
 * Key: SRP|{family}|TURN|DEFENDER|OOP|TURN_VS_BET_DECISION|{turnFamily}|{heroHandClass}
 */
function makeTurnDefendSpotKeyV1(spot) {
    return `SRP|${spot.preflopFamily}|TURN|DEFENDER|OOP|TURN_VS_BET_DECISION|${spot.turnFamily}|${spot.heroHandClass}`;
}

// --- Turn strategy: PFR barrel (bet50 vs check) ---
const POSTFLOP_TURN_STRATEGY = {};

(function() {
    // Base IP frequencies for bet50 (50% pot) on the turn
    // Format: { handClass: { turnFamily: freq } }  _default is fallback
    const BASE_IP = {
        STRAIGHT_FLUSH: { _default: 0.90 },
        QUADS:         { _default: 0.88 },
        FULL_HOUSE:    { _default: 0.88, FLUSH_COMPLETE: 0.82, STRAIGHT_COMPLETE: 0.80 },
        FLUSH:         { _default: 0.85, FLUSH_COMPLETE: 0.80 },
        STRAIGHT:      { _default: 0.78 },
        SET:           { _default: 0.85, FLUSH_COMPLETE: 0.75, STRAIGHT_COMPLETE: 0.70 },
        TRIPS:         { _default: 0.82, FLUSH_COMPLETE: 0.72, STRAIGHT_COMPLETE: 0.68,
                         BOARD_PAIR: 0.80, ACE_OVERCARD: 0.75, BROADWAY_OVERCARD: 0.78 },
        BOARD_TRIPS:   { _default: 0.48, BRICK: 0.52, LOW_BLANK: 0.55, FLUSH_COMPLETE: 0.32,
                         STRAIGHT_COMPLETE: 0.28, ACE_OVERCARD: 0.38, BROADWAY_OVERCARD: 0.42,
                         OVERCARD: 0.40, BOARD_PAIR: 0.45, DYNAMIC_CONNECTOR: 0.40 },
        TWO_PAIR:      { _default: 0.78, FLUSH_COMPLETE: 0.65, STRAIGHT_COMPLETE: 0.62, ACE_OVERCARD: 0.70 },
        OVERPAIR:      { _default: 0.70, ACE_OVERCARD: 0.30, FLUSH_COMPLETE: 0.55, STRAIGHT_COMPLETE: 0.50,
                         BROADWAY_OVERCARD: 0.58, OVERCARD: 0.55, BOARD_PAIR: 0.65, DYNAMIC_CONNECTOR: 0.62 },
        TOP_PAIR:      { _default: 0.58, BRICK: 0.62, LOW_BLANK: 0.65, ACE_OVERCARD: 0.35,
                         FLUSH_COMPLETE: 0.40, STRAIGHT_COMPLETE: 0.38, BROADWAY_OVERCARD: 0.45,
                         OVERCARD: 0.45, BOARD_PAIR: 0.52, DYNAMIC_CONNECTOR: 0.48 },
        SECOND_PAIR:   { _default: 0.28, BRICK: 0.32, LOW_BLANK: 0.35, ACE_OVERCARD: 0.18,
                         FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.15, BROADWAY_OVERCARD: 0.22,
                         OVERCARD: 0.20, BOARD_PAIR: 0.25, DYNAMIC_CONNECTOR: 0.25 },
        THIRD_PAIR:    { _default: 0.18, BRICK: 0.22, LOW_BLANK: 0.25, ACE_OVERCARD: 0.10,
                         FLUSH_COMPLETE: 0.10, STRAIGHT_COMPLETE: 0.08, BOARD_PAIR: 0.18 },
        UNDERPAIR:     { _default: 0.20, BRICK: 0.24, LOW_BLANK: 0.28, ACE_OVERCARD: 0.10,
                         FLUSH_COMPLETE: 0.12, STRAIGHT_COMPLETE: 0.10, BOARD_PAIR: 0.20 },
        COMBO_DRAW:    { _default: 0.75, BRICK: 0.78, FLUSH_COMPLETE: 0.55, STRAIGHT_COMPLETE: 0.55,
                         ACE_OVERCARD: 0.65, BROADWAY_OVERCARD: 0.70, DYNAMIC_CONNECTOR: 0.80 },
        STRONG_DRAW:   { _default: 0.65, BRICK: 0.68, LOW_BLANK: 0.70, FLUSH_COMPLETE: 0.50,
                         STRAIGHT_COMPLETE: 0.50, ACE_OVERCARD: 0.55, BROADWAY_OVERCARD: 0.58,
                         DYNAMIC_CONNECTOR: 0.72, BOARD_PAIR: 0.62 },
        OESD:          { _default: 0.52, BRICK: 0.55, LOW_BLANK: 0.58, FLUSH_COMPLETE: 0.38,
                         STRAIGHT_COMPLETE: 0.35, ACE_OVERCARD: 0.45, BROADWAY_OVERCARD: 0.48 },
        GUTSHOT:       { _default: 0.32, BRICK: 0.35, LOW_BLANK: 0.38, FLUSH_COMPLETE: 0.22,
                         STRAIGHT_COMPLETE: 0.20, ACE_OVERCARD: 0.28, BROADWAY_OVERCARD: 0.30 },
        ACE_HIGH:      { _default: 0.42, BRICK: 0.48, LOW_BLANK: 0.50, ACE_OVERCARD: 0.30,
                         FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.25, BROADWAY_OVERCARD: 0.38,
                         OVERCARD: 0.35, BOARD_PAIR: 0.40, DYNAMIC_CONNECTOR: 0.38 },
        OVERCARDS:     { _default: 0.28, BRICK: 0.32, LOW_BLANK: 0.35, ACE_OVERCARD: 0.18,
                         FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.15, BROADWAY_OVERCARD: 0.22,
                         OVERCARD: 0.20, BOARD_PAIR: 0.25, DYNAMIC_CONNECTOR: 0.25 },
        AIR:           { _default: 0.22, BRICK: 0.26, LOW_BLANK: 0.30, ACE_OVERCARD: 0.12,
                         FLUSH_COMPLETE: 0.12, STRAIGHT_COMPLETE: 0.10, BROADWAY_OVERCARD: 0.18,
                         OVERCARD: 0.15, BOARD_PAIR: 0.20, DYNAMIC_CONNECTOR: 0.18 }
    };

    // OOP PFR: reduce bet frequency ~12-15pp across the board
    const BASE_OOP = {
        STRAIGHT_FLUSH: { _default: 0.80 },
        QUADS:         { _default: 0.78 },
        FULL_HOUSE:    { _default: 0.78, FLUSH_COMPLETE: 0.70, STRAIGHT_COMPLETE: 0.68 },
        FLUSH:         { _default: 0.75, FLUSH_COMPLETE: 0.68 },
        STRAIGHT:      { _default: 0.68 },
        SET:           { _default: 0.75, FLUSH_COMPLETE: 0.62, STRAIGHT_COMPLETE: 0.58 },
        TRIPS:         { _default: 0.70, FLUSH_COMPLETE: 0.58, STRAIGHT_COMPLETE: 0.55,
                         BOARD_PAIR: 0.68, ACE_OVERCARD: 0.62, BROADWAY_OVERCARD: 0.65 },
        BOARD_TRIPS:   { _default: 0.35, BRICK: 0.40, LOW_BLANK: 0.42, FLUSH_COMPLETE: 0.22,
                         STRAIGHT_COMPLETE: 0.18, ACE_OVERCARD: 0.28, BROADWAY_OVERCARD: 0.30,
                         OVERCARD: 0.28, BOARD_PAIR: 0.32 },
        TWO_PAIR:      { _default: 0.66, FLUSH_COMPLETE: 0.52, STRAIGHT_COMPLETE: 0.50 },
        OVERPAIR:      { _default: 0.56, ACE_OVERCARD: 0.22, FLUSH_COMPLETE: 0.42, STRAIGHT_COMPLETE: 0.38,
                         BROADWAY_OVERCARD: 0.44, OVERCARD: 0.42, BOARD_PAIR: 0.50 },
        TOP_PAIR:      { _default: 0.44, BRICK: 0.48, LOW_BLANK: 0.52, ACE_OVERCARD: 0.25,
                         FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.25, BROADWAY_OVERCARD: 0.32,
                         OVERCARD: 0.30, BOARD_PAIR: 0.38, DYNAMIC_CONNECTOR: 0.35 },
        SECOND_PAIR:   { _default: 0.18, BRICK: 0.22, LOW_BLANK: 0.25, ACE_OVERCARD: 0.10,
                         FLUSH_COMPLETE: 0.10, STRAIGHT_COMPLETE: 0.08 },
        THIRD_PAIR:    { _default: 0.10, BRICK: 0.14, ACE_OVERCARD: 0.05, FLUSH_COMPLETE: 0.05 },
        UNDERPAIR:     { _default: 0.12, BRICK: 0.16, ACE_OVERCARD: 0.05, FLUSH_COMPLETE: 0.06 },
        COMBO_DRAW:    { _default: 0.62, BRICK: 0.65, FLUSH_COMPLETE: 0.44, STRAIGHT_COMPLETE: 0.42,
                         ACE_OVERCARD: 0.52, BROADWAY_OVERCARD: 0.56, DYNAMIC_CONNECTOR: 0.68 },
        STRONG_DRAW:   { _default: 0.52, BRICK: 0.55, FLUSH_COMPLETE: 0.38, STRAIGHT_COMPLETE: 0.36,
                         ACE_OVERCARD: 0.42, BROADWAY_OVERCARD: 0.46, DYNAMIC_CONNECTOR: 0.58 },
        OESD:          { _default: 0.40, BRICK: 0.44, FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.24,
                         ACE_OVERCARD: 0.34, BROADWAY_OVERCARD: 0.36 },
        GUTSHOT:       { _default: 0.22, BRICK: 0.26, FLUSH_COMPLETE: 0.14, STRAIGHT_COMPLETE: 0.12,
                         ACE_OVERCARD: 0.18 },
        ACE_HIGH:      { _default: 0.30, BRICK: 0.36, LOW_BLANK: 0.40, ACE_OVERCARD: 0.20,
                         FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.14 },
        OVERCARDS:     { _default: 0.18, BRICK: 0.22, LOW_BLANK: 0.26, ACE_OVERCARD: 0.10,
                         FLUSH_COMPLETE: 0.10, STRAIGHT_COMPLETE: 0.08 },
        AIR:           { _default: 0.14, BRICK: 0.18, LOW_BLANK: 0.22, ACE_OVERCARD: 0.06,
                         FLUSH_COMPLETE: 0.06, STRAIGHT_COMPLETE: 0.04 }
    };

    const TURN_REASONING = {
        STRAIGHT_FLUSH: 'Straight flush — the virtual nuts. Bet for maximum value on every turn.',
        QUADS:        'Quads — near-unbeatable. Bet or slow-play to extract maximum value.',
        FULL_HOUSE:   'Full house — near-nutted. Bet for value; consider sizing up on safe runouts.',
        FLUSH:        'Flush made — bet for value. Occasionally check back to balance.',
        STRAIGHT:     'Straight made — bet for value on most turns.',
        SET:          'Set is extremely strong — value bet consistently. Slow-play on scary boards.',
        TRIPS:        'Hero-made trips on a paired board — bet for value consistently.',
        BOARD_TRIPS:  'Trips are on the board — this is a kicker / showdown-value spot. Bet selectively with strong kickers.',
        TWO_PAIR:     'Two pair is strong — bet for value and protection.',
        OVERPAIR:     'Overpair is a solid value hand on safe turns.',
        TOP_PAIR:     'Top pair is a core value/protection hand.',
        SECOND_PAIR:  'Second pair has limited value. Checking is usually preferred.',
        THIRD_PAIR:   'Third pair is weak — mostly check to see the river cheaply.',
        UNDERPAIR:    'Underpair is marginal — mostly check for pot control.',
        COMBO_DRAW:   'Combo draw has excellent equity — semi-bluff frequently.',
        STRONG_DRAW:  'Flush draw on the turn — semi-bluff on favorable turns.',
        OESD:         'OESD — semi-bluff as balanced barrel.',
        GUTSHOT:      'Gutshot — selective bluffs only, mostly check.',
        ACE_HIGH:     'Ace-high with no pair — bluff on safe turns, check on scary ones.',
        OVERCARDS:    'Overcards only — bluff occasionally on safe turns, mostly check.',
        AIR:          'No hand — give up unless the turn is very favorable for a bluff.'
    };

    // Family offsets (applied to IP base — OOP already uses lower base)
    const FAMILY_OFF = {
        BTN_vs_BB: 0, CO_vs_BB: -0.03, HJ_vs_BB: -0.02, LJ_vs_BB: -0.01,
        UTG_vs_BB: 0.02, BTN_vs_SB: 0.02, SB_vs_BB: 0, CO_vs_BTN: -0.03
    };

    for (const fam of HERO_HAND_AWARE_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        const baseTable = fi.positionState === 'OOP' ? BASE_OOP : BASE_IP;

        for (const tf of TURN_FAMILIES) {
            for (const hc of TURN_HAND_CLASSES) {
                const baseFreqs = baseTable[hc];
                if (!baseFreqs) continue;
                const raw = (baseFreqs[tf] !== undefined) ? baseFreqs[tf] : baseFreqs._default;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet50' : 'check';
                const sk = makeTurnCBetSpotKeyV1({
                    preflopFamily: fam, positionState: fi.positionState,
                    turnFamily: tf, heroHandClass: hc
                });
                POSTFLOP_TURN_STRATEGY[sk] = {
                    actions: { check: chk, bet50: bet },
                    preferredAction: preferred,
                    reasoning: TURN_REASONING[hc] || '',
                    simplification: 'Phase 2: Turn Barrel (50% pot)'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[TurnV1] Built ${Object.keys(POSTFLOP_TURN_STRATEGY).length} PFR turn strategy entries.`);
    }
})();

// --- Turn strategy: defender vs turn bet ---
const POSTFLOP_TURN_DEFEND_STRATEGY = {};

(function() {
    const BASE = {
        STRAIGHT_FLUSH: { _default: { fold: 0.00, call: 0.15, raise: 0.85 } },
        QUADS:        { _default: { fold: 0.00, call: 0.20, raise: 0.80 } },
        FULL_HOUSE:   { _default: { fold: 0.00, call: 0.25, raise: 0.75 },
                        FLUSH_COMPLETE: { fold: 0.00, call: 0.22, raise: 0.78 } },
        FLUSH:        { _default: { fold: 0.00, call: 0.30, raise: 0.70 } },
        STRAIGHT:     { _default: { fold: 0.00, call: 0.35, raise: 0.65 } },
        SET:          { _default: { fold: 0.00, call: 0.38, raise: 0.62 },
                        FLUSH_COMPLETE: { fold: 0.00, call: 0.30, raise: 0.70 } },
        TRIPS:        { _default: { fold: 0.00, call: 0.35, raise: 0.65 },
                        FLUSH_COMPLETE: { fold: 0.00, call: 0.28, raise: 0.72 },
                        STRAIGHT_COMPLETE: { fold: 0.00, call: 0.30, raise: 0.70 } },
        BOARD_TRIPS:  { _default: { fold: 0.10, call: 0.65, raise: 0.25 },
                        BRICK: { fold: 0.08, call: 0.68, raise: 0.24 },
                        FLUSH_COMPLETE: { fold: 0.18, call: 0.60, raise: 0.22 },
                        STRAIGHT_COMPLETE: { fold: 0.20, call: 0.58, raise: 0.22 },
                        ACE_OVERCARD: { fold: 0.15, call: 0.62, raise: 0.23 } },
        TWO_PAIR:     { _default: { fold: 0.00, call: 0.50, raise: 0.50 },
                        FLUSH_COMPLETE: { fold: 0.05, call: 0.55, raise: 0.40 },
                        STRAIGHT_COMPLETE: { fold: 0.05, call: 0.58, raise: 0.37 } },
        OVERPAIR:     { _default: { fold: 0.00, call: 0.72, raise: 0.28 },
                        ACE_OVERCARD: { fold: 0.00, call: 0.80, raise: 0.20 },
                        FLUSH_COMPLETE: { fold: 0.05, call: 0.72, raise: 0.23 },
                        STRAIGHT_COMPLETE: { fold: 0.08, call: 0.72, raise: 0.20 },
                        BROADWAY_OVERCARD: { fold: 0.00, call: 0.76, raise: 0.24 } },
        TOP_PAIR:     { _default: { fold: 0.08, call: 0.78, raise: 0.14 },
                        BRICK: { fold: 0.05, call: 0.82, raise: 0.13 },
                        LOW_BLANK: { fold: 0.04, call: 0.83, raise: 0.13 },
                        ACE_OVERCARD: { fold: 0.18, call: 0.72, raise: 0.10 },
                        FLUSH_COMPLETE: { fold: 0.20, call: 0.68, raise: 0.12 },
                        STRAIGHT_COMPLETE: { fold: 0.22, call: 0.67, raise: 0.11 },
                        BROADWAY_OVERCARD: { fold: 0.15, call: 0.73, raise: 0.12 } },
        SECOND_PAIR:  { _default: { fold: 0.40, call: 0.50, raise: 0.10 },
                        BRICK: { fold: 0.35, call: 0.55, raise: 0.10 },
                        ACE_OVERCARD: { fold: 0.52, call: 0.40, raise: 0.08 },
                        FLUSH_COMPLETE: { fold: 0.55, call: 0.38, raise: 0.07 },
                        STRAIGHT_COMPLETE: { fold: 0.58, call: 0.35, raise: 0.07 } },
        THIRD_PAIR:   { _default: { fold: 0.60, call: 0.33, raise: 0.07 },
                        BRICK: { fold: 0.55, call: 0.38, raise: 0.07 },
                        FLUSH_COMPLETE: { fold: 0.70, call: 0.23, raise: 0.07 } },
        UNDERPAIR:    { _default: { fold: 0.65, call: 0.28, raise: 0.07 },
                        BRICK: { fold: 0.60, call: 0.33, raise: 0.07 } },
        COMBO_DRAW:   { _default: { fold: 0.02, call: 0.50, raise: 0.48 },
                        FLUSH_COMPLETE: { fold: 0.08, call: 0.50, raise: 0.42 },
                        STRAIGHT_COMPLETE: { fold: 0.08, call: 0.48, raise: 0.44 } },
        STRONG_DRAW:  { _default: { fold: 0.08, call: 0.62, raise: 0.30 },
                        FLUSH_COMPLETE: { fold: 0.12, call: 0.60, raise: 0.28 },
                        BRICK: { fold: 0.06, call: 0.65, raise: 0.29 } },
        OESD:         { _default: { fold: 0.18, call: 0.62, raise: 0.20 },
                        STRAIGHT_COMPLETE: { fold: 0.10, call: 0.52, raise: 0.38 }, // improved
                        BRICK: { fold: 0.15, call: 0.65, raise: 0.20 } },
        GUTSHOT:      { _default: { fold: 0.48, call: 0.42, raise: 0.10 },
                        BRICK: { fold: 0.42, call: 0.48, raise: 0.10 } },
        ACE_HIGH:     { _default: { fold: 0.52, call: 0.38, raise: 0.10 },
                        BRICK: { fold: 0.45, call: 0.44, raise: 0.11 } },
        OVERCARDS:    { _default: { fold: 0.65, call: 0.28, raise: 0.07 },
                        BRICK: { fold: 0.58, call: 0.34, raise: 0.08 } },
        AIR:          { _default: { fold: 0.82, call: 0.12, raise: 0.06 },
                        BRICK: { fold: 0.75, call: 0.16, raise: 0.09 } }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush — raise for maximum value.',
        QUADS:        'Quads — raise to build the pot.',
        FULL_HOUSE:   'Full house — raise for value.',
        FLUSH:        'Made flush — raise for value, or flat to trap.',
        STRAIGHT:     'Made straight — raise for value, or flat to keep bluffs in.',
        SET:          'Set is very strong — raise or flat to build the pot.',
        TRIPS:        'Hero-made trips — strong value hand. Raise or call confidently.',
        BOARD_TRIPS:  'Trips are on the board — kicker and blockers matter. Mostly call; raise only with premium kickers.',
        TWO_PAIR:     'Two pair — raise for value, call on scary runouts.',
        OVERPAIR:     'Overpair is strong — mostly call.',
        TOP_PAIR:     'Top pair is mainly a calling hand here.',
        SECOND_PAIR:  'Second pair is marginal — call only on safe turns.',
        THIRD_PAIR:   'Third pair is weak — mostly fold facing a second barrel.',
        UNDERPAIR:    'Underpair is too weak for most turn calls.',
        COMBO_DRAW:   'Combo draw — raise as semi-bluff; you have outs and fold equity.',
        STRONG_DRAW:  'Flush draw — call often; raise as semi-bluff occasionally.',
        OESD:         'OESD — call with good pot odds. Raise on very favorable turns.',
        GUTSHOT:      'Gutshot alone — thin equity; mostly fold unless pot odds are excellent.',
        ACE_HIGH:     'Ace-high — fold to most turn bets without a draw.',
        OVERCARDS:    'Overcards only — usually fold on the turn.',
        AIR:          'No hand — fold. Raise-bluff is occasionally correct on safe boards.'
    };

    // Small family offsets: SB_vs_BB and CO_vs_BB defenders defend slightly wider
    const FAM_OFF = { BTN_vs_BB: 0, CO_vs_BB: 0.02, SB_vs_BB: 0.03 };

    for (const fam of DEFENDER_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const off = FAM_OFF[fam] || 0;

        for (const tf of TURN_FAMILIES) {
            for (const hc of TURN_HAND_CLASSES) {
                const hcData = BASE[hc];
                if (!hcData) continue;
                const raw = hcData[tf] || hcData._default;
                if (!raw) continue;

                let fold  = Math.max(0, raw.fold - off);
                let call  = raw.call + off * 0.5;
                let raise = raw.raise + off * 0.5;
                const total = fold + call + raise;
                fold  = parseFloat((fold  / total).toFixed(2));
                call  = parseFloat((call  / total).toFixed(2));
                raise = parseFloat((1 - fold - call).toFixed(2));
                fold  = Math.max(0, Math.min(1, fold));
                call  = Math.max(0, Math.min(1, call));
                raise = Math.max(0, Math.min(1, raise));

                let preferred;
                if (fold >= call && fold >= raise) preferred = 'fold';
                else if (raise >= call && raise >= fold) preferred = 'raise';
                else preferred = 'call';

                const sk = makeTurnDefendSpotKeyV1({
                    preflopFamily: fam, turnFamily: tf, heroHandClass: hc
                });
                POSTFLOP_TURN_DEFEND_STRATEGY[sk] = {
                    actions: { fold, call, raise },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'Phase 2: Turn Defender vs Bet'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[TurnV1] Built ${Object.keys(POSTFLOP_TURN_DEFEND_STRATEGY).length} defender turn strategy entries.`);
    }
})();

// --- Turn texture enrichment helpers ---

/**
 * _enrichTurnBarrelStrategy — apply texture modifiers to a barrel (bet50/check) strategy.
 * Returns a new strategy object with adjusted frequencies and context-aware reasoning.
 * Does NOT mutate the original pre-computed strategy entry.
 */
function _enrichTurnBarrelStrategy(baseStrategy, heroHandClass, turnTexture, nodeType) {
    if (!baseStrategy || !turnTexture) return baseStrategy;
    const baseBet = baseStrategy.actions.bet50 || 0;
    const adjBet  = _applyTurnTextureModifier(baseBet, heroHandClass, turnTexture);
    const adjChk  = parseFloat((1 - adjBet).toFixed(2));
    const preferred = adjBet >= 0.50 ? 'bet50' : 'check';
    const reasoning = _buildTurnReasoning({
        heroHandClass: heroHandClass,
        turnTexture: turnTexture,
        nodeType: nodeType || 'TURN_CBET_DECISION'
    });
    return {
        actions: { check: adjChk, bet50: adjBet },
        preferredAction: preferred,
        reasoning: reasoning,
        simplification: baseStrategy.simplification,
        _baseActions: baseStrategy.actions // preserve original for debugging
    };
}

/**
 * _enrichTurnDefendStrategy — apply texture modifiers to a defend (fold/call/raise) strategy.
 * Returns a new strategy object with adjusted frequencies and context-aware reasoning.
 */
function _enrichTurnDefendStrategy(baseStrategy, heroHandClass, turnTexture, nodeType) {
    if (!baseStrategy || !turnTexture) return baseStrategy;
    const adj = _applyDefenderTextureModifier(baseStrategy.actions, heroHandClass, turnTexture);
    let preferred;
    if (adj.fold >= adj.call && adj.fold >= adj.raise) preferred = 'fold';
    else if (adj.raise >= adj.call && adj.raise >= adj.fold) preferred = 'raise';
    else preferred = 'call';
    const reasoning = _buildTurnReasoning({
        heroHandClass: heroHandClass,
        turnTexture: turnTexture,
        nodeType: nodeType || 'TURN_VS_BET_DECISION'
    });
    return {
        actions: adj,
        preferredAction: preferred,
        reasoning: reasoning,
        simplification: baseStrategy.simplification,
        _baseActions: baseStrategy.actions
    };
}

// --- Turn spot generators ---

/**
 * generateTurnCBetSpot — generate a PFR turn barrel decision spot.
 * Simulates: SRP flop, PFR c-bets, gets called, now faces turn.
 */
function generateTurnCBetSpot(maxRetries, familyFilter) {
    maxRetries = maxRetries || 25;
    let fams = [...HERO_HAND_AWARE_FAMILIES];
    if (familyFilter && Array.isArray(familyFilter) && familyFilter.length > 0) {
        const filtered = fams.filter(f => familyFilter.includes(f));
        if (filtered.length > 0) fams = filtered;
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const fam = fams[Math.floor(Math.random() * fams.length)];
        const fi  = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;

        const flopArch    = pickFlopArchetype();
        const heroHand    = _dealPostflopHeroHand(fi.heroPos);
        const fc          = _generateFlopNoConflict(flopArch, heroHand);
        const turnCard    = _dealTurnCard(fc, heroHand);
        const turnFamily  = classifyTurnCard(turnCard, fc);
        const turnHandCls = classifyTurnHand(heroHand, fc, turnCard);
        const turnTexture = classifyTurnTexture(fc, turnCard);

        const spot = {
            potType: 'SRP', preflopFamily: fam, street: 'TURN', heroRole: 'PFR',
            positionState: fi.positionState, nodeType: 'TURN_CBET_DECISION',
            flopArchetype: flopArch, boardArchetype: flopArch,
            turnFamily: turnFamily, heroHandClass: turnHandCls,
            flopHandClass: classifyFlopHand(heroHand, fc),
            heroPos: fi.heroPos, villainPos: fi.villainPos,
            flopCards: fc, flopClassification: classifyFlop(fc),
            turnCard: turnCard, heroHand: heroHand,
            turnTexture: turnTexture,
            actionHistory: ['FLOP_CBET', 'FLOP_CALLED'],
            potSize: null, // set below
            effectiveStack: 200
        };
        // Approximate turn pot: SRP flop pot + 33% c-bet amount was called = pot × 1.66
        // We round to nearest live dollar increment for realism
        spot.potSize = null; // ui.js computes display pot from getSRPPot$; stored for metadata
        spot.spotKey = makeTurnCBetSpotKeyV1(spot);
        const baseStrat = POSTFLOP_TURN_STRATEGY[spot.spotKey] || null;
        spot.strategy = _enrichTurnBarrelStrategy(baseStrat, turnHandCls, turnTexture, 'TURN_CBET_DECISION') || baseStrat;

        if (spot.strategy && spot.heroHand && spot.heroHandClass) return spot;
    }

    // Last-resort fallback
    console.warn('[TurnCBet] Retries exhausted; forcing BTN_vs_BB fallback.');
    const fi   = POSTFLOP_PREFLOP_FAMILIES['BTN_vs_BB'];
    const heroHand = _dealPostflopHeroHand('BTN');
    const fc   = _generateFlopNoConflict('A_HIGH_DRY', heroHand);
    const turnCard   = _dealTurnCard(fc, heroHand);
    const turnFamily = classifyTurnCard(turnCard, fc);
    const turnTextureFB = classifyTurnTexture(fc, turnCard);
    const turnHandClsFB = classifyTurnHand(heroHand, fc, turnCard);
    const spot = {
        potType: 'SRP', preflopFamily: 'BTN_vs_BB', street: 'TURN', heroRole: 'PFR',
        positionState: 'IP', nodeType: 'TURN_CBET_DECISION',
        flopArchetype: 'A_HIGH_DRY', boardArchetype: 'A_HIGH_DRY',
        turnFamily: turnFamily, heroHandClass: turnHandClsFB,
        flopHandClass: classifyFlopHand(heroHand, fc),
        heroPos: 'BTN', villainPos: 'BB',
        flopCards: fc, flopClassification: classifyFlop(fc),
        turnCard: turnCard, heroHand: heroHand,
        turnTexture: turnTextureFB,
        actionHistory: ['FLOP_CBET', 'FLOP_CALLED'], potSize: null, effectiveStack: 200
    };
    spot.spotKey = makeTurnCBetSpotKeyV1(spot);
    const baseStratFB = POSTFLOP_TURN_STRATEGY[spot.spotKey] || null;
    spot.strategy = _enrichTurnBarrelStrategy(baseStratFB, turnHandClsFB, turnTextureFB, 'TURN_CBET_DECISION') || baseStratFB;
    return spot;
}

/**
 * generateTurnDefendSpot — generate a defender (BB) turn decision spot.
 * Simulates: SRP flop, PFR c-bets, BB calls, PFR fires turn — BB must decide.
 */
function generateTurnDefendSpot(maxRetries, familyFilter) {
    maxRetries = maxRetries || 25;
    let fams = [...DEFENDER_FAMILIES];
    if (familyFilter && Array.isArray(familyFilter) && familyFilter.length > 0) {
        const filtered = fams.filter(f => familyFilter.includes(f));
        if (filtered.length > 0) fams = filtered;
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const fam = fams[Math.floor(Math.random() * fams.length)];
        const fi  = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;

        const villainPos  = fi.heroPos; // fi.heroPos is the PFR (villain for defender)
        const heroHand    = _dealDefenderHeroHand(villainPos);
        if (!heroHand) continue;
        const flopArch    = pickFlopArchetype();
        const fc          = _generateFlopNoConflict(flopArch, heroHand);
        const turnCard    = _dealTurnCard(fc, heroHand);
        const turnFamily  = classifyTurnCard(turnCard, fc);
        const turnHandCls = classifyTurnHand(heroHand, fc, turnCard);
        const turnTexture = classifyTurnTexture(fc, turnCard);

        const spot = {
            potType: 'SRP', preflopFamily: fam, street: 'TURN', heroRole: 'DEFENDER',
            positionState: 'OOP', nodeType: 'TURN_VS_BET_DECISION',
            flopArchetype: flopArch, boardArchetype: flopArch,
            turnFamily: turnFamily, heroHandClass: turnHandCls,
            flopHandClass: classifyFlopHand(heroHand, fc),
            heroPos: 'BB', villainPos: villainPos,
            flopCards: fc, flopClassification: classifyFlop(fc),
            turnCard: turnCard, heroHand: heroHand,
            turnTexture: turnTexture,
            actionHistory: ['FLOP_CBET_FACED', 'FLOP_CALLED'],
            potSize: null, effectiveStack: 200
        };
        spot.spotKey = makeTurnDefendSpotKeyV1(spot);
        const baseStrat = POSTFLOP_TURN_DEFEND_STRATEGY[spot.spotKey] || null;
        spot.strategy = _enrichTurnDefendStrategy(baseStrat, turnHandCls, turnTexture, 'TURN_VS_BET_DECISION') || baseStrat;

        if (spot.strategy && spot.heroHand && spot.heroHandClass) return spot;
    }

    // Fallback
    console.warn('[TurnDefend] Retries exhausted; forcing BTN_vs_BB fallback.');
    const heroHand = _dealDefenderHeroHand('BTN') || _concreteHand('AK', true);
    const fc   = _generateFlopNoConflict('A_HIGH_DRY', heroHand);
    const turnCard   = _dealTurnCard(fc, heroHand);
    const turnFamily = classifyTurnCard(turnCard, fc);
    const turnTextureFB = classifyTurnTexture(fc, turnCard);
    const turnHandClsFB = classifyTurnHand(heroHand, fc, turnCard);
    const spot = {
        potType: 'SRP', preflopFamily: 'BTN_vs_BB', street: 'TURN', heroRole: 'DEFENDER',
        positionState: 'OOP', nodeType: 'TURN_VS_BET_DECISION',
        flopArchetype: 'A_HIGH_DRY', boardArchetype: 'A_HIGH_DRY',
        turnFamily: turnFamily, heroHandClass: turnHandClsFB,
        flopHandClass: classifyFlopHand(heroHand, fc),
        heroPos: 'BB', villainPos: 'BTN',
        flopCards: fc, flopClassification: classifyFlop(fc),
        turnCard: turnCard, heroHand: heroHand,
        turnTexture: turnTextureFB,
        actionHistory: ['FLOP_CBET_FACED', 'FLOP_CALLED'], potSize: null, effectiveStack: 200
    };
    spot.spotKey = makeTurnDefendSpotKeyV1(spot);
    const baseStratFB = POSTFLOP_TURN_DEFEND_STRATEGY[spot.spotKey] || null;
    spot.strategy = _enrichTurnDefendStrategy(baseStratFB, turnHandClsFB, turnTextureFB, 'TURN_VS_BET_DECISION') || baseStratFB;
    return spot;
}

// --- Turn action scoring ---

/**
 * scoreTurnAction — score PFR's turn bet/check decision.
 * playerAction: 'BARREL' or 'CHECK'
 */
function scoreTurnAction(playerAction, strategy, spot) {
    if (!strategy) return { correct: false, grade: 'unknown', feedback: 'No strategy data.' };
    const preferred   = strategy.preferredAction; // 'bet50' or 'check'
    const playerKey   = playerAction === 'BARREL' ? 'bet50' : 'check';
    const playerFreq  = strategy.actions[playerKey] || 0;
    const isCorrect   = playerKey === preferred;

    let grade;
    if (playerFreq >= 0.75) grade = 'strong';
    else if (playerFreq >= 0.50) grade = 'marginal';
    else if (playerFreq >= 0.35) grade = 'marginal_wrong';
    else grade = 'clear_wrong';

    const preferredLabel  = preferred === 'check' ? 'Check' : 'Barrel (50%)';
    const freqPct         = Math.round((strategy.actions[preferred] || 0) * 100);
    // Use rich texture label when available, fall back to turnFamily label
    const textureLabel    = (spot && spot.turnTexture) ? (TURN_TEXTURE_LABELS[spot.turnTexture.primaryTexture] || '') : '';
    const turnFamilyLabel = textureLabel || ((spot && spot.turnFamily) ? (TURN_FAMILY_LABELS[spot.turnFamily] || spot.turnFamily) : '');
    const handClassLabel  = (spot && spot.heroHandClass) ? (TURN_HAND_CLASS_LABELS[spot.heroHandClass] || spot.heroHandClass) : '';

    let feedback;
    if (isCorrect && grade === 'strong') feedback = `Correct. ${preferredLabel} (${freqPct}%).`;
    else if (isCorrect && grade === 'marginal') feedback = `Correct. Close spot — ${preferredLabel} slightly preferred (${freqPct}%).`;
    else if (!isCorrect && grade === 'marginal_wrong') feedback = `Close, but ${preferredLabel} is preferred here (${freqPct}%).`;
    else feedback = `${preferredLabel} is preferred (${freqPct}%). ${strategy.reasoning}`;

    if (handClassLabel) feedback += ` [${handClassLabel}]`;
    if (turnFamilyLabel && !isCorrect) feedback += ` · Turn: ${turnFamilyLabel}`;

    return { correct: isCorrect, grade, feedback, preferredLabel, freqPct, reasoning: strategy.reasoning };
}

/**
 * scoreTurnDefenderAction — score defender's turn fold/call/raise decision.
 * playerAction: 'fold', 'call', or 'raise'
 */
function scoreTurnDefenderAction(playerAction, strategy, spot) {
    if (!strategy) return { correct: false, grade: 'unknown', feedback: 'No strategy data.' };
    const actions     = strategy.actions;
    const preferred   = strategy.preferredAction;
    const playerKey   = playerAction.toLowerCase();
    const playerFreq  = actions[playerKey] || 0;
    const isCorrect   = playerKey === preferred;

    let grade;
    if (playerFreq >= 0.50) grade = 'strong';
    else if (playerFreq >= 0.30) grade = 'marginal';
    else if (playerFreq >= 0.15) grade = 'marginal_wrong';
    else grade = 'clear_wrong';

    const preferredLabel = preferred.charAt(0).toUpperCase() + preferred.slice(1);
    const freqPct        = Math.round((actions[preferred] || 0) * 100);
    const handClassLabel = (spot && spot.heroHandClass) ? (TURN_HAND_CLASS_LABELS[spot.heroHandClass] || spot.heroHandClass) : '';
    const textureLabel    = (spot && spot.turnTexture) ? (TURN_TEXTURE_LABELS[spot.turnTexture.primaryTexture] || '') : '';
    const turnFamilyLabel = textureLabel || ((spot && spot.turnFamily) ? (TURN_FAMILY_LABELS[spot.turnFamily] || spot.turnFamily) : '');

    let feedback;
    if (isCorrect && grade === 'strong') feedback = `Correct. ${preferredLabel} (${freqPct}%).`;
    else if (isCorrect && grade === 'marginal') feedback = `Correct. Close spot — ${preferredLabel} slightly preferred (${freqPct}%).`;
    else if (!isCorrect && grade === 'marginal_wrong') feedback = `Close, but ${preferredLabel} is preferred here (${freqPct}%).`;
    else feedback = `${preferredLabel} is preferred (${freqPct}%). ${strategy.reasoning}`;

    if (handClassLabel) feedback += ` [${handClassLabel}]`;
    if (turnFamilyLabel && !isCorrect) feedback += ` · Turn: ${turnFamilyLabel}`;

    return { correct: isCorrect, grade, feedback, preferredLabel, freqPct, reasoning: strategy.reasoning };
}

// ============================================================
// SRP POSTFLOP PHASE 2 — TURN DELAYED C-BET
// ============================================================
// Line: preflop SRP → flop checked through → hero (PFR) acts on turn.
// Hero actions: BET (50%) vs CHECK.
// Reuses all existing turn classifiers, families, and hand classes.

/**
 * makeDelayedTurnSpotKeyV1
 * SRP|{family}|TURN|PFR|{positionState}|TURN_DELAYED_CBET_DECISION|{turnFamily}|{heroHandClass}
 */
function makeDelayedTurnSpotKeyV1(spot) {
    return `SRP|${spot.preflopFamily}|TURN|PFR|${spot.positionState}|TURN_DELAYED_CBET_DECISION|${spot.turnFamily}|${spot.heroHandClass}`;
}

// --- Delayed c-bet turn strategy ---
// After a flop check-through the PFR's range is capped (no flopped nuts).
// Key differences from the regular barrel line:
//   - Strong made hands bet more freely (they were slowplayed on the flop).
//   - Overpairs / top-pair: check more often (range is capped and villain is uncapped).
//   - Draws: semi-bluff at similar rates — they benefit from fold equity now too.
//   - Air / weak hands: check often on dynamic turns, occasional bluff on blank turns only.
const POSTFLOP_TURN_DELAYED_STRATEGY = {};

(function() {
    // IP base bet50 frequencies (bet half pot as delayed c-bet)
    const BASE_IP = {
        STRAIGHT_FLUSH: { _default: 0.92 },
        QUADS:         { _default: 0.90 },
        FULL_HOUSE:    { _default: 0.92, FLUSH_COMPLETE: 0.86, STRAIGHT_COMPLETE: 0.84 },
        FLUSH:         { _default: 0.90, FLUSH_COMPLETE: 0.85 },
        STRAIGHT:      { _default: 0.85 },
        SET:           { _default: 0.90, FLUSH_COMPLETE: 0.80, STRAIGHT_COMPLETE: 0.78 },
        TRIPS:         { _default: 0.86, FLUSH_COMPLETE: 0.76, STRAIGHT_COMPLETE: 0.74,
                         BOARD_PAIR: 0.84, ACE_OVERCARD: 0.78, BROADWAY_OVERCARD: 0.80 },
        BOARD_TRIPS:   { _default: 0.52, BRICK: 0.56, LOW_BLANK: 0.58, FLUSH_COMPLETE: 0.35,
                         STRAIGHT_COMPLETE: 0.32, ACE_OVERCARD: 0.42, BROADWAY_OVERCARD: 0.46,
                         OVERCARD: 0.44, BOARD_PAIR: 0.48, DYNAMIC_CONNECTOR: 0.44 },
        TWO_PAIR:      { _default: 0.80, FLUSH_COMPLETE: 0.65, STRAIGHT_COMPLETE: 0.62, ACE_OVERCARD: 0.72 },
        OVERPAIR:      { _default: 0.50, ACE_OVERCARD: 0.20, FLUSH_COMPLETE: 0.38, STRAIGHT_COMPLETE: 0.35,
                         BROADWAY_OVERCARD: 0.40, OVERCARD: 0.38, BOARD_PAIR: 0.48, DYNAMIC_CONNECTOR: 0.44 },
        TOP_PAIR:      { _default: 0.42, BRICK: 0.48, LOW_BLANK: 0.52, ACE_OVERCARD: 0.25,
                         FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.25, BROADWAY_OVERCARD: 0.32,
                         OVERCARD: 0.30, BOARD_PAIR: 0.38, DYNAMIC_CONNECTOR: 0.36 },
        SECOND_PAIR:   { _default: 0.22, BRICK: 0.28, LOW_BLANK: 0.30, ACE_OVERCARD: 0.12,
                         FLUSH_COMPLETE: 0.12, STRAIGHT_COMPLETE: 0.10, BROADWAY_OVERCARD: 0.16,
                         OVERCARD: 0.14, BOARD_PAIR: 0.20, DYNAMIC_CONNECTOR: 0.20 },
        THIRD_PAIR:    { _default: 0.12, BRICK: 0.16, LOW_BLANK: 0.18, ACE_OVERCARD: 0.06,
                         FLUSH_COMPLETE: 0.06, STRAIGHT_COMPLETE: 0.05 },
        UNDERPAIR:     { _default: 0.14, BRICK: 0.18, LOW_BLANK: 0.20, ACE_OVERCARD: 0.06,
                         FLUSH_COMPLETE: 0.07, STRAIGHT_COMPLETE: 0.05 },
        COMBO_DRAW:    { _default: 0.72, BRICK: 0.76, FLUSH_COMPLETE: 0.52, STRAIGHT_COMPLETE: 0.52,
                         ACE_OVERCARD: 0.62, BROADWAY_OVERCARD: 0.68, DYNAMIC_CONNECTOR: 0.78 },
        STRONG_DRAW:   { _default: 0.60, BRICK: 0.65, LOW_BLANK: 0.68, FLUSH_COMPLETE: 0.45,
                         STRAIGHT_COMPLETE: 0.45, ACE_OVERCARD: 0.50, BROADWAY_OVERCARD: 0.55,
                         DYNAMIC_CONNECTOR: 0.70, BOARD_PAIR: 0.58 },
        OESD:          { _default: 0.48, BRICK: 0.52, LOW_BLANK: 0.55, FLUSH_COMPLETE: 0.32,
                         STRAIGHT_COMPLETE: 0.30, ACE_OVERCARD: 0.40, BROADWAY_OVERCARD: 0.44 },
        GUTSHOT:       { _default: 0.26, BRICK: 0.30, LOW_BLANK: 0.34, FLUSH_COMPLETE: 0.15,
                         STRAIGHT_COMPLETE: 0.13, ACE_OVERCARD: 0.20, BROADWAY_OVERCARD: 0.22 },
        ACE_HIGH:      { _default: 0.36, BRICK: 0.44, LOW_BLANK: 0.48, ACE_OVERCARD: 0.22,
                         FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.15, BROADWAY_OVERCARD: 0.30,
                         OVERCARD: 0.28, BOARD_PAIR: 0.32, DYNAMIC_CONNECTOR: 0.30 },
        OVERCARDS:     { _default: 0.22, BRICK: 0.28, LOW_BLANK: 0.32, ACE_OVERCARD: 0.12,
                         FLUSH_COMPLETE: 0.12, STRAIGHT_COMPLETE: 0.10, BROADWAY_OVERCARD: 0.16,
                         OVERCARD: 0.14, BOARD_PAIR: 0.18, DYNAMIC_CONNECTOR: 0.18 },
        AIR:           { _default: 0.16, BRICK: 0.20, LOW_BLANK: 0.24, ACE_OVERCARD: 0.08,
                         FLUSH_COMPLETE: 0.08, STRAIGHT_COMPLETE: 0.06, BROADWAY_OVERCARD: 0.12,
                         OVERCARD: 0.10, BOARD_PAIR: 0.14, DYNAMIC_CONNECTOR: 0.13 }
    };

    // OOP PFR: check-through line hurts OOP PFR more; reduce frequencies ~12-15pp
    const BASE_OOP = {
        STRAIGHT_FLUSH: { _default: 0.82 },
        QUADS:         { _default: 0.80 },
        FULL_HOUSE:    { _default: 0.82, FLUSH_COMPLETE: 0.74, STRAIGHT_COMPLETE: 0.72 },
        FLUSH:         { _default: 0.82, FLUSH_COMPLETE: 0.75 },
        STRAIGHT:      { _default: 0.75 },
        SET:           { _default: 0.80, FLUSH_COMPLETE: 0.68, STRAIGHT_COMPLETE: 0.65 },
        TRIPS:         { _default: 0.76, FLUSH_COMPLETE: 0.63, STRAIGHT_COMPLETE: 0.60,
                         BOARD_PAIR: 0.74, ACE_OVERCARD: 0.66, BROADWAY_OVERCARD: 0.68 },
        BOARD_TRIPS:   { _default: 0.38, BRICK: 0.42, LOW_BLANK: 0.44, FLUSH_COMPLETE: 0.24,
                         STRAIGHT_COMPLETE: 0.20, ACE_OVERCARD: 0.30, BROADWAY_OVERCARD: 0.32,
                         OVERCARD: 0.30, BOARD_PAIR: 0.36 },
        TWO_PAIR:      { _default: 0.68, FLUSH_COMPLETE: 0.52, STRAIGHT_COMPLETE: 0.50, ACE_OVERCARD: 0.58 },
        OVERPAIR:      { _default: 0.36, ACE_OVERCARD: 0.14, FLUSH_COMPLETE: 0.26, STRAIGHT_COMPLETE: 0.24,
                         BROADWAY_OVERCARD: 0.28, OVERCARD: 0.26, BOARD_PAIR: 0.34, DYNAMIC_CONNECTOR: 0.30 },
        TOP_PAIR:      { _default: 0.30, BRICK: 0.36, LOW_BLANK: 0.40, ACE_OVERCARD: 0.16,
                         FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.16, BROADWAY_OVERCARD: 0.22,
                         OVERCARD: 0.20, BOARD_PAIR: 0.26, DYNAMIC_CONNECTOR: 0.24 },
        SECOND_PAIR:   { _default: 0.13, BRICK: 0.18, LOW_BLANK: 0.20, ACE_OVERCARD: 0.07,
                         FLUSH_COMPLETE: 0.07, STRAIGHT_COMPLETE: 0.05 },
        THIRD_PAIR:    { _default: 0.07, BRICK: 0.10, ACE_OVERCARD: 0.03 },
        UNDERPAIR:     { _default: 0.08, BRICK: 0.11, ACE_OVERCARD: 0.03 },
        COMBO_DRAW:    { _default: 0.58, BRICK: 0.62, FLUSH_COMPLETE: 0.40, STRAIGHT_COMPLETE: 0.40,
                         ACE_OVERCARD: 0.48, BROADWAY_OVERCARD: 0.54, DYNAMIC_CONNECTOR: 0.65 },
        STRONG_DRAW:   { _default: 0.47, BRICK: 0.52, FLUSH_COMPLETE: 0.32, STRAIGHT_COMPLETE: 0.30,
                         ACE_OVERCARD: 0.38, BROADWAY_OVERCARD: 0.42, DYNAMIC_CONNECTOR: 0.56 },
        OESD:          { _default: 0.36, BRICK: 0.40, FLUSH_COMPLETE: 0.22, STRAIGHT_COMPLETE: 0.20,
                         ACE_OVERCARD: 0.28, BROADWAY_OVERCARD: 0.32 },
        GUTSHOT:       { _default: 0.16, BRICK: 0.20, FLUSH_COMPLETE: 0.09, STRAIGHT_COMPLETE: 0.07,
                         ACE_OVERCARD: 0.12 },
        ACE_HIGH:      { _default: 0.24, BRICK: 0.32, LOW_BLANK: 0.36, ACE_OVERCARD: 0.14,
                         FLUSH_COMPLETE: 0.10, STRAIGHT_COMPLETE: 0.08 },
        OVERCARDS:     { _default: 0.13, BRICK: 0.18, LOW_BLANK: 0.22, ACE_OVERCARD: 0.07,
                         FLUSH_COMPLETE: 0.07, STRAIGHT_COMPLETE: 0.05 },
        AIR:           { _default: 0.09, BRICK: 0.13, LOW_BLANK: 0.16, ACE_OVERCARD: 0.04,
                         FLUSH_COMPLETE: 0.04, STRAIGHT_COMPLETE: 0.03 }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush after check-through — bet for maximum value. Board disguises hand strength.',
        QUADS:        'Quads after check-through — slow-play complete. Time to bet for value.',
        FULL_HOUSE:   'Full house after check-through — max value time. Board pair disguises your strength.',
        FLUSH:        'Made flush on flop check-through — bet for full value now.',
        STRAIGHT:     'Made straight — delayed value bet is very strong here.',
        SET:          'Set after check-through — now is the time to build the pot.',
        TRIPS:        'Hero-made trips after check-through — strong hand. Bet for value now.',
        BOARD_TRIPS:  'Board trips after check-through — this is a kicker / showdown-value spot, not a pure value hand.',
        TWO_PAIR:     'Two pair — bet for value and protection. Flop slow-play complete.',
        OVERPAIR:     'Overpair — check-through capped your range. Bet cautiously on safe turns.',
        TOP_PAIR:     'Top pair — delayed bet on safe turns; check on dynamic turns.',
        SECOND_PAIR:  'Second pair — mostly check. Villain\'s range is uncapped after checking back.',
        THIRD_PAIR:   'Third pair — check almost always. Too little value and too little fold equity.',
        UNDERPAIR:    'Underpair — check. No value and a scary board for a delayed bluff.',
        COMBO_DRAW:   'Combo draw — semi-bluff. Excellent equity + fold equity against uncapped range.',
        STRONG_DRAW:  'Flush draw — semi-bluff on safe turns. Check on completed flush boards.',
        OESD:         'OESD — semi-bluff on safe turns. Check on straight-completing turns.',
        GUTSHOT:      'Gutshot — mostly check. Delayed bluff with gutshot is very thin.',
        ACE_HIGH:     'Ace-high — delayed bluff only on safe turns where range advantage is clear.',
        OVERCARDS:    'Overcards — check mostly. Delayed bluff selectively on pure brick turns.',
        AIR:          'Air — check-through exposes your range. Give up unless turn is very favorable.'
    };

    // Per-family small offsets identical to regular turn strategy
    const FAMILY_OFF = {
        BTN_vs_BB: 0, CO_vs_BB: -0.03, HJ_vs_BB: -0.02, LJ_vs_BB: -0.01,
        UTG_vs_BB: 0.02, BTN_vs_SB: 0.02, SB_vs_BB: 0, CO_vs_BTN: -0.03
    };

    for (const fam of HERO_HAND_AWARE_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        const baseTable = fi.positionState === 'OOP' ? BASE_OOP : BASE_IP;

        for (const tf of TURN_FAMILIES) {
            for (const hc of TURN_HAND_CLASSES) {
                const baseFreqs = baseTable[hc];
                if (!baseFreqs) continue;
                const raw = (baseFreqs[tf] !== undefined) ? baseFreqs[tf] : baseFreqs._default;
                if (raw === undefined) continue;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet50' : 'check';
                const sk = makeDelayedTurnSpotKeyV1({
                    preflopFamily: fam, positionState: fi.positionState,
                    turnFamily: tf, heroHandClass: hc
                });
                POSTFLOP_TURN_DELAYED_STRATEGY[sk] = {
                    actions: { check: chk, bet50: bet },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'Phase 2: Turn Delayed C-Bet (50% pot)'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[TurnDelayed] Built ${Object.keys(POSTFLOP_TURN_DELAYED_STRATEGY).length} delayed turn strategy entries.`);
    }
})();

/**
 * generateDelayedTurnSpot — PFR turn decision after flop checked through.
 * actionHistory: ['FLOP_CHECK', 'FLOP_CHECK_BACK']
 */
function generateDelayedTurnSpot(maxRetries, familyFilter) {
    maxRetries = maxRetries || 25;
    let fams = [...HERO_HAND_AWARE_FAMILIES];
    if (familyFilter && Array.isArray(familyFilter) && familyFilter.length > 0) {
        const filtered = fams.filter(f => familyFilter.includes(f));
        if (filtered.length > 0) fams = filtered;
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const fam = fams[Math.floor(Math.random() * fams.length)];
        const fi  = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;

        const flopArch    = pickFlopArchetype();
        const heroHand    = _dealPostflopHeroHand(fi.heroPos);
        const fc          = _generateFlopNoConflict(flopArch, heroHand);
        const turnCard    = _dealTurnCard(fc, heroHand);
        const turnFamily  = classifyTurnCard(turnCard, fc);
        const turnHandCls = classifyTurnHand(heroHand, fc, turnCard);
        const turnTexture = classifyTurnTexture(fc, turnCard);

        const spot = {
            potType: 'SRP', preflopFamily: fam, street: 'TURN', heroRole: 'PFR',
            positionState: fi.positionState, nodeType: 'TURN_DELAYED_CBET_DECISION',
            flopArchetype: flopArch, boardArchetype: flopArch,
            turnFamily: turnFamily, heroHandClass: turnHandCls,
            flopHandClass: classifyFlopHand(heroHand, fc),
            heroPos: fi.heroPos, villainPos: fi.villainPos,
            flopCards: fc, flopClassification: classifyFlop(fc),
            turnCard: turnCard, heroHand: heroHand,
            turnTexture: turnTexture,
            actionHistory: ['FLOP_CHECK', 'FLOP_CHECK_BACK'],
            potSize: null, effectiveStack: 200
        };
        spot.spotKey = makeDelayedTurnSpotKeyV1(spot);
        const baseStrat = POSTFLOP_TURN_DELAYED_STRATEGY[spot.spotKey] || null;
        spot.strategy = _enrichTurnBarrelStrategy(baseStrat, turnHandCls, turnTexture, 'TURN_DELAYED_CBET_DECISION') || baseStrat;

        if (spot.strategy && spot.heroHand && spot.heroHandClass) return spot;
    }

    // Fallback
    console.warn('[TurnDelayed] Retries exhausted; forcing BTN_vs_BB fallback.');
    const fi   = POSTFLOP_PREFLOP_FAMILIES['BTN_vs_BB'];
    const heroHand = _dealPostflopHeroHand('BTN');
    const fc   = _generateFlopNoConflict('A_HIGH_DRY', heroHand);
    const turnCard   = _dealTurnCard(fc, heroHand);
    const turnFamily = classifyTurnCard(turnCard, fc);
    const turnTextureFB = classifyTurnTexture(fc, turnCard);
    const turnHandClsFB = classifyTurnHand(heroHand, fc, turnCard);
    const spot = {
        potType: 'SRP', preflopFamily: 'BTN_vs_BB', street: 'TURN', heroRole: 'PFR',
        positionState: 'IP', nodeType: 'TURN_DELAYED_CBET_DECISION',
        flopArchetype: 'A_HIGH_DRY', boardArchetype: 'A_HIGH_DRY',
        turnFamily: turnFamily, heroHandClass: turnHandClsFB,
        flopHandClass: classifyFlopHand(heroHand, fc),
        heroPos: 'BTN', villainPos: 'BB',
        flopCards: fc, flopClassification: classifyFlop(fc),
        turnCard: turnCard, heroHand: heroHand,
        turnTexture: turnTextureFB,
        actionHistory: ['FLOP_CHECK', 'FLOP_CHECK_BACK'], potSize: null, effectiveStack: 200
    };
    spot.spotKey = makeDelayedTurnSpotKeyV1(spot);
    const baseStratFB = POSTFLOP_TURN_DELAYED_STRATEGY[spot.spotKey] || null;
    spot.strategy = _enrichTurnBarrelStrategy(baseStratFB, turnHandClsFB, turnTextureFB, 'TURN_DELAYED_CBET_DECISION') || baseStratFB;
    return spot;
}

/**
 * scoreDelayedTurnAction — score PFR's delayed c-bet decision (BET vs CHECK).
 * Delegates to scoreTurnAction since the action mapping is identical.
 */
function scoreDelayedTurnAction(playerAction, strategy, spot) {
    return scoreTurnAction(playerAction, strategy, spot);
}
