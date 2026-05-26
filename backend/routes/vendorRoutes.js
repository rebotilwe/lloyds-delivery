import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.use(authorizeRoles("vendor"));

/* =========================
   HELPER: GET VENDOR RESTAURANT
========================= */
const getVendorRestaurant = async (vendorId) => {
  const result = await db.query(
    `SELECT id, name, owner_id, address, latitude, longitude
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
    const restaurant = await getVendorRestaurant(req.user.id);

    if (!restaurant) {
      return res.status(404).json({ message: "No restaurant found" });
    }

    res.json(restaurant);
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    res.status(500).json({ message: "Server error" });
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
       WHERE restaurant_id = $1 AND status = 'pending'`,
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

    res.json({
      today: {
        orders: parseInt(todayOrders.rows[0].count),
        revenue: parseFloat(todayOrders.rows[0].revenue),
      },
      pending: parseInt(pendingOrders.rows[0].count),
      weekly: {
        orders: parseInt(weeklyOrders.rows[0].count),
        revenue: parseFloat(weeklyOrders.rows[0].revenue),
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   UPDATE ORDER STATUS (VENDOR)
   This is the CRITICAL route - when vendor marks ready_for_pickup, notify drivers
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

    const orderCheck = await db.query(
      `SELECT o.*, r.name as restaurant_name, r.address as restaurant_address,
              r.latitude as restaurant_lat, r.longitude as restaurant_lng
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.id = $1 AND o.restaurant_id = $2`,
      [orderId, restaurant.id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderCheck.rows[0];
    const previousStatus = order.status;

    await db.query(
      `UPDATE orders
       SET status = $1,
           estimated_prep_time = COALESCE($2, estimated_prep_time),
           rejection_reason = COALESCE($3, rejection_reason)
       WHERE id = $4`,
      [status, estimated_prep_time, rejection_reason, orderId]
    );

    // Notify customer via socket
    if (io) {
      io.to(`order_${orderId}`).emit("order-status-update", {
        orderId: parseInt(orderId),
        status,
        previousStatus,
        timestamp: new Date(),
      });
    }

    // CRITICAL: When vendor marks order as ready_for_pickup, notify ALL drivers
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
      
      // Emit to all connected drivers (broadcast)
      io.emit("order-ready-for-driver", notificationData);
      console.log(`📢 Broadcast to drivers: Order #${orderId} is ready for pickup`);
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
      `SELECT * FROM menu_items 
       WHERE restaurant_id = $1 
       ORDER BY category, name`,
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

    const result = await db.query(
      `INSERT INTO menu_items 
       (restaurant_id, name, description, price, category, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [restaurant.id, name, description, price, category, image_url]
    );

    res.status(201).json({ 
      id: result.rows[0].id,
      message: "Menu item added successfully"
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

    await db.query(
      `UPDATE menu_items 
       SET name = $1, description = $2, price = $3, category = $4, image_url = $5
       WHERE id = $6 AND restaurant_id = $7`,
      [name, description, price, category, image_url, menuItemId, restaurant.id]
    );

    res.json({ message: "Menu item updated successfully" });
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
      operating_hours,
      delivery_radius,
      min_order_amount,
      delivery_fee
    } = req.body;

    // Check if vendor already has a restaurant
    const existing = await db.query(
      "SELECT id FROM restaurants WHERE owner_id = $1",
      [req.user.id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "You already have a restaurant setup" });
    }

    const result = await db.query(
      `INSERT INTO restaurants 
       (name, description, cuisine_type, address, phone, operating_hours, 
        delivery_radius, min_order_amount, delivery_fee, owner_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
       RETURNING id`,
      [
        name, description, cuisine_type, address, phone, 
        JSON.stringify(operating_hours), delivery_radius, min_order_amount, 
        delivery_fee, req.user.id
      ]
    );

    console.log(`✅ Restaurant created for vendor ${req.user.id}: ${name}`);
    
    res.json({ 
      success: true, 
      restaurant_id: result.rows[0].id,
      message: "Restaurant setup successfully"
    });
  } catch (error) {
    console.error("Error setting up restaurant:", error);
    res.status(500).json({ message: "Failed to setup restaurant", error: error.message });
  }
});

export default router;