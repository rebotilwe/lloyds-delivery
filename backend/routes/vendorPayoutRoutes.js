import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==================== VENDOR: Get earnings summary ====================
router.get("/earnings-summary", verifyToken, authorizeRoles("vendor"), async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    const result = await db.query(
      `SELECT 
         COALESCE(vendor_total_earnings, 0) as total_earned,
         COALESCE(vendor_available_balance, 0) as available_balance,
         COALESCE(vendor_withdrawn_total, 0) as withdrawn_total
       FROM users 
       WHERE id = $1`,
      [vendorId]
    );
    
    const payouts = await db.query(
      `SELECT * FROM vendor_payouts
       WHERE vendor_id = $1
       ORDER BY requested_at DESC
       LIMIT 20`,
      [vendorId]
    );
    
    res.json({
      summary: result.rows[0] || {},
      payout_history: payouts.rows || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== VENDOR: Request withdrawal ====================
router.post("/request-withdrawal", verifyToken, authorizeRoles("vendor"), async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { amount, bank_name, account_holder, account_number, branch_code } = req.body;
    
    const vendorResult = await db.query(
      "SELECT vendor_available_balance FROM users WHERE id = $1",
      [vendorId]
    );
    
    const availableBalance = parseFloat(vendorResult.rows[0]?.vendor_available_balance || 0);
    
    if (amount < 100) {
      return res.status(400).json({ message: "Minimum withdrawal amount is R100" });
    }
    
    if (amount > availableBalance) {
      return res.status(400).json({ 
        message: `Amount exceeds available balance. Available: R${availableBalance.toFixed(2)}` 
      });
    }
    
    // Get or update bank details
    if (bank_name && account_number) {
      await db.query(
        `UPDATE users SET 
           bank_name = COALESCE($1, bank_name),
           bank_account_name = COALESCE($2, bank_account_name),
           bank_account_number = COALESCE($3, bank_account_number),
           bank_branch_code = COALESCE($4, bank_branch_code)
         WHERE id = $5`,
        [bank_name, account_holder, account_number, branch_code, vendorId]
      );
    }
    
    const userBank = await db.query(
      `SELECT bank_name, bank_account_name as account_holder, 
              bank_account_number as account_number, bank_branch_code as branch_code
       FROM users WHERE id = $1`,
      [vendorId]
    );
    
    const bankDetails = userBank.rows[0] || {};
    
    const result = await db.query(
      `INSERT INTO vendor_payouts 
       (vendor_id, amount, status, bank_name, account_holder, account_number, branch_code, requested_at)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6, NOW())
       RETURNING id`,
      [vendorId, amount, bankDetails.bank_name, bankDetails.account_holder, 
       bankDetails.account_number, bankDetails.branch_code]
    );
    
    // Reduce available balance
    await db.query(
      "UPDATE users SET vendor_available_balance = vendor_available_balance - $1 WHERE id = $2",
      [amount, vendorId]
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

// ==================== VENDOR: Get withdrawal history ====================
router.get("/withdrawal-history", verifyToken, authorizeRoles("vendor"), async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    const history = await db.query(
      `SELECT * FROM vendor_payouts
       WHERE vendor_id = $1
       ORDER BY requested_at DESC`,
      [vendorId]
    );
    
    res.json(history.rows || []);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// ==================== ADMIN: Get all vendor payouts ====================
router.get("/admin/payouts", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const results = await db.query(
      `SELECT vp.*, u.name as vendor_name, u.email as vendor_email,
              a.name as processed_by_name
       FROM vendor_payouts vp
       LEFT JOIN users u ON vp.vendor_id = u.id
       LEFT JOIN users a ON vp.processed_by = a.id
       ORDER BY vp.created_at DESC`
    );
    res.json(results.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== ADMIN: Create vendor payout ====================
router.post("/admin/payouts", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { vendor_id, amount, period_start, period_end, notes } = req.body;
    const adminId = req.user.id;
    
    const vendorResult = await db.query(
      "SELECT vendor_available_balance FROM users WHERE id = $1 AND role = 'vendor'",
      [vendor_id]
    );
    
    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    
    const availableBalance = parseFloat(vendorResult.rows[0].vendor_available_balance || 0);
    
    if (amount > availableBalance) {
      return res.status(400).json({ 
        message: `Amount exceeds vendor's available balance of R${availableBalance.toFixed(2)}` 
      });
    }
    
    const result = await db.query(
      `INSERT INTO vendor_payouts 
       (vendor_id, amount, period_start, period_end, notes, processed_by, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
       RETURNING id`,
      [vendor_id, amount, period_start, period_end, notes || null, adminId]
    );
    
    res.json({ 
      success: true, 
      payoutId: result.rows[0].id,
      message: "Vendor payout created successfully" 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// ==================== ADMIN: Process vendor payout ====================
router.put("/admin/payouts/:id/process", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reference_number, notes } = req.body;
    const adminId = req.user.id;
    
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
      
      // Get the payout amount and vendor_id to update vendor's withdrawn total
      const payoutResult = await db.query(
        "SELECT vendor_id, amount FROM vendor_payouts WHERE id = $1",
        [id]
      );
      
      if (payoutResult.rows.length > 0) {
        const { vendor_id, amount } = payoutResult.rows[0];
        await db.query(
          "UPDATE users SET vendor_withdrawn_total = COALESCE(vendor_withdrawn_total, 0) + $1 WHERE id = $2",
          [amount, vendor_id]
        );
      }
    }
    
    queryParams.push(id);
    
    const query = `UPDATE vendor_payouts 
                   SET ${updateFields.join(", ")} 
                   WHERE id = $${paramIndex}
                   RETURNING id`;
    
    const result = await db.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Payout not found" });
    }
    
    res.json({ message: `Vendor payout ${status}`, payoutId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

export default router;