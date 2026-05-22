import express from "express";
import db from "../config/db.js";
import { sendOrderConfirmation, sendOrderStatusUpdate } from "../services/emailService.js";

const router = express.Router();

/* =========================
   CREATE ORDER
========================= */
router.post("/create", async (req, res) => {
  try {
    const {
      customer_id,
      customer_name,
      restaurant_id,
      restaurant_name,
      status,
      total,
      original_total,
      delivery_address,
      items,
      delivery_fee,
      notes,
      payment_status,
      payment_transaction_id,
      promo_code,
      discount_applied
    } = req.body;

    console.log("Creating order with data:", { 
      customer_id, restaurant_id, total, delivery_address, 
      itemsCount: items?.length,
      payment_status,
      payment_transaction_id,
      promo_code,
      discount_applied
    });

    if (!customer_id || !restaurant_id || !total || !delivery_address) {
      return res.status(400).json({ 
        message: "Missing required fields: customer_id, restaurant_id, total, delivery_address" 
      });
    }

    const result = await db.query(
      `INSERT INTO orders 
       (customer_id, customer_name, restaurant_id, restaurant_name, status, total, 
        original_total, delivery_address, delivery_fee, notes, payment_status, 
        payment_transaction_id, promo_code, discount_applied, reviewed, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()) RETURNING id`,
      [customer_id, customer_name || 'Customer', restaurant_id, restaurant_name, 
       status || 'pending', total, original_total || total, delivery_address, 
       delivery_fee || 0, notes || null, payment_status || 'pending', 
       payment_transaction_id || null, promo_code || null, discount_applied || 0, false]
    );

    const orderId = result.rows[0].id;
    console.log(`Order created with ID: ${orderId}`);

    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const menuItemId = item.id || item.menu_item_id;
        const itemName = item.name;
        const quantity = item.quantity || 1;
        const price = parseFloat(item.price) || 0;
        
        await db.query(
          `INSERT INTO order_items 
           (order_id, menu_item_id, name, quantity, price) 
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, menuItemId, itemName, quantity, price]
        );
      }
    } else {
      let defaultItem = { id: 101, name: 'Menu Item', price: total };
      if (restaurant_id == 1) defaultItem = { id: 101, name: 'Classic Cheeseburger', price: total };
      if (restaurant_id == 2) defaultItem = { id: 201, name: 'Margherita Pizza', price: total };
      if (restaurant_id == 3) defaultItem = { id: 301, name: 'California Roll', price: total };
      
      await db.query(
        `INSERT INTO order_items 
         (order_id, menu_item_id, name, quantity, price) 
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, defaultItem.id, defaultItem.name, 1, defaultItem.price]
      );
    }

    try {
      const customer = await db.query("SELECT email, name FROM users WHERE id = $1", [customer_id]);
      if (customer.rows[0]?.email) {
        const newOrder = await db.query("SELECT * FROM orders WHERE id = $1", [orderId]);
        const orderItems = await db.query("SELECT * FROM order_items WHERE order_id = $1", [orderId]);
        const orderWithItems = { ...newOrder.rows[0], items: orderItems.rows };
        
        sendOrderConfirmation(orderWithItems, customer.rows[0].email, customer.rows[0].name || customer_name);
      }
    } catch (emailErr) {
      console.error("Failed to send email:", emailErr);
    }

    res.status(201).json({ 
      success: true, 
      orderId: orderId,
      message: "Order placed successfully",
      payment_status: payment_status || 'pending'
    });

  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ 
      message: "Failed to create order", 
      error: err.message 
    });
  }
});

/* =========================
   GET ALL ORDERS (ADMIN)
========================= */
router.get("/", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT o.*, 
              u.name as customer_name,
              r.name as restaurant_name
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       ORDER BY o.created_at DESC`
    );
    res.json(results.rows || []);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Error fetching orders", error: err.message });
  }
});

/* =========================
   CUSTOMER ORDERS
========================= */
router.get("/customer/:customer_id", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT o.*, 
              r.name as restaurant_name,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.customer_id = $1 
       ORDER BY o.created_at DESC`,
      [req.params.customer_id]
    );
    
    const ordersWithItems = await Promise.all(results.rows.map(async (order) => {
      const items = await db.query("SELECT * FROM order_items WHERE order_id = $1", [order.id]);
      return { ...order, items: items.rows };
    }));
    
    res.json(ordersWithItems || []);
  } catch (err) {
    console.error("Error fetching customer orders:", err);
    res.status(500).json({ message: "Error fetching customer orders" });
  }
});

