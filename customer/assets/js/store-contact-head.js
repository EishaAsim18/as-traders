/**
 * Loads store contact from the Railway backend.
 * Requires config.js (API_BASE_URL) loaded first.
 */
(function () {
  var origin = typeof API_BASE_URL !== "undefined"
    ? API_BASE_URL
    : "https://as-traders-production.up.railway.app";

  window.__AS_BACKEND_ORIGIN__ = origin;

  var script = document.createElement("script");
  script.src = origin + "/api/public/store-config.js";
  script.onload = function () {
    window.dispatchEvent(new CustomEvent("as-store-contact-ready"));
  };
  script.onerror = function () {
    console.warn("Store config script failed to load from", script.src);
  };
  document.head.appendChild(script);
})();
