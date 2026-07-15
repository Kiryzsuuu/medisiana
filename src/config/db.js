const mongoose = require('mongoose');

async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`[db] MongoDB connected: ${mongoose.connection.host}`);
}

module.exports = { connectDB };
