(function () {
  var PRODUCTION_API_URL = "https://as-traders-production.up.railway.app";

  function isLocalHost() {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  }

  window.API_BASE_URL = isLocalHost() ? window.location.origin : PRODUCTION_API_URL;
  window.API_URL = window.API_BASE_URL + "/api";
  window.PUBLIC_API_URL = window.API_BASE_URL + "/api/public";

  console.log("[admin config]", {
    origin: window.location.origin,
    API_BASE_URL: window.API_BASE_URL,
    API_URL: window.API_URL,
    PUBLIC_API_URL: window.PUBLIC_API_URL
  });
})();
