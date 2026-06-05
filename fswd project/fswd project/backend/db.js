const mongoose = require("mongoose");

// Connect to MongoDB. Call this once when the server starts.
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("Missing MONGODB_URI in .env file");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("\nCould not connect to MongoDB.");
    console.error("URI:", uri);
    console.error("Start MongoDB locally, or set MONGODB_URI in .env to Atlas.\n");
    throw err;
  }
}

module.exports = connectDB;
