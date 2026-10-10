/* =========================================================
   CINEVAULT — CONFIG
   All configuration, API keys, storage keys, and constants
========================================================= */

/* =========================================================
   🔑 API KEYS
   ---------------------------------------------------------
   यहाँ अपनी keys paste करें।
========================================================= */

// TMDB API Key (v3)
// Get free: https://www.themoviedb.org/settings/api
const TMDB_KEY = "bcd1f010c0ef58b759dae2f30cfb7314";

// Firebase Configuration
// Get from: Firebase Console → Project Settings → Your apps → Config
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBXbtBNAie8rAWEOYqJ6Ff5--F_2pZhXG4",
  authDomain: "cinevault-bd449.firebaseapp.com",
  projectId: "cinevault-bd449",
  storageBucket: "cinevault-bd449.firebasestorage.app",
  messagingSenderId: "974050580946",
  appId: "1:974050580946:web:62c6a55ea7f077618cd00b"
};

/* =========================================================
   📦 STORAGE KEYS
========================================================= */
const STORAGE_KEYS = {
  VAULT: "cv_vault_v4",
  COLLECTIONS: "cv_collections_v4",
  ACHIEVEMENTS: "cv_achievements_v4",
  THEME: "cv_theme_v4",
  MODE: "cv_mode_v4",
  THEME_FULL: "cv_theme_full_v4",
  WATCH_HISTORY: "cv_watch_history_v4",
  GOAL: "cv_goal_v4",
  ONBOARDED: "cv_onboarded_v4"
};

/* =========================================================
   🎬 MOVIE STATUS OPTIONS
========================================================= */
const STATUS_OPTIONS = {
  want:     { label: "🎯 Want",     icon: "🎯", color: "#ffb800" },
  watching: { label: "▶️ Watching", icon: "▶️", color: "#22c55e" },
  watched:  { label: "✅ Watched",  icon: "✅", color: "#3b82f6" },
  dropped:  { label: "⏸️ Dropped",  icon: "⏸️", color: "#ef4444" }
};

/* =========================================================
   🏆 ACHIEVEMENTS DEFINITION
========================================================= */
const ACHIEVEMENTS_LIST = [
  {
    id: "first_movie",
    name: "First Steps",
    icon: "🎬",
    desc: "Add your first movie",
    check: (vault) => vault.length >= 1
  },
  {
    id: "first_watch",
    name: "Lights, Camera, Action",
    icon: "🎥",
    desc: "Mark your first movie as watched",
    check: (vault) => vault.filter(m => m.status === "watched").length >= 1
  },
  {
    id: "ten_movies",
    name: "Getting Started",
    icon: "📽️",
    desc: "Add 10 movies to your vault",
    check: (vault) => vault.length >= 10
  },
  {
    id: "fifty_movies",
    name: "Cinephile",
    icon: "🎞️",
    desc: "Add 50 movies to your vault",
    check: (vault) => vault.length >= 50
  },
  {
    id: "hundred_movies",
    name: "Century Club",
    icon: "💯",
    desc: "Add 100 movies to your vault",
    check: (vault) => vault.length >= 100
  },
  {
    id: "ten_watched",
    name: "Regular Viewer",
    icon: "🍿",
    desc: "Watch 10 movies",
    check: (vault) => vault.filter(m => m.status === "watched").length >= 10
  },
  {
    id: "fifty_watched",
    name: "Movie Buff",
    icon: "🏅",
    desc: "Watch 50 movies",
    check: (vault) => vault.filter(m => m.status === "watched").length >= 50
  },
  {
    id: "hundred_watched",
    name: "Legend",
    icon: "👑",
    desc: "Watch 100 movies",
    check: (vault) => vault.filter(m => m.status === "watched").length >= 100
  },
  {
    id: "first_favorite",
    name: "Love at First Sight",
    icon: "❤️",
    desc: "Favorite a movie",
    check: (vault) => vault.filter(m => m.favorite).length >= 1
  },
  {
    id: "ten_favorites",
    name: "Heart Collector",
    icon: "💖",
    desc: "Favorite 10 movies",
    check: (vault) => vault.filter(m => m.favorite).length >= 10
  },
  {
    id: "hundred_hours",
    name: "Marathon Runner",
    icon: "⏱️",
    desc: "Watch 100 hours of content",
    check: (vault) => {
      const total = vault.filter(m => m.status === "watched")
        .reduce((sum, m) => sum + (m.runtime || 120), 0);
      return total >= 6000;
    }
  },
  {
    id: "five_star",
    name: "Perfectionist",
    icon: "⭐",
    desc: "Give a movie 5 stars",
    check: (vault) => vault.some(m => m.userRating === 5)
  },
  {
    id: "critic",
    name: "The Critic",
    icon: "📝",
    desc: "Rate 25 movies",
    check: (vault) => vault.filter(m => m.userRating > 0).length >= 25
  },
  {
    id: "collector",
    name: "Collection Curator",
    icon: "📚",
    desc: "Create your first collection",
    check: () => {
      try {
        const cols = JSON.parse(localStorage.getItem(STORAGE_KEYS.COLLECTIONS) || "[]");
        return cols.length >= 1;
      } catch (e) { return false; }
    }
  },
  {
    id: "reviewer",
    name: "The Reviewer",
    icon: "✍️",
    desc: "Add notes to 10 movies",
    check: (vault) => vault.filter(m => m.notes && m.notes.length > 0).length >= 10
  }
];

