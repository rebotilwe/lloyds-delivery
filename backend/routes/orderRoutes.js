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
    console.log(`✅ Order created with ID: ${orderId}`);

    // Insert order items
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const menuItemId = item.id || item.menu_item_id;
        const itemName = item.name;
        const quantity = item.quantity || 1;
        const price = parseFloat(item.price) || 0;
        
        let finalMenuItemId = null;
        if (menuItemId) {
          const menuItemCheck = await db.query(
            "SELECT id FROM menu_items WHERE id = $1",
            [menuItemId]
          );
          if (menuItemCheck.rows.length > 0) {
            finalMenuItemId = menuItemId;
          }
        }
        
        await db.query(
          `INSERT INTO order_items 
           (order_id, menu_item_id, name, quantity, price) 
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, finalMenuItemId, itemName, quantity, price]
        );
      }
    }

    // Notify vendor about new order
    const io = req.app.get("io");
    try {
      const restaurant = await db.query(
        "SELECT owner_id FROM restaurants WHERE id = $1",
        [restaurant_id]
      );

      if (restaurant.rows[0]?.owner_id && io) {
        io.to(`vendor_${restaurant.rows[0].owner_id}`).emit("new-order", {
          orderId: orderId,
          orderTotal: total,
          customerName: customer_name,
          itemsCount: items?.length || 0,
          timestamp: new Date(),
        });
        console.log(`🔔 Notified vendor ${restaurant.rows[0].owner_id} about order ${orderId}`);
      }
    } catch (notifyErr) {
      console.error("Failed to notify vendor:", notifyErr.message);
    }

    // Send email confirmation
    try {
      const customer = await db.query("SELECT email, name FROM users WHERE id = $1", [customer_id]);
      if (customer.rows[0]?.email) {
        const newOrder = await db.query("SELECT * FROM orders WHERE id = $1", [orderId]);
        const orderItems = await db.query("SELECT * FROM order_items WHERE order_id = $1", [orderId]);
        const orderWithItems = { ...newOrder.rows[0], items: orderItems.rows };
        
        sendOrderConfirmation(orderWithItems, customer.rows[0].email, customer.rows[0].name || customer_name)
          .catch(emailErr => console.error("Email error:", emailErr.message));
      }
    } catch (emailErr) {
      console.error("Failed to send email:", emailErr.message);
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
   AVAILABLE ORDERS FOR DRIVERS
   Only shows orders that are READY FOR PICKUP
========================= */
router.get("/available", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT o.*, 
              u.name as customer_name,
              u.phone as customer_phone,
              r.name as restaurant_name,
              r.address as restaurant_address,
              r.latitude as restaurant_lat,
              r.longitude as restaurant_lng,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE (o.driver_id IS NULL OR o.driver_id = 0) 
         AND o.status = 'ready_for_pickup'
       ORDER BY o.created_at ASC`
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
              u.phone as customer_phone,
              r.name as restaurant_name,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.driver_id = $1 
       ORDER BY o.created_at DESC`,
      [req.params.id]
    );
    
    const ordersWithItems = await Promise.all(results.rows.map(async (order) => {
      const items = await db.query("SELECT * FROM order_items WHERE order_id = $1", [order.id]);
      return { ...order, items: items.rows };
    }));
    
    res.json(ordersWithItems || []);
  } catch (err) {
    console.error("Error fetching driver orders:", err);
    res.json([]);
  }
});

/* =========================
   DRIVER ACCEPTS ORDER - UPDATED with driver_name and vendor notification
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

    // Check if order exists and is ready for pickup
    const orderCheck = await db.query(
      `SELECT o.*, r.name as restaurant_name, r.owner_id
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.id = $1 AND (o.driver_id IS NULL OR o.driver_id = 0) AND o.status = 'ready_for_pickup'`,
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found or already taken" });
    }

    const order = orderCheck.rows[0];

    // Check if driver exists and is approved
    const driverCheck = await db.query(
      "SELECT id, name, email FROM users WHERE id = $1 AND role = 'driver' AND driver_status = 'approved'",
      [driver_id]
    );
    
    if (driverCheck.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found or not approved" });
    }

    const driver = driverCheck.rows[0];

    // Update order with driver name and status
    await db.query(
      "UPDATE orders SET driver_id = $1, driver_name = $2, status = 'picked_up' WHERE id = $3",
      [driver_id, driver.name, orderId]
    );

    // Notify customer via socket
    io.to(`order_${orderId}`).emit("order-status-update", {
      orderId: parseInt(orderId),
      status: "picked_up",
      driverId: driver_id,
      driverName: driver.name,
      message: "Driver is on the way to pickup your order",
    });

    // Notify vendor that driver accepted the order
    if (order.owner_id) {
      io.to(`vendor_${order.owner_id}`).emit("order-accepted-by-driver", {
        orderId: parseInt(orderId),
        driverId: driver_id,
        driverName: driver.name,
        status: "picked_up",
        timestamp: new Date(),
      });
      console.log(`📢 Notified vendor ${order.owner_id}: Driver ${driver.name} accepted order #${orderId}`);
    }

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
      "SELECT * FROM orders WHERE id = $1 AND (driver_id IS NULL OR driver_id = 0) AND status = 'ready_for_pickup'",
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found or already assigned" });
    }

    const order = orderCheck.rows[0];

    const driverCheck = await db.query(
      "SELECT id, name FROM users WHERE id = $1 AND role = 'driver' AND driver_status = 'approved'",
      [driver_id]
    );
    
    if (driverCheck.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found or not approved" });
    }

    const driver = driverCheck.rows[0];

    await db.query(
      "UPDATE orders SET driver_id = $1, driver_name = $2, status = 'picked_up' WHERE id = $3",
      [driver_id, driver.name, orderId]
    );

    io.to(`driver_${driver_id}`).emit("order-offered", {
      orderId: parseInt(orderId),
      restaurantName: order.restaurant_name,
      customerAddress: order.delivery_address,
      orderTotal: order.total,
      message: "You have been assigned a delivery trip!"
    });

    res.json({ 
      message: "Order assigned to driver successfully",
      orderId: orderId,
      driverId: driver_id
    });
  } catch (err) {
    console.error("Error assigning driver:", err);
    res.status(500).json({ message: "Error assigning driver" });
  }
});