/* =========================
   AVAILABLE ORDERS (for drivers to see and accept)
========================= */
router.get("/available", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT o.*, 
              u.name as customer_name,
              r.name as restaurant_name,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE (o.driver_id IS NULL OR o.driver_id = 0) AND o.status = 'pending' 
       ORDER BY o.created_at DESC`
    );
    res.json(results.rows || []);
  } catch (err) {
    console.error("Error fetching available orders:", err);
    res.json([]);
  }
});

/* =========================
   DRIVER ORDERS (assigned/accepted)
========================= */
router.get("/driver/:id", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT o.*, 
              u.name as customer_name,
              r.name as restaurant_name,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.driver_id = $1 
       ORDER BY o.created_at DESC`,
      [req.params.id]
    );
    res.json(results.rows || []);
  } catch (err) {
    console.error("Error fetching driver orders:", err);
    res.json([]);
  }
});
/* =========================
   ADMIN ASSIGNS DRIVER TO ORDER (offers trip)
   URL: PUT /api/orders/assign/:id
   IMPORTANT: Place this BEFORE the /:id route
========================= */
router.put("/assign/:id", async (req, res) => {
  try {
    const { driver_id } = req.body;
    const orderId = req.params.id;
    const io = req.app.get("io");

    console.log(`👑 Admin assigning driver ${driver_id} to order ${orderId}`);

    if (!driver_id) {
      return res.status(400).json({ message: "driver_id is required" });
    }

    // Check if order exists and is available
    const orderCheck = await db.query(
      "SELECT * FROM orders WHERE id = $1 AND (driver_id IS NULL OR driver_id = 0) AND status = 'pending'",
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found or already assigned" });
    }

    const order = orderCheck.rows[0];

    // Check if driver exists and is approved
    const driverCheck = await db.query(
      "SELECT * FROM users WHERE id = $1 AND role = 'driver' AND driver_status = 'approved'",
      [driver_id]
    );
    
    if (driverCheck.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found or not approved" });
    }

    // Assign driver to order (status remains pending until driver accepts)
    await db.query(
      "UPDATE orders SET driver_id = $1 WHERE id = $2",
      [driver_id, orderId]
    );

    // Notify driver via socket that they have been offered an order
    if (io) {
      io.to(`driver_${driver_id}`).emit("order-offered", {
        orderId: parseInt(orderId),
        restaurantName: order.restaurant_name,
        customerAddress: order.delivery_address,
        orderTotal: order.total,
        message: "You have been offered a delivery trip!"
      });
    }

    res.json({ 
      message: "Order offered to driver successfully",
      orderId: orderId,
      driverId: driver_id
    });
  } catch (err) {
    console.error("Error assigning driver:", err);
    res.status(500).json({ message: "Error assigning driver" });
  }
});
/* =========================
   DRIVER ACCEPTS ORDER (from available list)
   URL: PUT /api/orders/accept/:id
========================= */
router.put("/accept/:id", async (req, res) => {
  try {
    const { driver_id } = req.body;
    const orderId = req.params.id;
    const io = req.app.get("io");

    console.log(`🚚 Driver ${driver_id} accepting order ${orderId}`);

    if (!driver_id) {
      return res.status(400).json({ message: "driver_id is required" });
    }

    // Check if order exists and is available
    const orderCheck = await db.query(
      "SELECT * FROM orders WHERE id = $1 AND (driver_id IS NULL OR driver_id = 0) AND status = 'pending'",
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found or already accepted" });
    }

    const order = orderCheck.rows[0];

    // Check if driver exists and is approved
    const driverCheck = await db.query(
      "SELECT * FROM users WHERE id = $1 AND role = 'driver' AND driver_status = 'approved'",
      [driver_id]
    );
    
    if (driverCheck.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found or not approved" });
    }

    // Update order with driver and change status to confirmed
    await db.query(
      "UPDATE orders SET driver_id = $1, status = 'confirmed' WHERE id = $2",
      [driver_id, orderId]
    );

    // Notify admin and customer via socket
    io.to(`order_${orderId}`).emit("order-accepted", {
      orderId: parseInt(orderId),
      driverId: driver_id,
      status: "confirmed",
      message: "A driver has accepted your order",
    });

    res.json({ 
      message: "Order accepted successfully",
      orderId: orderId
    });
  } catch (err) {
    console.error("Error accepting order:", err);
    res.status(500).json({ message: "Error accepting order" });
  }
});

