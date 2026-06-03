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

// ==================== DRIVER ONBOARDING ====================
router.post(
  "/onboarding",
  upload.fields([
    { name: "id_copy", maxCount: 1 },
    { name: "pdp", maxCount: 1 },
    { name: "profile_photo", maxCount: 1 },
    { name: "car_license", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { userId, car_info } = req.body;
      const files = req.files;

      console.log("📝 Processing driver application for userId:", userId);

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Parse car info
      let car = {};
      try {
        car = typeof car_info === 'string' ? JSON.parse(car_info) : (car_info || {});
      } catch (e) {
        car = {};
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

        // Get public URL
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

      // Update database
      const sql = `
        UPDATE users 
        SET 
          driver_status = 'pending',
          id_copy = $1,
          pdp = $2,
          profile_photo = $3,
          car_license = $4,
          car_make = $5,
          car_model = $6,
          car_year = $7,
          car_color = $8,
          license_plate = $9
        WHERE id = $10
        RETURNING id
      `;

      const values = [
        fileUrls.id_copy,
        fileUrls.pdp,
        fileUrls.profile_photo,
        fileUrls.car_license || null,
        car?.make || null,
        car?.model || null,
        car?.year || null,
        car?.color || null,
        car?.license_plate || null,
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
    
    const earnings = await db.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending,
         COALESCE(SUM(CASE WHEN status = 'cleared' THEN amount ELSE 0 END), 0) as cleared,
         COALESCE(SUM(amount), 0) as total
       FROM driver_earnings
       WHERE driver_id = $1`,
      [driverId]
    );
    
    const paidOut = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM driver_payouts
       WHERE driver_id = $1 AND status = 'paid'`,
      [driverId]
    );
    
    const recentEarnings = await db.query(
      `SELECT de.*, o.restaurant_name, o.id as order_id
       FROM driver_earnings de
       JOIN orders o ON de.order_id = o.id
       WHERE de.driver_id = $1
       ORDER BY de.created_at DESC
       LIMIT 20`,
      [driverId]
    );
    
    const payouts = await db.query(
      `SELECT * FROM driver_payouts
       WHERE driver_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [driverId]
    );
    
    res.json({
      summary: {
        pending_balance: parseFloat(earnings.rows[0].pending),
        available_balance: parseFloat(earnings.rows[0].cleared),
        total_earned: parseFloat(earnings.rows[0].total),
        total_paid: parseFloat(paidOut.rows[0].total),
        pending_payout: parseFloat(earnings.rows[0].cleared) - parseFloat(paidOut.rows[0].total)
      },
      recent_earnings: recentEarnings.rows,
      payout_history: payouts.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== DRIVER REQUEST WITHDRAWAL ====================
router.post("/request-withdrawal", verifyToken, authorizeRoles("driver"), async (req, res) => {
  try {
    const driverId = req.user.id;
    const { amount, bank_name, account_holder, account_number, branch_code } = req.body;
    
    // Check available balance
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
    
    // Save bank details if provided
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
    
    // Get bank details from user
    const userBank = await db.query(
      `SELECT bank_name, bank_account_name as account_holder, 
              bank_account_number as account_number, bank_branch_code as branch_code
       FROM users WHERE id = $1`,
      [driverId]
    );
    
    const bankDetails = userBank.rows[0] || {};
    
    // Create withdrawal request
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
    const history = await db.query(
      `SELECT * FROM driver_payouts
       WHERE driver_id = $1
       ORDER BY requested_at DESC`,
      [driverId]
    );
    res.json(history.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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

// ==================== ADMIN: PROCESS PAYOUT ====================
router.put("/admin/payouts/:id/process", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reference_number, notes } = req.body;
    const adminId = req.user.id;
    
    await db.query(
      `UPDATE driver_payouts 
       SET status = $1, 
           reference_number = COALESCE($2, reference_number),
           notes = COALESCE($3, notes),
           processed_at = NOW(),
           processed_by = $4
       WHERE id = $5`,
      [status, reference_number, notes, adminId, id]
    );
    
    res.json({ message: `Withdrawal ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;