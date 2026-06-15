import cron from 'node-cron';
import db from './config/db.js';

// Run every 2 days at 02:00 AM - Driver payouts
export const setupDriverPayouts = () => {
  cron.schedule('0 2 */2 * *', async () => {
    console.log('🔄 Running driver payouts (every 2 days)...', new Date().toISOString());
    
    try {
      // Get all drivers with completed deliveries not yet paid (last 2 days)
      const eligibleDrivers = await db.query(`
        SELECT 
          d.id,
          d.name,
          d.email,
          d.phone,
          d.bank_account_number,
          d.bank_name,
          d.account_holder_name,
          d.branch_code,
          COALESCE(SUM(o.driver_earning), 0) as total_earnings,
          COUNT(o.id) as total_deliveries,
          ARRAY_AGG(o.id) as order_ids
        FROM users d
        JOIN orders o ON o.driver_id = d.id
        WHERE d.role = 'driver' 
          AND d.driver_status = 'approved'
          AND o.status = 'delivered'
          AND o.driver_paid = false
          AND o.delivered_at > NOW() - INTERVAL '2 days'
        GROUP BY d.id
        HAVING COALESCE(SUM(o.driver_earning), 0) > 0
      `);
      
      console.log(`📊 Found ${eligibleDrivers.rows.length} drivers eligible for payout (every 2 days)`);
      
      if (eligibleDrivers.rows.length === 0) {
        console.log('ℹ️ No drivers with pending payouts for this period');
        return;
      }
      
      // Create batch payout record
      const totalAmount = eligibleDrivers.rows.reduce((sum, d) => sum + parseFloat(d.total_earnings), 0);
      const batchResult = await db.query(
        `INSERT INTO batch_payouts (batch_type, period_start, period_end, total_recipients, total_amount, status, created_at)
         VALUES ('driver', NOW() - INTERVAL '2 days', NOW(), $1, $2, 'processing', NOW())
         RETURNING id`,
        [eligibleDrivers.rows.length, totalAmount]
      );
      
      const batchId = batchResult.rows[0].id;
      
      // Create payout records for each driver
      for (const driver of eligibleDrivers.rows) {
        // Create driver payout record
        const payoutResult = await db.query(
          `INSERT INTO driver_payouts (
            driver_id, batch_id, period_start, period_end, 
            total_deliveries, total_amount, status, created_at, notes
           )
           VALUES ($1, $2, NOW() - INTERVAL '2 days', NOW(), $3, $4, 'pending', NOW(), $5)
           RETURNING id`,
          [
            driver.id, 
            batchId, 
            driver.total_deliveries, 
            driver.total_earnings,
            `Automated payout for ${driver.total_deliveries} deliveries from ${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString()} to ${new Date().toLocaleDateString()}`
          ]
        );
        
        // Mark individual orders as paid
        await db.query(
          `UPDATE orders SET 
            driver_paid = true, 
            driver_paid_at = NOW(),
            driver_payout_id = $1
           WHERE id = ANY($2)`,
          [payoutResult.rows[0].id, driver.order_ids]
        );
        
        console.log(`💰 Created payout for driver ${driver.name}: R${parseFloat(driver.total_earnings).toFixed(2)} (${driver.total_deliveries} deliveries)`);
      }
      
      // Update batch status to calculated
      await db.query(
        `UPDATE batch_payouts SET status = 'calculated', updated_at = NOW() WHERE id = $1`,
        [batchId]
      );
      
      console.log(`✅ Driver payouts completed. Batch ID: ${batchId}, Total: R${totalAmount.toFixed(2)}`);
      
      // Send notification to admin
      await notifyAdminOfPayouts('driver', batchId, eligibleDrivers.rows.length, totalAmount);
      
    } catch (err) {
      console.error('❌ Error in driver payouts:', err);
    }
  });
  
  console.log('⏰ Driver payout cron job scheduled (every 2 days at 02:00 AM)');
};

