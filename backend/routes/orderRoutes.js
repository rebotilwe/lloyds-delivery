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
      delivery_address,
      items,
      delivery_fee,
      notes
    } = req.body;

    console.log("Creating order with data:", { customer_id, restaurant_id, total, delivery_address, itemsCount: items?.length });

    // Validate required fields
    if (!customer_id || !restaurant_id || !total || !delivery_address) {
      return res.status(400).json({ 
        message: "Missing required fields: customer_id, restaurant_id, total, delivery_address" 
      });
    }

    // Insert order
    const [result] = await db.query(
      `INSERT INTO orders 
       (customer_id, customer_name, restaurant_id, restaurant_name, status, total, delivery_address, delivery_fee, notes, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [customer_id, customer_name || 'Customer', restaurant_id, restaurant_name, status || 'pending', total, delivery_address, delivery_fee || 0, notes || null]
    );

    const orderId = result.insertId;
    console.log(`Order created with ID: ${orderId}`);

    // Insert order items
    if (items && Array.isArray(items) && items.length > 0) {
      console.log(`Inserting ${items.length} items for order ${orderId}`);
      
      for (const item of items) {
        const menuItemId = item.id || item.menu_item_id;
        const itemName = item.name;
        const quantity = item.quantity || 1;
        const price = parseFloat(item.price) || 0;
        
        console.log(`Inserting item: ${itemName} x${quantity} @ R${price}`);
        
        await db.query(
          `INSERT INTO order_items 
           (order_id, menu_item_id, name, quantity, price) 
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, menuItemId, itemName, quantity, price]
        );
      }
      console.log(`✅ Successfully inserted ${items.length} items for order ${orderId}`);
    } else {
      console.warn(`⚠️ No items provided for order ${orderId}`);
      let defaultItem = { id: 101, name: 'Menu Item', price: total };
      if (restaurant_id === 1) defaultItem = { id: 101, name: 'Classic Cheeseburger', price: total };
      if (restaurant_id === 2) defaultItem = { id: 201, name: 'Margherita Pizza', price: total };
      if (restaurant_id === 3) defaultItem = { id: 301, name: 'California Roll', price: total };
      
      await db.query(
        `INSERT INTO order_items 
         (order_id, menu_item_id, name, quantity, price) 
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, defaultItem.id, defaultItem.name, 1, defaultItem.price]
      );
      console.log(`Added default item for order ${orderId}`);
    }

    // Send email confirmation (asynchronously - don't block response)
    try {
      const [customer] = await db.query("SELECT email, name FROM users WHERE id = ?", [customer_id]);
      if (customer[0]?.email) {
        const [newOrder] = await db.query("SELECT * FROM orders WHERE id = ?", [orderId]);
        const [orderItems] = await db.query("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
        const orderWithItems = { ...newOrder[0], items: orderItems };
        
        // Don't await - let it run in background
        sendOrderConfirmation(orderWithItems, customer[0].email, customer[0].name || customer_name);
      }
    } catch (emailErr) {
      console.error("Failed to send email:", emailErr);
      // Don't fail the order if email fails
    }

    res.status(201).json({ 
      success: true, 
      orderId: orderId,
      message: "Order placed successfully" 
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
    const [results] = await db.query(
      `SELECT o.*, 
              u.name as customer_name,
              r.name as restaurant_name
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       ORDER BY o.created_at DESC`
    );
    console.log('Fetched orders from DB:', results.length);
    res.json(results || []);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Error fetching orders", error: err.message });
  }
});

/* =========================
   CUSTOMER ORDERS - SPECIFIC ROUTE (BEFORE /:id)
========================= */
router.get("/customer/:customer_id", async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT o.*, 
              r.name as restaurant_name,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.customer_id = ? 
       ORDER BY o.created_at DESC`,
      [req.params.customer_id]
    );
    
    const ordersWithItems = await Promise.all(results.map(async (order) => {
      const [items] = await db.query(
        "SELECT * FROM order_items WHERE order_id = ?",
        [order.id]
      );
      return { ...order, items };
    }));
    
    res.json(ordersWithItems || []);
  } catch (err) {
    console.error("Error fetching customer orders:", err);
    res.status(500).json({ message: "Error fetching customer orders" });
  }
});

