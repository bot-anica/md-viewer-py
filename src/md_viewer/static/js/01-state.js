let FILES = [];
let fileContents = {};
let activeFileIdx = null;

// ---- Tab state ----
let openTabs = []; // [{idx, scrollPos}]

// ---- Editor state ----
let isEditMode = false;
let easyMDE = null;
let originalContent = '';

// ---- Navigation history ----
let _navHistory = [];    // stack of file indices visited
let _navHistoryPos = -1; // current position in history

// ---- In-file search state ----
let _infileMatches = [];
let _infileActiveIdx = -1;
let _infileSearchOpen = false;