// Run every 2 days at 03:00 AM (after driver payouts) - Vendor payouts
export const setupVendorPayouts = () => {
  cron.schedule('0 3 */2 * *', async () => {
    console.log('🔄 Running vendor payouts (every 2 days)...', new Date().toISOString());
    
    try {
      // Get all vendors with completed food orders not yet paid (last 2 days)
      const eligibleVendors = await db.query(`
        SELECT 
          r.id as vendor_id,
          r.name as vendor_name,
          r.owner_id,
          u.bank_account_number,
          u.bank_name,
          u.account_holder_name,
          u.branch_code,
          COALESCE(SUM(o.vendor_payout_amount), 0) as total_earnings,
          COUNT(o.id) as total_orders,
          ARRAY_AGG(o.id) as order_ids
        FROM restaurants r
        JOIN orders o ON o.restaurant_id = r.id
        JOIN users u ON u.id = r.owner_id
        WHERE o.delivery_type = 'food'
          AND o.status = 'delivered'
          AND o.vendor_paid = false
          AND o.delivered_at > NOW() - INTERVAL '2 days'
        GROUP BY r.id, u.id
        HAVING COALESCE(SUM(o.vendor_payout_amount), 0) > 0
      `);
      
      console.log(`📊 Found ${eligibleVendors.rows.length} vendors eligible for payout (every 2 days)`);
      
      if (eligibleVendors.rows.length === 0) {
        console.log('ℹ️ No vendors with pending payouts for this period');
        return;
      }
      
      // Create batch payout record
      const totalAmount = eligibleVendors.rows.reduce((sum, v) => sum + parseFloat(v.total_earnings), 0);
      const batchResult = await db.query(
        `INSERT INTO batch_payouts (batch_type, period_start, period_end, total_recipients, total_amount, status, created_at)
         VALUES ('vendor', NOW() - INTERVAL '2 days', NOW(), $1, $2, 'processing', NOW())
         RETURNING id`,
        [eligibleVendors.rows.length, totalAmount]
      );
      
      const batchId = batchResult.rows[0].id;
      
      // Create payout records for each vendor
      for (const vendor of eligibleVendors.rows) {
        // Create vendor payout record
        const payoutResult = await db.query(
          `INSERT INTO vendor_payouts (
            vendor_id, batch_id, period_start, period_end, 
            total_orders, total_amount, status, created_at, notes
           )
           VALUES ($1, $2, NOW() - INTERVAL '2 days', NOW(), $3, $4, 'pending', NOW(), $5)
           RETURNING id`,
          [
            vendor.vendor_id, 
            batchId, 
            vendor.total_orders, 
            vendor.total_earnings,
            `Automated payout for ${vendor.total_orders} orders from ${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString()} to ${new Date().toLocaleDateString()}`
          ]
        );
        
        // Mark individual orders as paid to vendor
        await db.query(
          `UPDATE orders SET 
            vendor_paid = true, 
            vendor_paid_at = NOW(),
            vendor_payout_id = $1
           WHERE id = ANY($2)`,
          [payoutResult.rows[0].id, vendor.order_ids]
        );
        
        console.log(`💰 Created payout for vendor ${vendor.vendor_name}: R${parseFloat(vendor.total_earnings).toFixed(2)} (${vendor.total_orders} orders)`);
      }
      
      // Update batch status to calculated
      await db.query(
        `UPDATE batch_payouts SET status = 'calculated', updated_at = NOW() WHERE id = $1`,
        [batchId]
      );
      
      console.log(`✅ Vendor payouts completed. Batch ID: ${batchId}, Total: R${totalAmount.toFixed(2)}`);
      
      // Send notification to admin
      await notifyAdminOfPayouts('vendor', batchId, eligibleVendors.rows.length, totalAmount);
      
    } catch (err) {
      console.error('❌ Error in vendor payouts:', err);
    }
  });
  
  console.log('⏰ Vendor payout cron job scheduled (every 2 days at 03:00 AM)');
};

// Notify admin about payouts (log or email)
async function notifyAdminOfPayouts(type, batchId, count, totalAmount) {
  console.log(`📧 [NOTIFICATION] ${type.toUpperCase()} payouts ready for review`);
  console.log(`   Batch ID: ${batchId}`);
  console.log(`   Recipients: ${count}`);
  console.log(`   Total Amount: R${totalAmount.toFixed(2)}`);
  
  // You can add email notification here
  // await sendAdminEmail(`Payouts ready: ${type}`, `Batch ${batchId} with ${count} payouts totaling R${totalAmount.toFixed(2)}`);
}

// Run every day at 08:00 AM - Remind admin about pending payouts
export const setupPayoutReminder = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('🔔 Checking for pending payouts...', new Date().toISOString());
    
    try {
      // Check for pending driver payouts older than 1 day
      const pendingDrivers = await db.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
        FROM driver_payouts
        WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 day'
      `);
      
      // Check for pending vendor payouts older than 1 day
      const pendingVendors = await db.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
        FROM vendor_payouts
        WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 day'
      `);
      
      if (pendingDrivers.rows[0].count > 0 || pendingVendors.rows[0].count > 0) {
        console.log(`⚠️ PENDING PAYOUTS REMINDER:`);
        if (pendingDrivers.rows[0].count > 0) {
          console.log(`   - ${pendingDrivers.rows[0].count} driver payouts (R${pendingDrivers.rows[0].total})`);
        }
        if (pendingVendors.rows[0].count > 0) {
          console.log(`   - ${pendingVendors.rows[0].count} vendor payouts (R${pendingVendors.rows[0].total})`);
        }
        // You can add email reminder here
      }
    } catch (err) {
      console.error('❌ Error checking pending payouts:', err);
    }
  });
  
  console.log('⏰ Payout reminder cron job scheduled (daily at 08:00 AM)');
};

