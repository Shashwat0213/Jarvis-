/* =========================================================
   CINEVAULT — AUTH MODULE
   Firebase Authentication + Cloud Sync
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  const state = window.CV;

  if (!CFG) {
    console.error("❌ config.js not loaded before auth.js");
    return;
  }

  /* =========================================================
     DOM HELPERS
  ========================================================== */
  const $ = function (id) { return document.getElementById(id); };

  function setAuthMessage(msg, isError) {
    const el = $("authMessage");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "#ff9b9b" : "#22c55e";
  }

  function setCloudStatus(text, state) {
    const el = $("cloudStatus");
    if (!el) return;
    el.textContent = text;
    el.classList.add("on");
    if (state === "ok") el.style.color = "#22c55e";
    else if (state === "error") el.style.color = "#ff7b7b";
    else el.style.color = "#ffffff";
  }

  /* =========================================================
     INITIALIZE FIREBASE
  ========================================================== */
  async function initFirebase() {
    if (!CFG.FIREBASE_READY) {
      console.warn("⚠️ Firebase not configured — running in local mode");
      setCloudStatus("☁ Local mode");
      return;
    }

    try {
      const appMod  = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
      const authMod = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");
      const dbMod   = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");

      const app = appMod.initializeApp(CFG.FIREBASE_CONFIG);
      state.firebaseAuth = authMod.getAuth(app);
      state.firebaseDb = dbMod.getFirestore(app);
      state.firebaseModules = { appMod, authMod, dbMod };

      // Keep session persistent
      try {
        await authMod.setPersistence(state.firebaseAuth, authMod.browserLocalPersistence);
      } catch (e) { /* ignore */ }

      // Listen to auth state
      authMod.onAuthStateChanged(state.firebaseAuth, async function (user) {
        state.currentUser = user;
        await handleAuthState(user);
      });

      console.log("🔥 Firebase initialized");
      setCloudStatus("☁ Cloud ready", "ok");
    } catch (err) {
      console.error("Firebase init failed:", err);
      setCloudStatus("☁ Cloud off — using local", "error");
    }
  }

  /* =========================================================
     AUTH STATE CHANGE HANDLER
  ========================================================== */
  async function handleAuthState(user) {
    const userBox = $("authUserBox");
    const loginBtn = $("authOpenBtn");

    if (user) {
      const name = user.displayName || (user.email || "User").split("@")[0];

      if (userBox) userBox.classList.add("on");
      if (loginBtn) loginBtn.style.display = "none";

      const nameEl = $("authUserName");
      const avatar = $("authAvatar");
      const status = $("authStatus");

      if (nameEl) nameEl.textContent = name;
      if (status) {
        status.textContent = "☁ Synced";
        status.classList.add("ok");
      }

      if (avatar) {
        if (user.photoURL) {
          avatar.innerHTML = '<img src="' + user.photoURL + '" alt="avatar">';
        } else {
          avatar.textContent = name.charAt(0).toUpperCase();
        }
      }

      // Load vault from cloud
      setCloudStatus("☁ Loading vault…");
      await loadCloudVault();
      setCloudStatus("☁ Synced", "ok");
    } else {
      if (userBox) userBox.classList.remove("on");
      if (loginBtn) loginBtn.style.display = "inline-block";

      const status = $("authStatus");
      if (status) {
        status.textContent = "Local";
        status.classList.remove("ok");
      }

      setCloudStatus("☁ Local mode");
    }
  }

  /* =========================================================
     LOAD VAULT FROM CLOUD
  ========================================================== */
  async function loadCloudVault() {
    if (!state.currentUser || !state.firebaseDb || !state.firebaseModules) return;

    try {
      const { dbMod } = state.firebaseModules;
      const ref = dbMod.doc(state.firebaseDb, "users", state.currentUser.uid, "data", "vault");
      const snap = await dbMod.getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.movies) && data.movies.length > 0) {
          // Merge logic: cloud wins if it has more movies
          if (data.movies.length >= state.vault.length) {
            state.vault = data.movies;
            saveLocal();
            if (window.CV_APP && window.CV_APP.renderAll) window.CV_APP.renderAll();
            if (window.CV_APP && window.CV_APP.toast) window.CV_APP.toast("✓ Vault synced from cloud");
          } else {
            // Local has more — push to cloud
            await saveCloudVault();
          }
        } else {
          await saveCloudVault();
        }
      } else {
        // First login — push local vault
        await saveCloudVault();
      }
    } catch (err) {
      console.error("Cloud load failed:", err);
      setCloudStatus("☁ Load failed", "error");
    }
  }

  /* =========================================================
     SAVE VAULT TO CLOUD
  ========================================================== */
  async function saveCloudVault() {
    if (!state.currentUser || !state.firebaseDb || !state.firebaseModules) return;

    try {
      const { dbMod } = state.firebaseModules;
      const ref = dbMod.doc(state.firebaseDb, "users", state.currentUser.uid, "data", "vault");

      await dbMod.setDoc(ref, {
        movies: state.vault,
        updatedAt: dbMod.serverTimestamp()
      }, { merge: true });

      setCloudStatus("☁ Synced", "ok");
    } catch (err) {
      console.error("Cloud save failed:", err);
      setCloudStatus("☁ Save failed", "error");
    }
  }

  /* =========================================================
     SCHEDULED CLOUD SAVE (debounced)
  ========================================================== */
  function scheduleCloudSave() {
    if (!state.currentUser) return;
    clearTimeout(state.cloudSaveTimer);
    state.cloudSaveTimer = setTimeout(saveCloudVault, CFG.APP_CONFIG.cloudSaveDebounce);
  }

  /* =========================================================
     LOCAL STORAGE HELPERS
  ========================================================== */
  function saveLocal() {
    try {
      localStorage.setItem(CFG.STORAGE_KEYS.VAULT, JSON.stringify(state.vault));
    } catch (e) { /* ignore */ }
  }

  /* =========================================================
     AUTH UI HELPERS
  ========================================================== */
  function openAuth() {
    const overlay = $("authOverlay");
    if (overlay) {
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
    }
  }

  function closeAuth() {
    const overlay = $("authOverlay");
    if (overlay) {
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
    }
    setAuthMessage("");
  }

  function setAuthMode(mode) {
    document.querySelectorAll(".auth-tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.authTab === mode);
    });

    const isSignup = mode === "signup";
    const titleEl = $("authTitle");
    const subEl = $("authSubtitle");
    const nameField = $("authNameField");
    const submitBtn = $("authSubmit");

    if (titleEl) titleEl.textContent = isSignup ? "Create Account" : "Welcome Back";
    if (subEl) subEl.textContent = isSignup
      ? "Start building your personal movie vault."
      : "Sign in to sync your vault across devices.";
    if (nameField) nameField.style.display = isSignup ? "flex" : "none";
    if (submitBtn) submitBtn.textContent = isSignup ? "Create Account" : "Login";

    const nameInput = $("authName");
    if (nameInput) nameInput.required = isSignup;

    setAuthMessage("");
  }

  /* =========================================================
     EMAIL / PASSWORD SUBMIT
  ========================================================== */
  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (!state.firebaseAuth) {
      setAuthMessage("Firebase not ready. Refresh and try again.", true);
      return;
    }

    const activeTab = document.querySelector(".auth-tab.active");
    const mode = activeTab ? activeTab.dataset.authTab : "login";
    const email = ($("authEmail") || {}).value?.trim() || "";
    const password = ($("authPassword") || {}).value || "";
    const name = ($("authName") || {}).value?.trim() || "";

    const submitBtn = $("authSubmit");
    if (submitBtn) submitBtn.disabled = true;

    setAuthMessage("Please wait…");

    try {
      const { authMod, dbMod } = state.firebaseModules;

      if (mode === "signup") {
        const cred = await authMod.createUserWithEmailAndPassword(
          state.firebaseAuth, email, password
        );
        if (name) {
          await authMod.updateProfile(cred.user, { displayName: name });
        }
        // Save user profile to Firestore
        await dbMod.setDoc(
          dbMod.doc(state.firebaseDb, "users", cred.user.uid),
          {
            uid: cred.user.uid,
            email: email,
            displayName: name || email.split("@")[0],
            role: "user",
            createdAt: dbMod.serverTimestamp()
          },
          { merge: true }
        );
        setAuthMessage("✓ Account created!", false);
      } else {
        await authMod.signInWithEmailAndPassword(state.firebaseAuth, email, password);
        setAuthMessage("✓ Logged in!", false);
      }

      setTimeout(closeAuth, 700);
    } catch (err) {
      const msgs = {
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/email-already-in-use": "Email already registered. Try login.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/invalid-email": "Please enter a valid email.",
        "auth/network-request-failed": "Network error. Check your internet.",
        "auth/operation-not-allowed": "Enable Email/Password in Firebase Console.",
        "auth/unauthorized-domain": "Domain not authorized in Firebase Console.",
        "auth/too-many-requests": "Too many attempts. Try again later."
      };
      setAuthMessage(msgs[err.code] || err.message, true);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  /* =========================================================
     GOOGLE SIGN-IN
  ========================================================== */
  async function handleGoogleSignIn() {
    if (!state.firebaseAuth) {
      setAuthMessage("Firebase not ready. Refresh and try again.", true);
      return;
    }

    setAuthMessage("Opening Google…");

    try {
      const { authMod, dbMod } = state.firebaseModules;
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await authMod.signInWithPopup(state.firebaseAuth, provider);
      const user = result.user;

      await dbMod.setDoc(
        dbMod.doc(state.firebaseDb, "users", user.uid),
        {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          role: "user",
          updatedAt: dbMod.serverTimestamp()
        },
        { merge: true }
      );

      setAuthMessage("✓ Signed in!", false);
      setTimeout(closeAuth, 700);
    } catch (err) {
      const msgs = {
        "auth/popup-blocked": "Popup blocked. Allow popups for this site.",
        "auth/popup-closed-by-user": "Sign-in cancelled.",
        "auth/unauthorized-domain": "Domain not authorized. Add your GitHub domain in Firebase.",
        "auth/operation-not-allowed": "Enable Google sign-in in Firebase Console.",
        "auth/account-exists-with-different-credential": "Email already registered with a different method.",
        "auth/cancelled-popup-request": "Only one popup allowed at a time."
      };
      setAuthMessage(msgs[err.code] || err.message, true);
      console.error("Google sign-in error:", err);
    }
  }

  /* =========================================================
     LOGOUT
  ========================================================== */
  async function handleLogout() {
    if (!state.firebaseAuth) return;
    try {
      await state.firebaseModules.authMod.signOut(state.firebaseAuth);
      if (window.CV_APP && window.CV_APP.toast) window.CV_APP.toast("Logged out");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  /* =========================================================
     BIND UI EVENTS
  ========================================================== */
  function bindAuthUI() {
    // Open / close
    const openBtn = $("authOpenBtn");
    const closeBtn = $("authCloseBtn");
    const overlay = $("authOverlay");

    if (openBtn) openBtn.addEventListener("click", openAuth);
    if (closeBtn) closeBtn.addEventListener("click", closeAuth);
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeAuth();
      });
    }

    // Tabs
    document.querySelectorAll(".auth-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        setAuthMode(tab.dataset.authTab);
      });
    });

    // Email form
    const form = $("authForm");
    if (form) form.addEventListener("submit", handleAuthSubmit);

    // Google button
    const googleBtn = $("googleSignInBtn");
    if (googleBtn) googleBtn.addEventListener("click", handleGoogleSignIn);

    // Logout
    const logoutBtn = $("authLogoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  }

  /* =========================================================
     EXPORTS
  ========================================================== */
  window.CV_AUTH = {
    init: initFirebase,
    openAuth,
    closeAuth,
    setAuthMode,
    saveCloudVault,
    loadCloudVault,
    scheduleCloudSave
  };

  console.log("🎬 CineVault Auth module loaded");

})();