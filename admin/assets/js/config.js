/**
 * Backend API origin — Railway in production, localhost in local dev.
 */
const PRODUCTION_API_URL = "https://fswd-production.up.railway.app";

function isLocalDevHost() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

const API_BASE_URL = isLocalDevHost() ? "http://localhost:3000" : PRODUCTION_API_URL;
