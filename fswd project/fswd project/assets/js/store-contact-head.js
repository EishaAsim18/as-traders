/**
 * Loads store contact from the Express backend (port 3000) even when the page
 * is opened via Live Server or another static server on a different port.
 */
(function () {
  function getBackendOrigin() {
    var loc = window.location;
    var host = loc.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost";
    if (
      (loc.protocol === "http:" || loc.protocol === "https:") &&
      (loc.port === "3000" || loc.port === "")
    ) {
      return loc.origin;
    }
    return "http://" + host + ":3000";
  }

  window.__AS_BACKEND_ORIGIN__ = getBackendOrigin();

  var script = document.createElement("script");
  script.src = window.__AS_BACKEND_ORIGIN__ + "/api/public/store-config.js";
  script.onload = function () {
    window.dispatchEvent(new CustomEvent("as-store-contact-ready"));
  };
  document.head.appendChild(script);
})();
