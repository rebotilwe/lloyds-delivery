import bcrypt from 'bcryptjs';
import db from '../config/db.js';

const fixPasswords = async () => {
  try {
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('New hash for "123456":', hashedPassword);
    
    // Update all users
    await db.query("UPDATE users SET password_hash = ? WHERE email = 'admin@lloyds.com'", [hashedPassword]);
    await db.query("UPDATE users SET password_hash = ? WHERE email = 'driver@lloyds.com'", [hashedPassword]);
    await db.query("UPDATE users SET password_hash = ? WHERE email = 'customer@lloyds.com'", [hashedPassword]);
    
    console.log('✅ Passwords updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

fixPasswords();