/* =========================
   ADMIN ASSIGNS DRIVER TO ORDER (offers trip)
   URL: PUT /api/orders/assign/:id
========================= */
router.put("/assign/:id", async (req, res) => {
  try {
    const { driver_id } = req.body;
    const orderId = req.params.id;
    const io = req.app.get("io");

    console.log(`👑 Admin assigning driver ${driver_id} to order ${orderId}`);

    if (!driver_id) {
      return res.status(400).json({ message: "driver_id is required" });
    }

    const orderCheck = await db.query(
      "SELECT * FROM orders WHERE id = $1 AND (driver_id IS NULL OR driver_id = 0) AND status = 'pending'",
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found or already assigned" });
    }

    const order = orderCheck.rows[0];

    const driverCheck = await db.query(
      "SELECT * FROM users WHERE id = $1 AND role = 'driver' AND driver_status = 'approved'",
      [driver_id]
    );
    
    if (driverCheck.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found or not approved" });
    }

    // Assign driver to order (status remains pending until driver accepts)
    await db.query(
      "UPDATE orders SET driver_id = $1 WHERE id = $2",
      [driver_id, orderId]
    );

    // Notify driver via socket that they have been offered an order
    io.to(`driver_${driver_id}`).emit("order-offered", {
      orderId: parseInt(orderId),
      restaurantName: order.restaurant_name,
      customerAddress: order.delivery_address,
      orderTotal: order.total,
      message: "You have been offered a delivery trip!"
    });

    res.json({ 
      message: "Order offered to driver successfully",
      orderId: orderId,
      driverId: driver_id
    });
  } catch (err) {
    console.error("Error assigning driver:", err);
    res.status(500).json({ message: "Error assigning driver" });
  }
});

/* =========================
   UPDATE ORDER STATUS (DRIVER)
   URL: PUT /api/orders/status/:id
========================= */
router.put("/status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    const io = req.app.get("io");

    const prevOrder = await db.query("SELECT status, driver_id FROM orders WHERE id = $1", [orderId]);
    if (prevOrder.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const previousStatus = prevOrder.rows[0]?.status;
    const driverId = prevOrder.rows[0]?.driver_id;

    await db.query("UPDATE orders SET status = $1 WHERE id = $2", [status, orderId]);

    io.to(`order_${orderId}`).emit("order-status-update", {
      orderId: parseInt(orderId),
      status: status,
      timestamp: new Date(),
    });

    // Send email for status changes
    if (status !== previousStatus && status !== 'pending') {
      try {
        const orderData = await db.query(
          `SELECT o.*, u.email, u.name as customer_name 
           FROM orders o 
           LEFT JOIN users u ON o.customer_id = u.id 
           WHERE o.id = $1`,
          [orderId]
        );
        if (orderData.rows[0]?.email) {
          const items = await db.query("SELECT * FROM order_items WHERE order_id = $1", [orderId]);
          const orderWithItems = { ...orderData.rows[0], items: items.rows };
          sendOrderStatusUpdate(orderWithItems, orderData.rows[0].email, orderData.rows[0].customer_name, previousStatus, status);
        }
      } catch (emailErr) {
        console.error("Failed to send status email:", emailErr);
      }
    }

    // Calculate earnings when delivered
    if (status === "delivered") {
      const orders = await db.query(
        "SELECT total, delivery_fee FROM orders WHERE id = $1",
        [orderId]
      );
      
      const order = orders.rows[0];
      if (order && driverId) {
        const earning = (order.delivery_fee || 0) + (order.total * 0.1);
        await db.query("UPDATE orders SET driver_earning = $1 WHERE id = $2", [earning, orderId]);
        await db.query("UPDATE users SET earnings = earnings + $1 WHERE id = $2", [earning, driverId]);

        io.to(`driver_${driverId}`).emit("earnings-updated", {
          orderId: parseInt(orderId),
          earning: earning,
        });
      }
    }
    
    res.json({ message: "Status updated successfully", status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating status" });
  }
});

/* =========================
   CANCEL ORDER
========================= */
router.put("/cancel/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { customer_id } = req.body;
    const io = req.app.get("io");

    const orders = await db.query(
      "SELECT * FROM orders WHERE id = $1 AND customer_id = $2 AND status IN ('pending', 'confirmed')",
      [orderId, customer_id]
    );

    if (orders.rows.length === 0) {
      return res.status(400).json({ 
        message: "Order cannot be cancelled. Only pending or confirmed orders can be cancelled." 
      });
    }

    await db.query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [orderId]);

    io.to(`order_${orderId}`).emit("order-status-update", {
      orderId: parseInt(orderId),
      status: "cancelled",
      timestamp: new Date(),
    });

    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error cancelling order" });
  }
});

