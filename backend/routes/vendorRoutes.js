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
    `SELECT id, name, owner_id
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
   GET VENDOR ORDERS (FIXED)
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
      `SELECT * FROM orders
       WHERE id = $1 AND restaurant_id = $2`,
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

    if (io) {
      io.to(`order_${orderId}`).emit("order-status-update", {
        orderId: parseInt(orderId),
        status,
        previousStatus,
        timestamp: new Date(),
      });
    }

    res.json({ message: "Order updated", status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;