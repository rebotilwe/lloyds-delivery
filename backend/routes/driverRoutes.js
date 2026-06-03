import express from "express";
import multer from "multer";
import { createClient } from '@supabase/supabase-js';
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Use memory storage (don't save to disk)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDF files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

// In driverRoutes.js, update the onboarding POST endpoint
router.post(
  "/onboarding",
  upload.fields([
    { name: "id_copy", maxCount: 1 },
    { name: "pdp", maxCount: 1 },
    { name: "profile_photo", maxCount: 1 },
    { name: "car_license", maxCount: 1 },
    { name: "vehicle_registration", maxCount: 1 }, // Add for cars
  ]),
  async (req, res) => {
    try {
      const { userId, car_info, vehicle_type } = req.body; // Add vehicle_type
      const files = req.files;

      console.log("📝 Processing driver application for userId:", userId);
      console.log("Vehicle type:", vehicle_type);

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Parse vehicle info (bike or car)
      let vehicleInfo = {};
      try {
        vehicleInfo = typeof car_info === 'string' ? JSON.parse(car_info) : (car_info || {});
      } catch (e) {
        vehicleInfo = {};
      }

      // Upload each file to Supabase Storage
      const fileUrls = {};
      const BUCKET_NAME = 'driver-docs';

      for (const [fieldName, fileArray] of Object.entries(files)) {
        const file = fileArray[0];
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}/${fieldName}-${Date.now()}.${fileExt}`;
        
        console.log(`📤 Uploading ${fieldName} to Supabase...`);
        
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          console.error(`Upload error for ${fieldName}:`, error);
          throw error;
        }

        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(fileName);
        
        fileUrls[fieldName] = publicUrl;
        console.log(`✅ Uploaded ${fieldName}: ${publicUrl}`);
      }

      // Check required files
      if (!fileUrls.id_copy || !fileUrls.pdp || !fileUrls.profile_photo) {
        return res.status(400).json({ message: "Missing required files" });
      }

      // Update database with vehicle_type
      const sql = `
        UPDATE users 
        SET 
          driver_status = 'pending',
          vehicle_type = $1,
          id_copy = $2,
          pdp = $3,
          profile_photo = $4,
          car_license = $5,
          car_make = $6,
          car_model = $7,
          car_year = $8,
          car_color = $9,
          license_plate = $10,
          vehicle_engine_cc = $11,
          vehicle_registration = $12
        WHERE id = $13
        RETURNING id
      `;

      const values = [
        vehicle_type || 'bike',  // vehicle_type
        fileUrls.id_copy,
        fileUrls.pdp,
        fileUrls.profile_photo,
        fileUrls.car_license || null,
        vehicleInfo?.make || null,
        vehicleInfo?.model || null,
        vehicleInfo?.year || null,
        vehicleInfo?.color || null,
        vehicleInfo?.license_plate || null,
        vehicleInfo?.engine_cc || null,  // For bikes
        fileUrls.vehicle_registration || null,  // For cars
        userId,
      ];

      const result = await db.query(sql, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("✅ Driver application submitted successfully");

      return res.json({
        success: true,
        message: "Driver application submitted successfully",
      });

    } catch (error) {
      console.error("❌ Error:", error);
      return res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);
// ==================== DRIVER EARNINGS SUMMARY ====================
router.get("/earnings-summary", verifyToken, authorizeRoles("driver"), async (req, res) => {
  try {
    const driverId = req.user.id;
    
    // Get earnings directly from users table (the source of truth)
    const userResult = await db.query(
      `SELECT 
         COALESCE(total_earnings, 0) as total_earned,
         COALESCE(available_balance, 0) as available_balance,
         COALESCE(pending_balance, 0) as pending_balance,
         COALESCE(withdrawn_total, 0) as withdrawn_total
       FROM users 
       WHERE id = $1`,
      [driverId]
    );
    
    const userData = userResult.rows[0] || {};
    
    // Get pending earnings from driver_earnings table (if it exists)
    let pendingEarnings = 0;
    try {
      const earningsTableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'driver_earnings'
        )
      `);
      
      if (earningsTableExists.rows[0].exists) {
        const earningsResult = await db.query(
          `SELECT COALESCE(SUM(amount), 0) as pending
           FROM driver_earnings
           WHERE driver_id = $1 AND status = 'pending'`,
          [driverId]
        );
        pendingEarnings = parseFloat(earningsResult.rows[0]?.pending || 0);
      }
    } catch (err) {
      console.log("driver_earnings table not found or error:", err.message);
    }
    
    // Calculate pending payout (available balance that hasn't been requested yet)
    const pendingPayout = Math.max(0, userData.available_balance - userData.withdrawn_total);
    
    res.json({
      summary: {
        pending_balance: pendingEarnings,
        available_balance: parseFloat(userData.available_balance || 0),
        total_earned: parseFloat(userData.total_earned || 0),
        withdrawn_total: parseFloat(userData.withdrawn_total || 0),  // ← CHANGED: use withdrawn_total
        pending_payout: pendingPayout
      },
      recent_earnings: [],
      payout_history: []
    });
  } catch (err) {
    console.error("Earnings summary error:", err);
    res.json({
      summary: {
        pending_balance: 0,
        available_balance: 0,
        total_earned: 0,
        withdrawn_total: 0,  // ← CHANGED
        pending_payout: 0
      },
      recent_earnings: [],
      payout_history: []
    });
  }
});
// ==================== DRIVER REQUEST WITHDRAWAL ====================
router.post("/request-withdrawal", verifyToken, authorizeRoles("driver"), async (req, res) => {
  try {
    const driverId = req.user.id;
    const { amount, bank_name, account_holder, account_number, branch_code } = req.body;
    
    const earnings = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM driver_earnings
       WHERE driver_id = $1 AND status = 'cleared'`,
      [driverId]
    );
    
    const paidOut = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM driver_payouts
       WHERE driver_id = $1 AND status = 'paid'`,
      [driverId]
    );
    
    const available = parseFloat(earnings.rows[0].total) - parseFloat(paidOut.rows[0].total);
    
    if (amount < 50) {
      return res.status(400).json({ message: "Minimum withdrawal amount is R50" });
    }
    
    if (amount > available) {
      return res.status(400).json({ 
        message: `Amount exceeds available balance. Available: R${available.toFixed(2)}` 
      });
    }
    
    if (bank_name && account_number) {
      await db.query(
        `UPDATE users SET 
           bank_name = COALESCE($1, bank_name),
           bank_account_name = COALESCE($2, bank_account_name),
           bank_account_number = COALESCE($3, bank_account_number),
           bank_branch_code = COALESCE($4, bank_branch_code)
         WHERE id = $5`,
        [bank_name, account_holder, account_number, branch_code, driverId]
      );
    }
    
    const userBank = await db.query(
      `SELECT bank_name, bank_account_name as account_holder, 
              bank_account_number as account_number, bank_branch_code as branch_code
       FROM users WHERE id = $1`,
      [driverId]
    );
    
    const bankDetails = userBank.rows[0] || {};
    
    const result = await db.query(
      `INSERT INTO driver_payouts 
       (driver_id, amount, status, bank_name, account_holder, account_number, branch_code, requested_at)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6, NOW())
       RETURNING id`,
      [driverId, amount, bankDetails.bank_name, bankDetails.account_holder, 
       bankDetails.account_number, bankDetails.branch_code]
    );
    
    res.json({ 
      success: true, 
      withdrawalId: result.rows[0].id,
      message: "Withdrawal request submitted successfully" 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== DRIVER WITHDRAWAL HISTORY ====================
router.get("/withdrawal-history", verifyToken, authorizeRoles("driver"), async (req, res) => {
  try {
    const driverId = req.user.id;
    
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'driver_payouts'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      return res.json([]);
    }
    
    const history = await db.query(
      `SELECT * FROM driver_payouts
       WHERE driver_id = $1
       ORDER BY requested_at DESC`,
      [driverId]
    );
    
    res.json(history.rows || []);
  } catch (err) {
    console.error("Withdrawal history error:", err);
    res.json([]);
  }
});

// ==================== DRIVER BANK DETAILS ====================
router.get("/bank-details", verifyToken, authorizeRoles("driver"), async (req, res) => {
  try {
    const driverId = req.user.id;
    const result = await db.query(
      `SELECT bank_name, bank_account_name as account_holder, 
              bank_account_number as account_number, bank_branch_code as branch_code
       FROM users WHERE id = $1`,
      [driverId]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/bank-details", verifyToken, authorizeRoles("driver"), async (req, res) => {
  try {
    const driverId = req.user.id;
    const { bank_name, account_holder, account_number, branch_code } = req.body;
    
    await db.query(
      `UPDATE users SET 
         bank_name = $1, 
         bank_account_name = $2, 
         bank_account_number = $3, 
         bank_branch_code = $4
       WHERE id = $5`,
      [bank_name, account_holder, account_number, branch_code, driverId]
    );
    
    res.json({ message: "Bank details saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== ADMIN: GET ALL PAYOUTS ====================
router.get("/admin/payouts", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const results = await db.query(
      `SELECT p.*, u.name as driver_name, u.email as driver_email,
              a.name as processed_by_name
       FROM driver_payouts p
       LEFT JOIN users u ON p.driver_id = u.id
       LEFT JOIN users a ON p.processed_by = a.id
       ORDER BY p.created_at DESC`
    );
    res.json(results.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== ADMIN: CREATE PAYOUT ====================
router.post("/admin/payouts", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { driver_id, amount, period_start, period_end, notes } = req.body;
    const adminId = req.user.id;
    
    console.log("📝 Creating payout for driver:", driver_id, "Amount:", amount);
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    
    const result = await db.query(
      `INSERT INTO driver_payouts 
       (driver_id, amount, period_start, period_end, notes, processed_by, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
       RETURNING id`,
      [driver_id, amount, period_start, period_end, notes || null, adminId]
    );
    
    console.log("✅ Payout created with ID:", result.rows[0].id);
    
    res.json({ 
      success: true, 
      payoutId: result.rows[0].id,
      message: "Payout created successfully" 
    });
  } catch (err) {
    console.error("Create payout error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// ==================== ADMIN: PROCESS PAYOUT ====================
// ==================== ADMIN: PROCESS PAYOUT ====================
// ==================== ADMIN: PROCESS PAYOUT ====================
router.put("/admin/payouts/:id/process", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reference_number, notes } = req.body;
    const adminId = req.user.id;
    
    console.log("📝 Processing payout:", { id, status, reference_number, adminId });
    
    // Build update query dynamically based on available columns
    let updateFields = [];
    let queryParams = [];
    let paramIndex = 1;
    
    updateFields.push(`status = $${paramIndex++}`);
    queryParams.push(status);
    
    if (reference_number !== undefined) {
      updateFields.push(`reference_number = $${paramIndex++}`);
      queryParams.push(reference_number);
    }
    
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      queryParams.push(notes);
    }
    
    updateFields.push(`processed_by = $${paramIndex++}`);
    queryParams.push(adminId);
    
    if (status === 'paid') {
      updateFields.push(`paid_at = NOW()`);
    }
    
    // Don't use processed_at if it doesn't exist
    // processed_at column is optional
    
    queryParams.push(id);
    
    const query = `UPDATE driver_payouts 
                   SET ${updateFields.join(", ")} 
                   WHERE id = $${paramIndex}
                   RETURNING id`;
    
    const result = await db.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Payout not found" });
    }
    
    console.log(`✅ Payout ${id} updated to ${status}`);
    
    res.json({ message: `Withdrawal ${status}`, payoutId: id });
  } catch (err) {
    console.error("Process payout error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// ==================== ADMIN: MARK PAYOUT AS PAID (alternative endpoint for frontend compatibility) ====================
router.put("/admin/payouts/:id/mark-paid", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { reference_number, payment_method } = req.body;
    const adminId = req.user.id;
    
    await db.query(
      `UPDATE driver_payouts 
       SET status = 'paid', 
           reference_number = COALESCE($1, reference_number),
           payment_method = COALESCE($2, payment_method),
           paid_at = NOW(),
           processed_at = NOW(),
           processed_by = $3
       WHERE id = $4`,
      [reference_number, payment_method, adminId, id]
    );
    
    res.json({ message: "Payout marked as paid" });
  } catch (err) {
    console.error("Mark paid error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// ==================== ADMIN: GET DRIVER EARNINGS SUMMARY ====================
// ==================== ADMIN: GET DRIVER EARNINGS SUMMARY ====================
router.get("/earnings-summary/:driverId", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const userResult = await db.query(
      `SELECT 
         COALESCE(total_earnings, 0) as total_earnings,
         COALESCE(available_balance, 0) as available_balance,
         COALESCE(pending_balance, 0) as pending_balance,
         COALESCE(withdrawn_total, 0) as withdrawn_total
       FROM users 
       WHERE id = $1 AND role = 'driver'`,
      [driverId]
    );
    
    const userData = userResult.rows[0] || {};
    const availableBalance = parseFloat(userData.available_balance || 0);
    const totalEarned = parseFloat(userData.total_earnings || 0);
    const totalPaid = parseFloat(userData.withdrawn_total || 0);
    
    res.json({
      summary: {
        pending_balance: parseFloat(userData.pending_balance || 0),
        available_balance: availableBalance,
        total_earned: totalEarned,
        total_paid: totalPaid,
        pending_payout: Math.max(0, availableBalance - totalPaid)
      }
    });
  } catch (err) {
    console.error("Earnings summary error:", err);
    res.json({
      summary: {
        pending_balance: 0,
        available_balance: 0,
        total_earned: 0,
        total_paid: 0,
        pending_payout: 0
      }
    });
  }
});
export default router;