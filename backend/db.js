const mongoose = require("mongoose");

function redactUri(uri) {
  return String(uri || "").replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@");
}

function validateMongoUri(uri) {
  if (!uri) {
    throw new Error("Missing MONGODB_URI — set it in Railway variables (Atlas connection string)");
  }
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://");
  }
  return uri;
}

// Connect to MongoDB. Call this once when the server starts.
async function connectDB() {
  const uri = validateMongoUri(process.env.MONGODB_URI);

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log("Connected to MongoDB:", redactUri(uri));
    return mongoose.connection;
  } catch (err) {
    console.error("Could not connect to MongoDB.");
    console.error("URI:", redactUri(uri));
    console.error("Check Atlas IP allowlist (0.0.0.0/0 for Railway) and database user credentials.");
    throw err;
  }
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = connectDB;
module.exports.isDbConnected = isDbConnected;
module.exports.redactUri = redactUri;