/* =========================================================
   ⚙️ APP CONFIG
========================================================= */
const APP_CONFIG = {
  name: "CineVault",
  version: "4.0.0",
  searchDebounce: 350,
  cloudSaveDebounce: 1200,
  maxResults: 12,
  toastDuration: 2400,
  cardsPerRowDesktop: 5,
  cardsPerRowMobile: 2
};

/* =========================================================
   🔥 FIREBASE READY CHECK
========================================================= */
const FIREBASE_READY = (
  FIREBASE_CONFIG.apiKey &&
  !FIREBASE_CONFIG.apiKey.startsWith("YOUR_") &&
  FIREBASE_CONFIG.projectId &&
  !FIREBASE_CONFIG.projectId.startsWith("YOUR_")
);

const TMDB_READY = (
  TMDB_KEY &&
  TMDB_KEY.length > 20 &&
  !TMDB_KEY.startsWith("PASTE_") &&
  !TMDB_KEY.startsWith("YOUR_")
);

/* =========================================================
   🌐 GOOGLE CLOUD FUNCTIONS URL (Proxy for TMDB - optional)
   अगर आपने proxy setup किया हो तो यहाँ URL डालें
========================================================= */
const TMDB_PROXY_URL = ""; // Example: "https://your-worker.workers.dev/tmdb"

/* =========================================================
   🎨 THEME DEFINITIONS
========================================================= */
const ACCENT_THEMES = ["gold", "cyan", "purple", "green", "red", "pink"];
const PAGE_THEMES = ["cinema", "tokyo", "paper", "vhs", "emerald"];

/* =========================================================
   📊 GLOBAL STATE
   All runtime state lives here.
   Other scripts reference CV.state.* to read/write.
========================================================= */
const CV = {
  // Core data
  vault: [],
  collections: [],
  achievements: {},
  watchHistory: {}, // { "2026-10-10": 3 }

  // UI state
  currentFilter: "all",
  currentSort: "recent",
  currentQuery: "",
  searchResults: [],
  highlightIdx: -1,
  searchTimeout: null,
  modalId: null,
  editingId: null,
  addToCollectionMovieId: null,

  // Advanced filters
  advancedFilters: {
    genre: "",
    minYear: null,
    maxYear: null,
    minRating: null,
    runtime: ""
  },

  // Firebase state
  firebaseAuth: null,
  firebaseDb: null,
  firebaseModules: null,
  currentUser: null,
  cloudSaveTimer: null,

  // Internals
  toastTimer: null,
  noteTimer: null,
  cloudTimer: null
};

/* =========================================================
   🌍 EXPOSE TO WINDOW
   So other scripts can access these values
========================================================= */
window.CV = CV;
window.CV_CONFIG = {
  TMDB_KEY,
  FIREBASE_CONFIG,
  STORAGE_KEYS,
  STATUS_OPTIONS,
  ACHIEVEMENTS_LIST,
  APP_CONFIG,
  FIREBASE_READY,
  TMDB_READY,
  TMDB_PROXY_URL,
  ACCENT_THEMES,
  PAGE_THEMES
};

/* =========================================================
   ✅ LOG READY STATE
========================================================= */
console.log("🎬 CineVault Config loaded");
console.log("   📊 TMDB:", TMDB_READY ? "✓ ready" : "✗ not configured");
console.log("   🔥 Firebase:", FIREBASE_READY ? "✓ ready" : "✗ not configured");