// Add necessary columns if not exists (run once)
export const ensurePayoutColumns = async () => {
  try {
    // Check and add last_payout_date to users
    let checkResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_payout_date'
    `);
    
    if (checkResult.rows.length === 0) {
      await db.query(`ALTER TABLE users ADD COLUMN last_payout_date TIMESTAMP`);
      console.log('✅ Added last_payout_date column to users table');
    }
    
    // Check and add driver_earning to orders if not exists
    checkResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'driver_earning'
    `);
    
    if (checkResult.rows.length === 0) {
      await db.query(`ALTER TABLE orders ADD COLUMN driver_earning DECIMAL(10,2) DEFAULT 0`);
      console.log('✅ Added driver_earning column to orders table');
    }
    
    // Check and add driver_paid to orders
    checkResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'driver_paid'
    `);
    
    if (checkResult.rows.length === 0) {
      await db.query(`ALTER TABLE orders ADD COLUMN driver_paid BOOLEAN DEFAULT FALSE`);
      await db.query(`ALTER TABLE orders ADD COLUMN driver_paid_at TIMESTAMP`);
      await db.query(`ALTER TABLE orders ADD COLUMN driver_payout_id UUID`);
      console.log('✅ Added driver_paid columns to orders table');
    }
    
    // Check and add vendor_paid to orders
    checkResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'vendor_paid'
    `);
    
    if (checkResult.rows.length === 0) {
      await db.query(`ALTER TABLE orders ADD COLUMN vendor_paid BOOLEAN DEFAULT FALSE`);
      await db.query(`ALTER TABLE orders ADD COLUMN vendor_paid_at TIMESTAMP`);
      await db.query(`ALTER TABLE orders ADD COLUMN vendor_payout_id UUID`);
      await db.query(`ALTER TABLE orders ADD COLUMN vendor_payout_amount DECIMAL(10,2) DEFAULT 0`);
      console.log('✅ Added vendor_paid columns to orders table');
    }
    
    // Check and create batch_payouts table
    checkResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'batch_payouts'
    `);
    
    if (checkResult.rows.length === 0) {
      await db.query(`
        CREATE TABLE batch_payouts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          batch_type VARCHAR(20) NOT NULL,
          period_start TIMESTAMP NOT NULL,
          period_end TIMESTAMP NOT NULL,
          total_recipients INTEGER DEFAULT 0,
          total_amount DECIMAL(10,2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          processed_by INTEGER REFERENCES users(id),
          processed_at TIMESTAMP,
          completed_at TIMESTAMP
        )
      `);
      console.log('✅ Created batch_payouts table');
    }
    
    // Check and create driver_payouts table
    checkResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'driver_payouts'
    `);
    
    if (checkResult.rows.length === 0) {
      await db.query(`
        CREATE TABLE driver_payouts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          driver_id INTEGER REFERENCES users(id),
          batch_id UUID REFERENCES batch_payouts(id),
          period_start TIMESTAMP,
          period_end TIMESTAMP,
          total_deliveries INTEGER DEFAULT 0,
          total_amount DECIMAL(10,2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending',
          payment_reference VARCHAR(255),
          paid_at TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Created driver_payouts table');
    }
    
    // Check and create vendor_payouts table
    checkResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'vendor_payouts'
    `);
    
    if (checkResult.rows.length === 0) {
      await db.query(`
        CREATE TABLE vendor_payouts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          vendor_id INTEGER REFERENCES restaurants(id),
          batch_id UUID REFERENCES batch_payouts(id),
          period_start TIMESTAMP,
          period_end TIMESTAMP,
          total_orders INTEGER DEFAULT 0,
          total_amount DECIMAL(10,2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending',
          payment_reference VARCHAR(255),
          paid_at TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Created vendor_payouts table');
    }
    
    // Check and add indexes for performance
    await db.query(`CREATE INDEX IF NOT EXISTS idx_orders_driver_paid ON orders(driver_paid) WHERE driver_paid = false`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_orders_vendor_paid ON orders(vendor_paid) WHERE vendor_paid = false`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_driver_payouts_status ON driver_payouts(status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status ON vendor_payouts(status)`);
    
    console.log('✅ All payout tables and columns verified');
    
  } catch (err) {
    console.error('Error ensuring payout columns:', err.message);
  }
};

// Initialize all cron jobs
export const setupAllPayoutJobs = async () => {
  try {
    await ensurePayoutColumns();
    setupDriverPayouts();
    setupVendorPayouts();
    setupPayoutReminder();
    console.log('✅ All payout cron jobs initialized (every 2 days schedule)');
  } catch (err) {
    console.error('❌ Failed to initialize payout cron jobs:', err.message);
  }
};