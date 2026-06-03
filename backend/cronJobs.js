import cron from 'node-cron';
import db from './config/db.js';

// Run every Monday at 9 AM - Weekly driver payouts
export const setupWeeklyDriverPayouts = () => {
  cron.schedule('0 9 * * 1', async () => {
    console.log('🔄 Running weekly driver payouts...', new Date().toISOString());
    
    try {
      // Get all drivers with available balance >= R100
      const drivers = await db.query(`
        SELECT id, name, available_balance, bank_account_number, bank_name
        FROM users 
        WHERE role = 'driver' 
          AND driver_status = 'approved'
          AND available_balance >= 100
          AND (last_payout_date IS NULL OR last_payout_date < NOW() - INTERVAL '7 days')
      `);
      
      console.log(`📊 Found ${drivers.rows.length} drivers eligible for weekly payout`);
      
      for (const driver of drivers.rows) {
        // Create auto-payout request
        await db.query(
          `INSERT INTO driver_payouts (driver_id, amount, status, requested_at, notes)
           VALUES ($1, $2, 'pending', NOW(), $3)`,
          [driver.id, driver.available_balance, 'Automated weekly payout']
        );
        
        // Update last_payout_date (add column if not exists)
        await db.query(
          `UPDATE users SET last_payout_date = NOW() WHERE id = $1`,
          [driver.id]
        );
        
        console.log(`💰 Created weekly payout for driver ${driver.name}: R${driver.available_balance}`);
      }
      
      console.log('✅ Weekly driver payouts completed');
    } catch (err) {
      console.error('❌ Error in weekly driver payouts:', err);
    }
  });
  
  console.log('⏰ Weekly driver payout cron job scheduled (Mondays at 9 AM)');
};

// Optional: Run monthly vendor payouts (1st of each month at 10 AM)
export const setupMonthlyVendorPayouts = () => {
  cron.schedule('0 10 1 * *', async () => {
    console.log('🔄 Running monthly vendor payouts...', new Date().toISOString());
    
    try {
      const vendors = await db.query(`
        SELECT id, name, vendor_available_balance, bank_account_number, bank_name
        FROM users 
        WHERE role = 'vendor' 
          AND vendor_available_balance >= 500
      `);
      
      console.log(`📊 Found ${vendors.rows.length} vendors eligible for monthly payout`);
      
      for (const vendor of vendors.rows) {
        await db.query(
          `INSERT INTO vendor_payouts (vendor_id, amount, status, requested_at, notes)
           VALUES ($1, $2, 'pending', NOW(), $3)`,
          [vendor.id, vendor.vendor_available_balance, 'Automated monthly payout']
        );
        
        console.log(`💰 Created monthly payout for vendor ${vendor.name}: R${vendor.vendor_available_balance}`);
      }
      
      console.log('✅ Monthly vendor payouts completed');
    } catch (err) {
      console.error('❌ Error in monthly vendor payouts:', err);
    }
  });
  
  console.log('⏰ Monthly vendor payout cron job scheduled (1st of month at 10 AM)');
};

// Add last_payout_date column to users if not exists (run this once)
export const ensurePayoutColumns = async () => {
  try {
    // Check if last_payout_date column exists
    const checkResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_payout_date'
    `);
    
    if (checkResult.rows.length === 0) {
      await db.query(`ALTER TABLE users ADD COLUMN last_payout_date DATE`);
      console.log('✅ Added last_payout_date column to users table');
    }
  } catch (err) {
    console.error('Error ensuring payout columns:', err.message);
  }
};