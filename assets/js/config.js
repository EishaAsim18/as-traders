(function () {
  var PRODUCTION_API_URL = "https://fswd-production.up.railway.app";

  function isLocalDevHost() {
    var host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }

  window.API_BASE_URL = isLocalDevHost()
    ? "http://localhost:3000"
    : PRODUCTION_API_URL;

  window.API_URL = window.API_BASE_URL + "/api";
  window.PUBLIC_API_URL = window.API_BASE_URL + "/api/public";
})();