/* =========================
   AVAILABLE ORDERS - SPECIFIC ROUTE (BEFORE /:id)
========================= */
router.get("/available", async (req, res) => {
  try {
    const [results] = await db.query(
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
    console.log('Available orders found:', results.length);
    res.json(results || []);
  } catch (err) {
    console.error("Error fetching available orders:", err);
    res.json([]);
  }
});

/* =========================
   DRIVER ORDERS - SPECIFIC ROUTE (BEFORE /:id)
========================= */
router.get("/driver/:id", async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT o.*, 
              u.name as customer_name,
              r.name as restaurant_name,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.driver_id = ? 
       ORDER BY o.created_at DESC`,
      [req.params.id]
    );
    console.log('Driver orders found:', results.length);
    res.json(results || []);
  } catch (err) {
    console.error("Error fetching driver orders:", err);
    res.json([]);
  }
});

/* =========================
   GET SINGLE ORDER - MUST BE LAST
========================= */
router.get("/:id", async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*, 
              u.name as customer_name,
              u.email as customer_email,
              r.name as restaurant_name,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.id = ?`,
      [req.params.id]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const order = orders[0];
    
    const [items] = await db.query(
      "SELECT * FROM order_items WHERE order_id = ?",
      [req.params.id]
    );
    
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
      driver_lat: order.driver_lat,
      driver_lng: order.driver_lng,
      driver_earning: order.driver_earning,
      notes: order.notes,
      item_count: order.item_count,
      items: items.map(item => ({
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
   ACCEPT ORDER
========================= */
router.put("/accept/:id", async (req, res) => {
  try {
    const { driver_id } = req.body;
    const io = req.app.get("io");
    
    const [result] = await db.query(
      "UPDATE orders SET driver_id = ?, status = 'confirmed' WHERE id = ? AND (driver_id IS NULL OR driver_id = 0)",
      [driver_id, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ message: "Order already accepted or not available" });
    }
    
    // Emit real-time update
    io.to(`order_${req.params.id}`).emit("order-accepted", {
      orderId: parseInt(req.params.id),
      driverId: driver_id,
      message: "A driver has accepted your order",
    });
    
    res.json({ message: "Order accepted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error accepting order" });
  }
});

/* =========================
   UPDATE STATUS + EARNINGS
========================= */
router.put("/status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    const io = req.app.get("io");

    // Get previous status before updating
    const [prevOrder] = await db.query("SELECT status FROM orders WHERE id = ?", [orderId]);
    const previousStatus = prevOrder[0]?.status;

    await db.query("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);

    // EMIT REAL-TIME UPDATE TO ALL LISTENERS
    io.to(`order_${orderId}`).emit("order-status-update", {
      orderId: parseInt(orderId),
      status: status,
      timestamp: new Date(),
    });

    // If order is confirmed, also notify driver
    if (status === "confirmed") {
      const [orders] = await db.query("SELECT driver_id FROM orders WHERE id = ?", [orderId]);
      if (orders[0]?.driver_id) {
        io.to(`driver_${orders[0].driver_id}`).emit("order-accepted", {
          orderId: parseInt(orderId),
          message: "New order assigned to you",
        });
      }
    }

    // Send email notification for status change (skip for earnings calculation part)
    if (status !== "delivered" && previousStatus !== status) {
      try {
        const [orderData] = await db.query(
          `SELECT o.*, u.email, u.name as customer_name 
           FROM orders o 
           LEFT JOIN users u ON o.customer_id = u.id 
           WHERE o.id = ?`,
          [orderId]
        );
        if (orderData[0]?.email) {
          const [items] = await db.query("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
          const orderWithItems = { ...orderData[0], items };
          // Don't await - let it run in background
          sendOrderStatusUpdate(orderWithItems, orderData[0].email, orderData[0].customer_name, previousStatus, status);
        }
      } catch (emailErr) {
        console.error("Failed to send status email:", emailErr);
      }
    }

    // Calculate earnings if delivered
    if (status === "delivered") {
      const [orders] = await db.query(
        "SELECT total, delivery_fee, driver_id FROM orders WHERE id = ?",
        [orderId]
      );
      
      const order = orders[0];
      if (order && order.driver_id) {
        const earning = (order.delivery_fee || 0) + (order.total * 0.1);
        await db.query("UPDATE orders SET driver_earning = ? WHERE id = ?", [earning, orderId]);
        await db.query("UPDATE users SET earnings = earnings + ? WHERE id = ?", [earning, order.driver_id]);

        // Notify driver about earnings
        io.to(`driver_${order.driver_id}`).emit("earnings-updated", {
          orderId: parseInt(orderId),
          earning: earning,
        });

        return res.json({ message: "Order delivered & earnings updated", earning });
      }
    }
    
    res.json({ message: "Status updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating status" });
  }
});

/* =========================
   CANCEL ORDER (Customer)
========================= */
router.put("/cancel/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { customer_id } = req.body;
    const io = req.app.get("io");

    // Check if order belongs to customer and is cancellable
    const [orders] = await db.query(
      "SELECT * FROM orders WHERE id = ? AND customer_id = ? AND status IN ('pending', 'confirmed')",
      [orderId, customer_id]
    );

    if (orders.length === 0) {
      return res.status(400).json({ 
        message: "Order cannot be cancelled. Only pending or confirmed orders can be cancelled." 
      });
    }

    await db.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId]);

    // Emit real-time update
    io.to(`order_${orderId}`).emit("order-status-update", {
      orderId: parseInt(orderId),
      status: "cancelled",
      timestamp: new Date(),
    });

    // Send cancellation email
    try {
      const [orderData] = await db.query(
        `SELECT o.*, u.email, u.name as customer_name 
         FROM orders o 
         LEFT JOIN users u ON o.customer_id = u.id 
         WHERE o.id = ?`,
        [orderId]
      );
      if (orderData[0]?.email) {
        const [items] = await db.query("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
        const orderWithItems = { ...orderData[0], items };
        sendOrderStatusUpdate(orderWithItems, orderData[0].email, orderData[0].customer_name, 'pending', 'cancelled');
      }
    } catch (emailErr) {
      console.error("Failed to send cancellation email:", emailErr);
    }

    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error cancelling order" });
  }
});

export default router;