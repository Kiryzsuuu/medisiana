require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

/**
 * Creates (or promotes/resets) an admin account.
 * Usage: node scripts/createAdmin.js <email> <fullName> <password>
 */
async function main() {
  const [, , email, fullName, password] = process.argv;
  if (!email || !fullName || !password) {
    console.error('Usage: node scripts/createAdmin.js <email> <fullName> <password>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      email: email.toLowerCase(),
      fullName,
      password: hashed,
      role: 'admin',
      isActive: true,
      isVerified: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Admin siap: ${user.email} (${user.fullName}) — role: ${user.role}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Gagal membuat admin:', err.message);
  process.exit(1);
});
