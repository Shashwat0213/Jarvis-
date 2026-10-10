/* =========================================================
   CINEVAULT — API MODULE
   TMDB search + iTunes fallback + detail fetching
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  const state = window.CV;

  if (!CFG) {
    console.error("❌ config.js not loaded before api.js");
    return;
  }

  /* =========================================================
     UTILITIES
  ========================================================== */
  function sanitizeTitle(t) {
    return String(t || "").trim();
  }

  function buildPosterUrl(path, size) {
    if (!path) return "";
    return "https://image.tmdb.org/t/p/" + (size || "w500") + path;
  }

  /* =========================================================
     TMDB — SEARCH
  ========================================================== */
  async function searchTMDB(query) {
    if (!CFG.TMDB_READY) return null;
    const q = sanitizeTitle(query);
    if (!q || q.length < 2) return null;

    // Optional proxy support
    const base = CFG.TMDB_PROXY_URL
      ? CFG.TMDB_PROXY_URL.replace(/\/$/, "") + "/search"
      : "https://api.themoviedb.org/3/search/movie";

    const url =
      base +
      "?api_key=" + encodeURIComponent(CFG.TMDB_KEY) +
      "&query=" + encodeURIComponent(q) +
      "&include_adult=false" +
      "&language=en-US" +
      "&page=1";

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn("TMDB search HTTP", res.status);
        return null;
      }
      const data = await res.json();
      if (!data.results || !data.results.length) return [];

      return data.results.slice(0, CFG.APP_CONFIG.maxResults).map(function (m) {
        return {
          source: "tmdb",
          sourceId: "tmdb-" + m.id,
          tmdbId: m.id,
          title: m.title || m.original_title || "Untitled",
          year: (m.release_date || "").slice(0, 4) || "—",
          releaseDate: m.release_date || "",
          poster: buildPosterUrl(m.poster_path, "w500"),
          backdrop: buildPosterUrl(m.backdrop_path, "w780"),
          overview: m.overview || "",
          rating: m.vote_average || 0,
          genre: "",
          runtime: 0,
          trailerUrl: ""
        };
      });
    } catch (err) {
      console.warn("TMDB search failed:", err);
      return null;
    }
  }

  /* =========================================================
     iTunes — SEARCH (fallback, no key required)
  ========================================================== */
  async function searchiTunes(query) {
    const q = sanitizeTitle(query);
    if (!q || q.length < 2) return [];

    const url =
      "https://itunes.apple.com/search" +
      "?term=" + encodeURIComponent(q) +
      "&media=movie" +
      "&entity=movie" +
      "&limit=" + CFG.APP_CONFIG.maxResults;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("iTunes HTTP " + res.status);
      const data = await res.json();

      return (data.results || []).map(function (m) {
        const poster = m.artworkUrl100
          ? m.artworkUrl100.replace("100x100bb", "600x900bb")
          : "";
        const releaseDate = m.releaseDate ? m.releaseDate.slice(0, 10) : "";

        return {
          source: "itunes",
          sourceId: "itunes-" + m.trackId,
          tmdbId: null,
          title: m.trackName || "Untitled",
          year: releaseDate ? releaseDate.slice(0, 4) : "—",
          releaseDate: releaseDate,
          poster: poster,
          backdrop: "",
          overview: m.longDescription || m.shortDescription || "",
          rating: 0,
          genre: m.primaryGenreName || "",
          runtime: m.trackTimeMillis ? Math.round(m.trackTimeMillis / 60000) : 0,
          trailerUrl: m.previewUrl || ""
        };
      });
    } catch (err) {
      console.warn("iTunes search failed:", err);
      return [];
    }
  }

  /* =========================================================
     UNIFIED SEARCH
     Tries TMDB first; if unavailable or empty, falls back to iTunes.
  ========================================================== */
  async function searchMovies(query) {
    const tmdb = await searchTMDB(query);
    if (tmdb !== null && tmdb.length > 0) return tmdb;
    return searchiTunes(query);
  }

  /* =========================================================
     TMDB — FULL DETAILS (runtime, cast, director, trailer)
  ========================================================== */
  async function fetchTMDBDetails(tmdbId) {
    if (!CFG.TMDB_READY || !tmdbId) return null;

    const base = CFG.TMDB_PROXY_URL
      ? CFG.TMDB_PROXY_URL.replace(/\/$/, "")
      : "https://api.themoviedb.org/3/movie";

    const key = encodeURIComponent(CFG.TMDB_KEY);
    const id = encodeURIComponent(tmdbId);

    const urls = {
      details: base + "/" + id + "?api_key=" + key,
      credits: base + "/" + id + "/credits?api_key=" + key,
      videos:  base + "/" + id + "/videos?api_key=" + key
    };

    try {
      const [dR, cR, vR] = await Promise.all([
        fetch(urls.details),
        fetch(urls.credits),
        fetch(urls.videos)
      ]);

      const details = dR.ok ? await dR.json() : null;
      const credits = cR.ok ? await cR.json() : null;
      const videos  = vR.ok ? await vR.json() : null;

      // Trailer
      let trailerUrl = "";
      if (videos && Array.isArray(videos.results)) {
        const yt =
          videos.results.find(function (v) {
            return v.site === "YouTube" && v.type === "Trailer" && v.official;
          }) ||
          videos.results.find(function (v) {
            return v.site === "YouTube" && v.type === "Trailer";
          }) ||
          videos.results.find(function (v) {
            return v.site === "YouTube";
          });
        if (yt) trailerUrl = "https://www.youtube.com/watch?v=" + yt.key;
      }

      // Cast (top 8)
      let cast = [];
      if (credits && Array.isArray(credits.cast)) {
        cast = credits.cast.slice(0, 8).map(function (c) { return c.name; });
      }

      // Director
      let director = "";
      if (credits && Array.isArray(credits.crew)) {
        const d = credits.crew.find(function (c) {
          return c.job === "Director";
        });
        if (d) director = d.name;
      }

      // Genres
      const genre = details && Array.isArray(details.genres)
        ? details.genres.map(function (g) { return g.name; }).join(", ")
        : "";

      return {
        runtime: (details && details.runtime) || 0,
        genre: genre,
        overview: (details && details.overview) || "",
        tmdbRating: (details && details.vote_average) || 0,
        trailerUrl: trailerUrl,
        cast: cast,
        director: director,
        releaseDate: (details && details.release_date) || "",
        budget: (details && details.budget) || 0,
        revenue: (details && details.revenue) || 0
      };
    } catch (err) {
      console.warn("TMDB details fetch failed:", err);
      return null;
    }
  }

  /* =========================================================
     TMDB — SIMILAR MOVIES (for recommendations)
  ========================================================== */
  async function fetchSimilarMovies(tmdbId) {
    if (!CFG.TMDB_READY || !tmdbId) return [];

    const base = CFG.TMDB_PROXY_URL
      ? CFG.TMDB_PROXY_URL.replace(/\/$/, "") + "/similar"
      : "https://api.themoviedb.org/3/movie/" + encodeURIComponent(tmdbId) + "/similar";

    const url = base + "?api_key=" + encodeURIComponent(CFG.TMDB_KEY) + "&language=en-US&page=1";

    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();

      return (data.results || []).slice(0, 6).map(function (m) {
        return {
          tmdbId: m.id,
          sourceId: "tmdb-" + m.id,
          title: m.title || m.original_title || "Untitled",
          year: (m.release_date || "").slice(0, 4) || "—",
          releaseDate: m.release_date || "",
          poster: buildPosterUrl(m.poster_path, "w342"),
          overview: m.overview || "",
          rating: m.vote_average || 0
        };
      });
    } catch (err) {
      console.warn("Similar fetch failed:", err);
      return [];
    }
  }

  /* =========================================================
     NORMALIZE A SEARCH RESULT → MOVIE OBJECT
     Used when adding to vault.
  ========================================================== */
  function buildMovieObject(result, extra, status) {
    extra = extra || {};
    return {
      id: "cv-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      sourceId: result.sourceId || ("manual-" + Date.now()),
      tmdbId: result.tmdbId || null,
      title: result.title || "Untitled",
      year: result.year || "—",
      releaseDate: extra.releaseDate || result.releaseDate || "",
      poster: result.poster || "",
      backdrop: result.backdrop || "",
      overview: extra.overview || result.overview || "",
      tmdbRating: extra.tmdbRating || Number(result.rating) || 0,
      genre: extra.genre || result.genre || "",
      runtime: extra.runtime || result.runtime || 0,
      cast: extra.cast || [],
      director: extra.director || "",
      trailerUrl: extra.trailerUrl || result.trailerUrl || "",
      watchUrl: "",
      downloadUrl: "",
      userRating: 0,
      notes: "",
      status: status || "want",
      favorite: false,
      addedAt: Date.now(),
      watchedAt: null
    };
  }

  /* =========================================================
     EXPORTS
  ========================================================== */
  window.CV_API = {
    searchMovies,
    searchTMDB,
    searchiTunes,
    fetchTMDBDetails,
    fetchSimilarMovies,
    buildMovieObject,
    buildPosterUrl
  };

  console.log("🎬 CineVault API module loaded");
  console.log("   🔍 Provider:", CFG.TMDB_READY ? "TMDB (primary)" : "iTunes (fallback)");

})();