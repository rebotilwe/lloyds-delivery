import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply vendor authentication to all routes
router.use(verifyToken);
router.use(authorizeRoles("vendor"));

// Get vendor's restaurant
router.get("/restaurant", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM restaurants WHERE owner_id = $1",
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No restaurant found" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get orders for vendor's restaurant
router.get("/orders", async (req, res) => {
  try {
    // First get vendor's restaurant
    const restaurant = await db.query(
      "SELECT id FROM restaurants WHERE owner_id = $1",
      [req.user.id]
    );
    
    if (restaurant.rows.length === 0) {
      return res.json([]);
    }
    
    const restaurantId = restaurant.rows[0].id;
    
    // Get orders with items
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
           ELSE 5
         END,
         o.created_at DESC`,
      [restaurantId]
    );
    
    // Get items for each order
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
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update order status (vendor)
router.put("/orders/:id/status", async (req, res) => {
  try {
    const { status, estimated_prep_time, rejection_reason } = req.body;
    const orderId = req.params.id;
    const io = req.app.get("io");
    
    // Check if this order belongs to vendor's restaurant
    const restaurant = await db.query(
      "SELECT id FROM restaurants WHERE owner_id = $1",
      [req.user.id]
    );
    
    if (restaurant.rows.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    
    const orderCheck = await db.query(
      "SELECT * FROM orders WHERE id = $1 AND restaurant_id = $2",
      [orderId, restaurant.rows[0].id]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const order = orderCheck.rows[0];
    const previousStatus = order.status;
    
    // Update order
    await db.query(
      `UPDATE orders 
       SET status = $1, 
           estimated_prep_time = COALESCE($2, estimated_prep_time),
           rejection_reason = COALESCE($3, rejection_reason)
       WHERE id = $4`,
      [status, estimated_prep_time, rejection_reason, orderId]
    );
    
    // Notify via socket
    io.to(`order_${orderId}`).emit("order-status-update", {
      orderId: parseInt(orderId),
      status: status,
      previousStatus: previousStatus,
      timestamp: new Date(),
    });
    
    // If vendor accepts order (confirmed), notify drivers
    if (status === "confirmed") {
      io.emit("order-ready-for-driver", {
        orderId: parseInt(orderId),
        restaurantName: order.restaurant_name,
        pickupAddress: order.delivery_address,
        orderTotal: order.total,
      });
    }
    
    // If vendor rejects order
    if (status === "rejected") {
      // Notify customer
      io.to(`order_${orderId}`).emit("order-rejected", {
        orderId: parseInt(orderId),
        reason: rejection_reason || "Restaurant cannot fulfill this order",
      });
    }
    
    res.json({ 
      message: "Order status updated successfully",
      status: status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get vendor's menu items
router.get("/menu", async (req, res) => {
  try {
    const restaurant = await db.query(
      "SELECT id FROM restaurants WHERE owner_id = $1",
      [req.user.id]
    );
    
    if (restaurant.rows.length === 0) {
      return res.json([]);
    }
    
    const menuItems = await db.query(
      "SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY category, name",
      [restaurant.rows[0].id]
    );
    
    res.json(menuItems.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add menu item (vendor)
router.post("/menu", async (req, res) => {
  try {
    const { name, description, price, category, image_url } = req.body;
    
    const restaurant = await db.query(
      "SELECT id FROM restaurants WHERE owner_id = $1",
      [req.user.id]
    );
    
    if (restaurant.rows.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    
    const result = await db.query(
      `INSERT INTO menu_items 
       (restaurant_id, name, description, price, category, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [restaurant.rows[0].id, name, description, price, category, image_url]
    );
    
    res.status(201).json({ 
      id: result.rows[0].id,
      message: "Menu item added successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update menu item
router.put("/menu/:id", async (req, res) => {
  try {
    const { name, description, price, category, image_url } = req.body;
    const menuItemId = req.params.id;
    
    const restaurant = await db.query(
      "SELECT id FROM restaurants WHERE owner_id = $1",
      [req.user.id]
    );
    
    if (restaurant.rows.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    
    await db.query(
      `UPDATE menu_items 
       SET name = $1, description = $2, price = $3, category = $4, image_url = $5
       WHERE id = $6 AND restaurant_id = $7`,
      [name, description, price, category, image_url, menuItemId, restaurant.rows[0].id]
    );
    
    res.json({ message: "Menu item updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete menu item
router.delete("/menu/:id", async (req, res) => {
  try {
    const menuItemId = req.params.id;
    
    const restaurant = await db.query(
      "SELECT id FROM restaurants WHERE owner_id = $1",
      [req.user.id]
    );
    
    if (restaurant.rows.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    
    await db.query(
      "DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2",
      [menuItemId, restaurant.rows[0].id]
    );
    
    res.json({ message: "Menu item deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update vendor settings
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
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get vendor analytics
router.get("/analytics", async (req, res) => {
  try {
    const restaurant = await db.query(
      "SELECT id FROM restaurants WHERE owner_id = $1",
      [req.user.id]
    );
    
    if (restaurant.rows.length === 0) {
      return res.json({});
    }
    
    const restaurantId = restaurant.rows[0].id;
    
    // Get today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = await db.query(
      "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders WHERE restaurant_id = $1 AND created_at >= $2",
      [restaurantId, today]
    );
    
    // Get pending orders count
    const pendingOrders = await db.query(
      "SELECT COUNT(*) FROM orders WHERE restaurant_id = $1 AND status = 'pending'",
      [restaurantId]
    );
    
    // Get completed orders this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyOrders = await db.query(
      "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders WHERE restaurant_id = $1 AND status = 'delivered' AND created_at >= $2",
      [restaurantId, weekAgo]
    );
    
    res.json({
      today: {
        orders: parseInt(todayOrders.rows[0].count),
        revenue: parseFloat(todayOrders.rows[0].revenue)
      },
      pending: parseInt(pendingOrders.rows[0].count),
      weekly: {
        orders: parseInt(weeklyOrders.rows[0].count),
        revenue: parseFloat(weeklyOrders.rows[0].revenue)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;