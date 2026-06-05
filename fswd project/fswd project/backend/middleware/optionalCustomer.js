const jwt = require("jsonwebtoken");

// Attach customer account id when checkout sends a valid customer JWT
function optionalCustomer(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id) {
      req.customerId = decoded.id;
    }
  } catch (error) {
    // Guest checkout — ignore invalid token
  }

  next();
}

module.exports = optionalCustomer;
