import bcrypt from 'bcryptjs';
import db from '../config/db.js';

const hashPasswords = async () => {
  try {
    const [users] = await db.query("SELECT id, password_hash FROM users");
    
    for (const user of users) {
      // Only hash plain text passwords (not already bcrypt hashed)
      if (!user.password_hash.startsWith('$2')) {
        const hashedPassword = await bcrypt.hash(user.password_hash, 10);
        await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, user.id]);
        console.log(`✅ Hashed password for user ${user.id}`);
      } else {
        console.log(`⏭️ User ${user.id} already has bcrypt hash`);
      }
    }
    
    console.log("🎉 All passwords hashed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

hashPasswords();