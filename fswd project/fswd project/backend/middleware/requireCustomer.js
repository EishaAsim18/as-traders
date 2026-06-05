const jwt = require("jsonwebtoken");

/** Requires a valid customer JWT; sets req.customerId */
function requireCustomer(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Please sign in to continue" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "customer" || !decoded.id) {
      return res.status(401).json({ message: "Please sign in again" });
    }
    req.customerId = decoded.id;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Your session expired. Please sign in again." });
  }
}

module.exports = requireCustomer;
