/**
 * Loads store contact from the Express backend.
 * Uses API_BASE_URL from config.js when present; otherwise Railway in production.
 */
(function () {
  var PRODUCTION_API_URL = "https://fswd-production.up.railway.app";

  function getBackendOrigin() {
    if (typeof API_BASE_URL !== "undefined" && API_BASE_URL) {
      return API_BASE_URL;
    }
    var host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:3000";
    }
    return PRODUCTION_API_URL;
  }

  window.__AS_BACKEND_ORIGIN__ = getBackendOrigin();

  var script = document.createElement("script");
  script.src = window.__AS_BACKEND_ORIGIN__ + "/api/public/store-config.js";
  script.onload = function () {
    window.dispatchEvent(new CustomEvent("as-store-contact-ready"));
  };
  script.onerror = function () {
    console.warn("Store config script failed to load from", script.src);
  };
  document.head.appendChild(script);
})();