/* =========================
   UPDATE ORDER STATUS (DRIVER) - UPDATED with delivery notification to vendor
========================= */
router.put("/status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    const io = req.app.get("io");

    // Get order details including vendor owner_id
    const prevOrder = await db.query(
      `SELECT o.*, r.owner_id 
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.id = $1`,
      [orderId]
    );
    
    if (prevOrder.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const previousStatus = prevOrder.rows[0]?.status;
    const driverId = prevOrder.rows[0]?.driver_id;
    const vendorId = prevOrder.rows[0]?.owner_id;

    await db.query("UPDATE orders SET status = $1 WHERE id = $2", [status, orderId]);

    // Notify customer via socket
    io.to(`order_${orderId}`).emit("order-status-update", {
      orderId: parseInt(orderId),
      status: status,
      timestamp: new Date(),
    });

    // Notify vendor when order is delivered
    if (status === "delivered" && vendorId && io) {
      io.to(`vendor_${vendorId}`).emit("order-delivered", {
        orderId: parseInt(orderId),
        timestamp: new Date(),
      });
      console.log(`📢 Notified vendor ${vendorId}: Order #${orderId} has been delivered`);
    }

    // Send email for status changes
    if (status !== previousStatus && status !== 'pending') {
      (async () => {
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
            await sendOrderStatusUpdate(orderWithItems, orderData.rows[0].email, orderData.rows[0].customer_name, previousStatus, status);
          }
        } catch (emailErr) {
          console.error("Failed to send status email:", emailErr.message);
        }
      })();
    }

    // Calculate earnings when delivered
    if (status === "delivered") {
      const orders = await db.query(
        "SELECT total, delivery_fee FROM orders WHERE id = $1",
        [orderId]
      );
      
      const order = orders.rows[0];
      if (order && driverId) {
        const deliveryFee = parseFloat(order.delivery_fee) || 0;
        const total = parseFloat(order.total) || 0;
        
        const commission = total * 0.1;
        const earning = deliveryFee + commission;
        const finalEarning = Math.round(earning * 100) / 100;
        
        await db.query(
          "UPDATE orders SET driver_earning = $1 WHERE id = $2", 
          [finalEarning, orderId]
        );
        
        await db.query(
          "UPDATE users SET earnings = COALESCE(earnings, 0) + $1 WHERE id = $2", 
          [finalEarning, driverId]
        );

        io.to(`driver_${driverId}`).emit("earnings-updated", {
          orderId: parseInt(orderId),
          earning: finalEarning,
        });
      }
    }
    
    res.json({ message: "Status updated successfully", status });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ message: "Error updating status", error: err.message });
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
   GET SINGLE ORDER
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
      driver_name: order.driver_name,
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

/* =========================
   UPDATE ORDER PAYMENT STATUS
========================= */
router.put("/:id/payment", async (req, res) => {
  try {
    const { payment_status, payment_transaction_id } = req.body;
    const orderId = req.params.id;

    const result = await db.query(
      `UPDATE orders 
       SET payment_status = $1, 
           payment_transaction_id = COALESCE($2, payment_transaction_id)
       WHERE id = $3 
       RETURNING id`,
      [payment_status, payment_transaction_id, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Payment status updated", orderId });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   YOCO CHECKOUT - Create Payment Session
========================= */
router.post("/checkout", async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount || !orderId) {
      return res.status(400).json({ message: "Amount and orderId are required" });
    }

    console.log(`💰 Creating Yoco checkout for order #${orderId}, amount: R${amount}`);

    const response = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.YOCO_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: "ZAR",
        successUrl: `${process.env.FRONTEND_URL || 'https://lloyds-delivery.netlify.app'}/order-confirmation?orderId=${orderId}`,
        cancelUrl: `${process.env.FRONTEND_URL || 'https://lloyds-delivery.netlify.app'}/cart`,
        metadata: { 
          orderId: String(orderId) 
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Yoco checkout error:", data);
      return res.status(400).json({ 
        message: data.displayMessage || "Checkout failed. Please try again." 
      });
    }

    console.log(`✅ Yoco checkout created: ${data.id}`);
    res.json({ 
      redirectUrl: data.redirectUrl, 
      checkoutId: data.id 
    });

  } catch (error) {
    console.error("Yoco checkout error:", error);
    res.status(500).json({ message: "Payment service error. Please try again." });
  }
});

export default router;