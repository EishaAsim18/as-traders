const jwt = require("jsonwebtoken");

/**
 * Sets req.customerId when a valid customer JWT is sent.
 * Invalid or expired tokens are rejected (no silent guest fallback).
 */
function trackOrderAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "customer" || !decoded.id) {
      return res.status(401).json({ message: "Please sign in with a customer account" });
    }
    req.customerId = decoded.id;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Your session expired. Please sign in again." });
  }
}

module.exports = trackOrderAuth;
