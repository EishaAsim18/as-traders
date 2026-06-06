const jwt = require("jsonwebtoken");

// Only logged-in admins can use protected routes
function requireAdmin(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Please log in first" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === "customer") {
      return res.status(401).json({ message: "Admin login required" });
    }
    if (!decoded.id) {
      return res.status(401).json({ message: "Invalid session" });
    }
    req.adminId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Session expired. Log in again." });
  }
}

module.exports = requireAdmin;