/* =========================
   REVIEWS - CREATE
========================= */
router.post("/reviews/create", async (req, res) => {
  try {
    const { order_id, restaurant_id, driver_id, customer_id, rating, comment, type } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const orderCheck = await db.query(
      "SELECT * FROM orders WHERE id = $1 AND customer_id = $2",
      [order_id, customer_id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or unauthorized' });
    }

    const order = orderCheck.rows[0];

    if (order.reviewed) {
      return res.status(400).json({ error: 'Order already reviewed' });
    }

    const result = await db.query(
      `INSERT INTO reviews 
       (order_id, restaurant_id, driver_id, customer_id, rating, comment, type, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
       RETURNING *`,
      [order_id, restaurant_id, driver_id, customer_id, rating, comment || null, type || 'restaurant']
    );

    await db.query("UPDATE orders SET reviewed = true WHERE id = $1", [order_id]);

    if (type === 'driver' && driver_id) {
      const driverReviews = await db.query(
        "SELECT rating FROM reviews WHERE driver_id = $1 AND type = 'driver'",
        [driver_id]
      );
      
      if (driverReviews.rows.length > 0) {
        const avgRating = driverReviews.rows.reduce((sum, r) => sum + r.rating, 0) / driverReviews.rows.length;
        await db.query("UPDATE users SET driver_rating = $1 WHERE id = $2", [avgRating, driver_id]);
      }
    }

    res.status(201).json({ 
      success: true, 
      review: result.rows[0],
      message: "Thank you for your review!"
    });
  } catch (err) {
    console.error("Error creating review:", err);
    res.status(500).json({ error: 'Failed to submit review', details: err.message });
  }
});

/* =========================
   GET REVIEWS FOR RESTAURANT
========================= */
router.get("/reviews/restaurant/:restaurantId", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT r.*, u.name as customer_name 
       FROM reviews r
       LEFT JOIN users u ON r.customer_id = u.id
       WHERE r.restaurant_id = $1 AND r.type = 'restaurant'
       ORDER BY r.created_at DESC`,
      [req.params.restaurantId]
    );
    res.json(results.rows || []);
  } catch (err) {
    console.error("Error fetching restaurant reviews:", err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/* =========================
   GET REVIEWS FOR DRIVER
========================= */
router.get("/reviews/driver/:driverId", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT r.*, u.name as customer_name 
       FROM reviews r
       LEFT JOIN users u ON r.customer_id = u.id
       WHERE r.driver_id = $1 AND r.type = 'driver'
       ORDER BY r.created_at DESC`,
      [req.params.driverId]
    );
    res.json(results.rows || []);
  } catch (err) {
    console.error("Error fetching driver reviews:", err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/* =========================
   CHECK IF ORDER HAS REVIEW
========================= */
router.get("/reviews/order/:orderId", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT reviewed FROM orders WHERE id = $1",
      [req.params.orderId]
    );
    res.json({ reviewed: result.rows[0]?.reviewed || false });
  } catch (err) {
    console.error("Error checking review status:", err);
    res.status(500).json({ error: 'Failed to check review status' });
  }
});

/* =========================
   GET SINGLE ORDER - THIS MUST BE THE LAST ROUTE
========================= */
router.get("/:id", async (req, res) => {
  try {
    const orders = await db.query(
      `SELECT o.*, 
              u.name as customer_name,
              u.email as customer_email,
              r.name as restaurant_name,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.id = $1`,
      [req.params.id]
    );
    
    if (orders.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const order = orders.rows[0];
    const items = await db.query("SELECT * FROM order_items WHERE order_id = $1", [req.params.id]);
    
    res.json({
      id: order.id,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      restaurant_id: order.restaurant_id,
      restaurant_name: order.restaurant_name,
      total: order.total,
      status: order.status,
      delivery_address: order.delivery_address,
      delivery_fee: order.delivery_fee,
      created_at: order.created_at,
      driver_id: order.driver_id,
      driver_earning: order.driver_earning,
      notes: order.notes,
      payment_status: order.payment_status,
      reviewed: order.reviewed,
      original_total: order.original_total,
      promo_code: order.promo_code,
      discount_applied: order.discount_applied,
      item_count: order.item_count,
      items: items.rows.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: (item.price * item.quantity)
      }))
    });
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ message: "Error fetching order", error: err.message });
  }
});

export default router;