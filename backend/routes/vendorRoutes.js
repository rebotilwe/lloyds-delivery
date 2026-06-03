import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { sendOrderStatusUpdate, sendRefundEmail } from "../services/emailService.js";

const router = express.Router();

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
   HELPER: PROCESS REFUND WITH YOCO
========================= */
const processRefund = async (paymentTransactionId, amount) => {
  console.log(`💰 Processing refund for transaction: ${paymentTransactionId}, Amount: R${amount}`);
  
  // Simulate refund processing
  return {
    success: true,
    refundId: `ref_${Date.now()}`,
    message: "Refund processed successfully"
  };
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
    res.status(500).json({ message: "Server error" });
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
      delivery_fee,
      markup_percentage
    } = req.body;

    console.log("🏪 Setting up restaurant for vendor:", req.user.id);
    console.log("📦 Received data:", { name, address, phone, cuisine_type, markup_percentage });

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

    const numericMarkup = parseFloat(markup_percentage) || 12.5;
    
    if (numericMarkup < 10 || numericMarkup > 15) {
      return res.status(400).json({ message: "Markup percentage must be between 10% and 15%" });
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
        numericMarkup
      ]
    );

    console.log(`✅ Restaurant created: ID ${result.rows[0].id}, Name: ${name}, Markup: ${numericMarkup}%`);
    
    res.status(201).json({ 
      success: true, 
      restaurant_id: result.rows[0].id,
      markup_percentage: numericMarkup,
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
    console.log("🔍 Vendor ID:", req.user.id);

    const restaurant = await getVendorRestaurant(req.user.id);

    console.log("🏪 Restaurant found:", restaurant);

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
       ORDER BY 
         CASE o.status
           WHEN 'pending' THEN 1
           WHEN 'confirmed' THEN 2
           WHEN 'preparing' THEN 3
           WHEN 'ready_for_pickup' THEN 4
           WHEN 'picked_up' THEN 5
           WHEN 'on_the_way' THEN 6
           WHEN 'delivered' THEN 7
           ELSE 8
         END,
         o.created_at DESC`,
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
   ANALYTICS (UPDATED with vendor_amount)
========================= */
router.get("/analytics", async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req.user.id);

    if (!restaurant) return res.json({});

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Use vendor_amount instead of total for vendor revenue
    const todayOrders = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(vendor_amount), 0) as revenue
       FROM orders
       WHERE restaurant_id = $1 AND created_at >= $2 AND status = 'delivered'`,
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
      `SELECT COUNT(*) as count, COALESCE(SUM(vendor_amount), 0) as revenue
       FROM orders
       WHERE restaurant_id = $1 AND status = 'delivered' AND created_at >= $2`,
      [restaurant.id, weekAgo]
    );

    const totalRevenue = await db.query(
      `SELECT COALESCE(SUM(vendor_amount), 0) as total
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
   UPDATE ORDER STATUS (VENDOR) - WITH REFUND ON REJECTION
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

    // Get full order details including payment info and customer email
    const orderCheck = await db.query(
      `SELECT o.*, r.name as restaurant_name, r.address as restaurant_address,
              r.latitude as restaurant_lat, r.longitude as restaurant_lng,
              u.email as customer_email, u.name as customer_name
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       LEFT JOIN users u ON o.customer_id = u.id
       WHERE o.id = $1 AND o.restaurant_id = $2`,
      [orderId, restaurant.id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderCheck.rows[0];
    const previousStatus = order.status;

    // Check if this is a rejection of a paid order
    const isRejectionWithPayment = (status === 'rejected' && order.payment_status === 'paid');

    if (isRejectionWithPayment) {
      console.log(`🔄 Processing refund for rejected order #${orderId}`);
      
      try {
        // Process refund
        const refundResult = await processRefund(order.payment_transaction_id, order.total);
        
        if (refundResult.success) {
          // Update order with rejection reason and refund status
          await db.query(
            `UPDATE orders
             SET status = $1,
                 rejection_reason = $2,
                 payment_status = 'refunded',
                 refund_transaction_id = $3,
                 refunded_at = NOW()
             WHERE id = $4`,
            [status, rejection_reason, refundResult.refundId, orderId]
          );
          
          console.log(`✅ Refund processed for order #${orderId}`);
          
          // Send refund email to customer
          if (order.customer_email) {
            try {
              await sendRefundEmail(order, rejection_reason);
            } catch (emailErr) {
              console.error("Failed to send refund email:", emailErr.message);
            }
          }
          
          // Notify customer via socket about refund
          io.to(`order_${orderId}`).emit("order-refunded", {
            orderId: parseInt(orderId),
            amount: order.total,
            reason: rejection_reason,
            message: "Your order was rejected and a refund has been processed"
          });
          
          console.log(`✅ Order #${orderId} rejected and refund processed`);
        } else {
          throw new Error("Refund failed");
        }
      } catch (refundError) {
        console.error("❌ Refund failed:", refundError);
        
        // Still update order as rejected but mark for manual refund
        await db.query(
          `UPDATE orders
           SET status = $1,
               rejection_reason = $2,
               payment_status = 'refund_pending'
           WHERE id = $3`,
          [status, rejection_reason, orderId]
        );
        
        // Notify admin about failed refund
        io.emit("admin-alert", {
          type: "refund_failed",
          orderId: orderId,
          message: `Refund failed for order #${orderId}. Manual intervention required.`
        });
      }
    } else {
      // Normal status update (no refund needed)
      await db.query(
        `UPDATE orders
         SET status = $1,
             estimated_prep_time = COALESCE($2, estimated_prep_time),
             rejection_reason = COALESCE($3, rejection_reason)
         WHERE id = $4`,
        [status, estimated_prep_time, rejection_reason, orderId]
      );
    }

    // Notify customer via socket of status change
    if (io) {
      io.to(`order_${orderId}`).emit("order-status-update", {
        orderId: parseInt(orderId),
        status,
        previousStatus,
        rejectionReason: rejection_reason,
        timestamp: new Date(),
      });
    }

    // Notify drivers if order is ready for pickup
    if (status === 'ready_for_pickup' && io) {
      const notificationData = {
        orderId: parseInt(orderId),
        restaurantName: order.restaurant_name || restaurant.name,
        restaurantAddress: order.restaurant_address || restaurant.address,
        orderTotal: order.total,
        itemsCount: order.item_count || 0,
        customerName: order.customer_name,
        deliveryAddress: order.delivery_address,
        deliveryFee: order.delivery_fee,
        restaurantLat: order.restaurant_lat || restaurant.latitude,
        restaurantLng: order.restaurant_lng || restaurant.longitude,
        timestamp: new Date(),
      };
      
      io.emit("order-ready-for-driver", notificationData);
      console.log(`📢 Broadcast to drivers: Order #${orderId} is ready for pickup`);
    }

    res.json({ 
      message: isRejectionWithPayment ? "Order rejected and refund processed" : "Order updated", 
      status,
      refundProcessed: isRejectionWithPayment
    });
    
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* =========================
   GET VENDOR MENU (UPDATED with vendor price)
========================= */
router.get("/menu", async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req.user.id);
    if (!restaurant) {
      return res.json([]);
    }

    const menuItems = await db.query(
      `SELECT id, name, description, vendor_price, customer_price, price as display_price,
              category, image_url, is_available, markup_applied
       FROM menu_items 
       WHERE restaurant_id = $1 
       ORDER BY category, name`,
      [restaurant.id]
    );

    const formattedItems = menuItems.rows.map(item => ({
      ...item,
      vendor_price: parseFloat(item.vendor_price) || 0,
      customer_price: parseFloat(item.customer_price) || item.display_price,
      markup_applied: parseFloat(item.markup_applied) || restaurant.markup_percentage || 12.5
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   ADD MENU ITEM (UPDATED with markup)
========================= */
router.post("/menu", async (req, res) => {
  try {
    const { name, description, price, category, image_url } = req.body;
    
    const restaurant = await getVendorRestaurant(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const markupPercentage = parseFloat(restaurant.markup_percentage) || 12.5;
    const vendorPrice = parseFloat(price) || 0;
    const customerPrice = Math.ceil((vendorPrice * (1 + markupPercentage / 100)) * 100) / 100;

    const result = await db.query(
      `INSERT INTO menu_items 
       (restaurant_id, name, description, vendor_price, customer_price, price, category, image_url, markup_applied) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id`,
      [restaurant.id, name, description, vendorPrice, customerPrice, customerPrice, category, image_url, markupPercentage]
    );

    res.status(201).json({ 
      id: result.rows[0].id,
      vendor_price: vendorPrice,
      customer_price: customerPrice,
      message: "Menu item added successfully"
    });
  } catch (error) {
    console.error("Error adding menu item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   UPDATE MENU ITEM (UPDATED with markup)
========================= */
router.put("/menu/:id", async (req, res) => {
  try {
    const { name, description, price, category, image_url } = req.body;
    const menuItemId = req.params.id;
    
    const restaurant = await getVendorRestaurant(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const markupPercentage = parseFloat(restaurant.markup_percentage) || 12.5;
    const vendorPrice = parseFloat(price) || 0;
    const customerPrice = Math.ceil((vendorPrice * (1 + markupPercentage / 100)) * 100) / 100;

    await db.query(
      `UPDATE menu_items 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           vendor_price = $3,
           customer_price = $4,
           price = $4,
           category = COALESCE($5, category),
           image_url = COALESCE($6, image_url),
           markup_applied = $7
       WHERE id = $8 AND restaurant_id = $9`,
      [name, description, vendorPrice, customerPrice, category, image_url, markupPercentage, menuItemId, restaurant.id]
    );

    res.json({ 
      message: "Menu item updated successfully",
      vendor_price: vendorPrice,
      customer_price: customerPrice
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
   GET VENDOR SETTINGS
========================= */
router.get("/settings", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM vendor_settings WHERE vendor_id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        is_accepting_orders: true,
        max_prep_time: 30,
        auto_accept_orders: false,
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   UPDATE VENDOR SETTINGS
========================= */
router.put("/settings", async (req, res) => {
  try {
    const { is_accepting_orders, max_prep_time, auto_accept_orders } = req.body;

    await db.query(
      `INSERT INTO vendor_settings (vendor_id, is_accepting_orders, max_prep_time, auto_accept_orders, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (vendor_id) 
       DO UPDATE SET 
         is_accepting_orders = EXCLUDED.is_accepting_orders,
         max_prep_time = EXCLUDED.max_prep_time,
         auto_accept_orders = EXCLUDED.auto_accept_orders,
         updated_at = NOW()`,
      [req.user.id, is_accepting_orders, max_prep_time, auto_accept_orders]
    );

    res.json({ message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating settings:", error);
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
    console.error("Withdrawal request error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET VENDOR MARKUP SETTINGS
========================= */
router.get("/markup", async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    
    res.json({
      markup_percentage: restaurant.markup_percentage || 12.5,
      min_markup: 10,
      max_markup: 15,
      message: `Your items have a ${restaurant.markup_percentage || 12.5}% markup applied to customer prices`
    });
  } catch (err) {
    console.error("Markup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;