import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createClient } from '@supabase/supabase-js';
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { sendOrderStatusUpdate, sendRefundEmail } from "../services/emailService.js";

const router = express.Router();

// Initialize Supabase client (optional)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Ensure upload directory exists
const vendorDocUploadDir = path.join(process.cwd(), 'uploads', 'vendor-documents');
if (!fs.existsSync(vendorDocUploadDir)) {
  fs.mkdirSync(vendorDocUploadDir, { recursive: true });
}

// Configure multer for document uploads
const vendorDocumentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, vendorDocUploadDir);
  },
  filename: (req, file, cb) => {
    const { vendorId } = req.params;
    const { document_key } = req.body;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `vendor-${vendorId}-${document_key}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const vendorDocumentFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDF files are allowed'));
  }
};

const uploadVendorDocument = multer({ 
  storage: vendorDocumentStorage, 
  fileFilter: vendorDocumentFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Apply vendor authentication to all routes
router.use(verifyToken);
router.use(authorizeRoles("vendor"));

/* =========================
   HELPER: GET VENDOR RESTAURANT
========================= */
const getVendorRestaurant = async (vendorId) => {
  const result = await db.query(
    `SELECT id, name, owner_id, address, latitude, longitude, description, 
            cuisine_type, phone, delivery_fee, markup_percentage, is_active
     FROM restaurants
     WHERE owner_id = $1
     ORDER BY id ASC
     LIMIT 1`,
    [vendorId]
  );

  return result.rows[0] || null;
};

/* =========================
   GET RESTAURANT
========================= */
router.get("/restaurant", async (req, res) => {
  try {
    console.log("🔍 Checking restaurant for vendor:", req.user.id);
    const restaurant = await getVendorRestaurant(req.user.id);

    if (!restaurant) {
      console.log("⚠️ No restaurant found for vendor:", req.user.id);
      return res.status(404).json({ message: "No restaurant found" });
    }

    console.log("✅ Found restaurant:", restaurant.id);
    res.json(restaurant);
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

/* =========================
   SETUP RESTAURANT (After Approval)
========================= */
router.post("/setup-restaurant", async (req, res) => {
  try {
    const {
      name,
      description,
      cuisine_type,
      address,
      phone,
      delivery_fee
    } = req.body;

    console.log("🏪 Setting up restaurant for vendor:", req.user.id);
    console.log("📦 Received data:", { name, address, phone, cuisine_type });

    const existing = await db.query(
      "SELECT id FROM restaurants WHERE owner_id = $1",
      [req.user.id]
    );

    if (existing.rows.length > 0) {
      console.log("⚠️ Vendor already has a restaurant:", existing.rows[0].id);
      return res.status(400).json({ message: "You already have a restaurant setup" });
    }

    if (!name || !address) {
      return res.status(400).json({ message: "Restaurant name and address are required" });
    }

    const result = await db.query(
      `INSERT INTO restaurants 
       (name, description, cuisine_type, address, phone, delivery_fee, owner_id, markup_percentage, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
       RETURNING id`,
      [
        name, 
        description || null, 
        cuisine_type || null, 
        address, 
        phone || null, 
        delivery_fee || 20, 
        req.user.id,
        12.5
      ]
    );

    console.log(`✅ Restaurant created: ID ${result.rows[0].id}, Name: ${name}`);
    
    res.status(201).json({ 
      success: true, 
      restaurant_id: result.rows[0].id,
      markup_percentage: 12.5,
      message: "Restaurant setup successfully"
    });
  } catch (error) {
    console.error("❌ Error setting up restaurant:", error);
    res.status(500).json({ 
      message: "Failed to setup restaurant", 
      error: error.message 
    });
  }
});

/* =========================
   GET VENDOR ORDERS
========================= */
router.get("/orders", async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req.user.id);

    if (!restaurant) {
      return res.json([]);
    }

    const orders = await db.query(
      `SELECT o.*,
              u.name as customer_name,
              u.email as customer_email,
              u.phone as customer_phone,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       WHERE o.restaurant_id = $1
       ORDER BY o.created_at DESC`,
      [restaurant.id]
    );

    const ordersWithItems = await Promise.all(
      orders.rows.map(async (order) => {
        const items = await db.query(
          "SELECT * FROM order_items WHERE order_id = $1",
          [order.id]
        );
        return { ...order, items: items.rows };
      })
    );

    res.json(ordersWithItems);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* =========================
   ANALYTICS
========================= */
router.get("/analytics", async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req.user.id);

    if (!restaurant) return res.json({});

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
       FROM orders
       WHERE restaurant_id = $1 AND created_at >= $2`,
      [restaurant.id, today]
    );

    const pendingOrders = await db.query(
      `SELECT COUNT(*) FROM orders
       WHERE restaurant_id = $1 AND status IN ('pending', 'confirmed')`,
      [restaurant.id]
    );

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyOrders = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
       FROM orders
       WHERE restaurant_id = $1 AND status = 'delivered' AND created_at >= $2`,
      [restaurant.id, weekAgo]
    );

    const totalRevenue = await db.query(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM orders
       WHERE restaurant_id = $1 AND status = 'delivered'`,
      [restaurant.id]
    );

    res.json({
      today_orders: parseInt(todayOrders.rows[0].count),
      today_revenue: parseFloat(todayOrders.rows[0].revenue),
      pending_orders: parseInt(pendingOrders.rows[0].count),
      total_revenue: parseFloat(totalRevenue.rows[0].total),
      weekly_orders: parseInt(weeklyOrders.rows[0].count),
      weekly_revenue: parseFloat(weeklyOrders.rows[0].revenue),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   UPDATE ORDER STATUS
========================= */
router.put("/orders/:id/status", async (req, res) => {
  try {
    const { status, estimated_prep_time, rejection_reason } = req.body;
    const orderId = req.params.id;
    const io = req.app.get("io");

    const restaurant = await getVendorRestaurant(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const orderDetails = await db.query(
      "SELECT total FROM orders WHERE id = $1",
      [orderId]
    );
    
    const orderTotal = orderDetails.rows[0]?.total || 0;

    await db.query(
      `UPDATE orders
       SET status = $1,
           estimated_prep_time = COALESCE($2, estimated_prep_time),
           rejection_reason = COALESCE($3, rejection_reason)
       WHERE id = $4 AND restaurant_id = $5`,
      [status, estimated_prep_time, rejection_reason, orderId, restaurant.id]
    );

    if (io) {
      io.to(`order_${orderId}`).emit("order-status-update", {
        orderId: parseInt(orderId),
        status,
        timestamp: new Date(),
      });
    }

    if (status === 'ready_for_pickup' && io) {
      io.emit("order-ready-for-driver", {
        orderId: parseInt(orderId),
        restaurantName: restaurant.name,
        orderTotal: orderTotal,
        timestamp: new Date(),
      });
    }

    res.json({ message: "Order updated", status });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* =========================
   GET VENDOR MENU
========================= */
router.get("/menu", async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req.user.id);
    if (!restaurant) {
      return res.json([]);
    }

    const menuItems = await db.query(
      `SELECT m.*, 
              u.name as approved_by_name
       FROM menu_items m
       LEFT JOIN users u ON m.approved_by = u.id
       WHERE m.restaurant_id = $1 
       ORDER BY m.approval_status = 'pending' DESC, 
                m.approval_status = 'rejected' DESC,
                m.category, 
                m.name`,
      [restaurant.id]
    );

    res.json(menuItems.rows);
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   ADD MENU ITEM
========================= */
router.post("/menu", async (req, res) => {
  try {
    const { name, description, price, category, image_url } = req.body;
    
    const restaurant = await getVendorRestaurant(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const result = await db.query(
      `INSERT INTO menu_items 
       (restaurant_id, name, description, price, category, image_url, 
        approval_status, submitted_at, vendor_price, customer_price) 
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), $4, $4 * 1.125) 
       RETURNING id, name, approval_status`,
      [restaurant.id, name, description, price, category, image_url]
    );

    const io = req.app.get("io");
    if (io) {
      io.emit("admin-notification", {
        type: "menu_item_pending",
        itemId: result.rows[0].id,
        itemName: name,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        timestamp: new Date(),
      });
    }

    res.status(201).json({ 
      id: result.rows[0].id,
      approval_status: 'pending',
      message: "Menu item submitted for admin approval"
    });
  } catch (error) {
    console.error("Error adding menu item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   UPDATE MENU ITEM
========================= */
router.put("/menu/:id", async (req, res) => {
  try {
    const { name, description, price, category, image_url } = req.body;
    const menuItemId = req.params.id;
    
    const restaurant = await getVendorRestaurant(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const currentItem = await db.query(
      "SELECT approval_status FROM menu_items WHERE id = $1 AND restaurant_id = $2",
      [menuItemId, restaurant.id]
    );

    if (currentItem.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    const result = await db.query(
      `UPDATE menu_items 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           category = COALESCE($4, category),
           image_url = COALESCE($5, image_url),
           approval_status = 'pending',
           rejection_reason = NULL,
           approved_at = NULL,
           approved_by = NULL,
           submitted_at = NOW(),
           customer_price = COALESCE($3, price) * 1.125
       WHERE id = $6 AND restaurant_id = $7
       RETURNING id, name, approval_status`,
      [name, description, price, category, image_url, menuItemId, restaurant.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("admin-notification", {
        type: "menu_item_update_pending",
        itemId: menuItemId,
        itemName: name || currentItem.rows[0].name,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        timestamp: new Date(),
      });
    }

    res.json({ 
      message: "Menu item updated and submitted for re-approval",
      approval_status: 'pending'
    });
  } catch (error) {
    console.error("Error updating menu item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   DELETE MENU ITEM
========================= */
router.delete("/menu/:id", async (req, res) => {
  try {
    const menuItemId = req.params.id;
    
    const restaurant = await getVendorRestaurant(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const item = await db.query(
      "SELECT approval_status FROM menu_items WHERE id = $1 AND restaurant_id = $2",
      [menuItemId, restaurant.id]
    );

    if (item.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    if (item.rows[0].approval_status === 'approved') {
      return res.status(400).json({ 
        message: "Cannot delete approved items. Contact admin for removal." 
      });
    }

    await db.query(
      "DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2",
      [menuItemId, restaurant.id]
    );

    res.json({ message: "Menu item deleted successfully" });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET VENDOR EARNINGS SUMMARY
========================= */
router.get("/earnings-summary", async (req, res) => {
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
    
    res.json({ summary: result.rows[0] || {} });
  } catch (err) {
    console.error("Earnings summary error:", err);
    res.json({ summary: { total_earned: 0, available_balance: 0, withdrawn_total: 0 } });
  }
});

/* =========================
   GET VENDOR WITHDRAWAL HISTORY
========================= */
router.get("/withdrawal-history", async (req, res) => {
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
    console.error("Withdrawal history error:", err);
    res.json([]);
  }
});

/* =========================
   GET VENDOR BANK DETAILS
========================= */
router.get("/bank-details", async (req, res) => {
  try {
    const vendorId = req.user.id;
    const result = await db.query(
      `SELECT bank_name, bank_account_name as account_holder, 
              bank_account_number as account_number, bank_branch_code as branch_code
       FROM users WHERE id = $1`,
      [vendorId]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Bank details error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST VENDOR BANK DETAILS
========================= */
router.post("/bank-details", async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { bank_name, account_holder, account_number, branch_code } = req.body;
    
    await db.query(
      `UPDATE users SET 
         bank_name = COALESCE($1, bank_name),
         bank_account_name = COALESCE($2, bank_account_name),
         bank_account_number = COALESCE($3, bank_account_number),
         bank_branch_code = COALESCE($4, bank_branch_code)
       WHERE id = $5`,
      [bank_name, account_holder, account_number, branch_code, vendorId]
    );
    
    res.json({ message: "Bank details saved successfully" });
  } catch (err) {
    console.error("Save bank details error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   REQUEST VENDOR WITHDRAWAL
========================= */
router.post("/request-withdrawal", async (req, res) => {
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
    console.error("Withdrawal request error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== ADMIN: VENDOR DOCUMENT MANAGEMENT ====================

/* =========================
   ADMIN: UPLOAD VENDOR DOCUMENT
========================= */
router.post(
  "/admin/upload-document/:vendorId",
  verifyToken,
  authorizeRoles("admin"),
  uploadVendorDocument.single("file"),
  async (req, res) => {
    try {
      const { vendorId } = req.params;
      const { document_key } = req.body;
      const file = req.file;
      
      console.log(`📤 Admin uploading ${document_key} for vendor ${vendorId}`);
      
      if (!file || !vendorId || !document_key) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const allowedDocuments = [
        'health_certificate', 
        'halaal_certificate', 
        'business_license', 
        'vat_registration', 
        'bank_confirmation'
      ];
      
      if (!allowedDocuments.includes(document_key)) {
        return res.status(400).json({ message: "Invalid document key" });
      }
      
      // Construct the file URL
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/vendor-documents/${file.filename}`;
      
      // Update the vendor's record with the new document URL
      const result = await db.query(
        `UPDATE users SET ${document_key} = $1 WHERE id = $2 AND role = 'vendor' RETURNING id`,
        [fileUrl, vendorId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      console.log(`✅ Uploaded ${document_key} for vendor ${vendorId}`);
      
      res.json({ 
        success: true, 
        url: fileUrl,
        message: `${document_key} uploaded successfully`
      });
      
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Server error: " + err.message });
    }
  }
);

export default router;