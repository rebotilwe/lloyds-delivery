import express from "express";
import db from "../config/db.js";
import { sendOrderConfirmation, sendOrderStatusUpdate } from "../services/emailService.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Helper function to calculate distance (for nearby drivers)
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/* =========================
   CREATE ORDER (UPDATED with delivery_type and package support)
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
      discount_applied,
      required_vehicle_type,
      delivery_type,
      pickup_address,
      recipient_name,
      recipient_phone,
      package_description,
      package_weight,
      package_dimensions,
      requires_signature,
      is_fragile
    } = req.body;

    console.log("Creating order with data:", { 
      customer_id, restaurant_id, total, delivery_address, 
      itemsCount: items?.length,
      payment_status,
      required_vehicle_type,
      delivery_type
    });

    // For food deliveries, restaurant_id is required
    if (delivery_type === 'food' && !restaurant_id) {
      return res.status(400).json({ 
        message: "Restaurant ID is required for food deliveries" 
      });
    }

    if (!customer_id || !total || !delivery_address) {
      return res.status(400).json({ 
        message: "Missing required fields: customer_id, total, delivery_address" 
      });
    }

    // For package deliveries, status should be pending_approval
    const initialStatus = delivery_type === 'food' ? (status || 'pending') : 'pending_approval';

    const result = await db.query(
      `INSERT INTO orders 
       (customer_id, customer_name, restaurant_id, restaurant_name, status, total, 
        original_total, delivery_address, delivery_fee, notes, payment_status, 
        payment_transaction_id, promo_code, discount_applied, required_vehicle_type, 
        delivery_type, pickup_address, recipient_name, recipient_phone, 
        package_description, package_weight, package_dimensions, 
        requires_signature, is_fragile, reviewed, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
               $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW()) RETURNING id`,
      [
        customer_id, 
        customer_name || 'Customer', 
        restaurant_id || null, 
        restaurant_name || (delivery_type !== 'food' ? 'Package Delivery' : null), 
        initialStatus,
        total, 
        original_total || total, 
        delivery_address, 
        delivery_fee || 0, 
        notes || null, 
        payment_status || 'pending', 
        payment_transaction_id || null, 
        promo_code || null, 
        discount_applied || 0,
        required_vehicle_type || 'bike',
        delivery_type || 'food',
        pickup_address || null,
        recipient_name || null,
        recipient_phone || null,
        package_description || null,
        package_weight ? parseFloat(package_weight) : null,
        package_dimensions || null,
        requires_signature || false,
        is_fragile || false,
        false
      ]
    );

    const orderId = result.rows[0].id;
    console.log(`✅ Order created with ID: ${orderId}, Type: ${delivery_type || 'food'}, Status: ${initialStatus}`);

    // Insert order items (only for food deliveries)
    if (delivery_type === 'food' && items && Array.isArray(items) && items.length > 0) {
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

    // Notify admin about new package delivery
    if (delivery_type !== 'food') {
      const io = req.app.get("io");
      if (io) {
        io.emit("admin-notification", {
          type: "new_package_request",
          orderId: orderId,
          customerName: customer_name,
          timestamp: new Date(),
        });
        console.log(`🔔 Notified admin about new package request #${orderId}`);
      }
    }

    // Notify vendor about new order (only for food deliveries)
    if (delivery_type === 'food' && restaurant_id) {
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
   YOCO CHECKOUT - Create Payment Session
========================= */
router.post("/checkout", async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount || !orderId) {
      return res.status(400).json({ message: "Amount and orderId are required" });
    }

    console.log(`💰 Creating Yoco checkout for order #${orderId}, amount: R${amount}`);

    const secretKey = process.env.YOCO_SECRET_KEY;
    
    if (!secretKey) {
      console.error("❌ YOCO_SECRET_KEY is not set in environment variables");
      return res.status(500).json({ message: "Payment service not configured" });
    }

    const response = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secretKey}`,
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
   UPDATE ORDER STATUS (DRIVER)
========================= */
router.put("/status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    const io = req.app.get("io");

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
    const deliveryType = prevOrder.rows[0]?.delivery_type;

    await db.query("UPDATE orders SET status = $1 WHERE id = $2", [status, orderId]);

    io.to(`order_${orderId}`).emit("order-status-update", {
      orderId: parseInt(orderId),
      status: status,
      timestamp: new Date(),
    });

    // Notify vendor when order is delivered (only for food)
    if (status === "delivered" && deliveryType === 'food' && vendorId && io) {
      io.to(`vendor_${vendorId}`).emit("order-delivered", {
        orderId: parseInt(orderId),
        timestamp: new Date(),
      });
      console.log(`📢 Notified vendor ${vendorId}: Order #${orderId} has been delivered`);
    }

    if (status !== previousStatus && status !== 'pending' && deliveryType === 'food') {
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

    if (status === "delivered" && deliveryType === 'food') {
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
      "SELECT * FROM orders WHERE id = $1 AND customer_id = $2 AND status IN ('pending', 'confirmed', 'pending_approval')",
      [orderId, customer_id]
    );

    if (orders.rows.length === 0) {
      return res.status(400).json({ 
        message: "Order cannot be cancelled. Only pending, confirmed, or pending_approval orders can be cancelled." 
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
   DRIVER ACCEPTS FOOD ORDER
========================= */
router.put("/accept/:id", async (req, res) => {
  try {
    const { driver_id } = req.body;
    const orderId = req.params.id;
    const io = req.app.get("io");

    console.log(`🚚 Driver ${driver_id} accepting food order ${orderId}`);

    if (!driver_id) {
      return res.status(400).json({ message: "driver_id is required" });
    }

    const driverCheck = await db.query(
      "SELECT id, name, email, vehicle_type, phone FROM users WHERE id = $1 AND role = 'driver' AND driver_status = 'approved'",
      [driver_id]
    );
    
    if (driverCheck.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found or not approved" });
    }

    const driver = driverCheck.rows[0];
    const driverVehicle = driver.vehicle_type || 'bike';

    const orderCheck = await db.query(
      `SELECT o.*, r.name as restaurant_name, r.owner_id,
              o.required_vehicle_type, o.delivery_type
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.id = $1 AND (o.driver_id IS NULL OR o.driver_id = 0) AND o.status = 'ready_for_pickup' AND o.delivery_type = 'food'`,
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found, already taken, or not ready for pickup" });
    }

    const order = orderCheck.rows[0];
    const requiredVehicle = order.required_vehicle_type || 'bike';

    if (driverVehicle === 'bike' && requiredVehicle === 'car') {
      return res.status(400).json({ 
        message: "This order requires a car. Bike riders cannot accept this order." 
      });
    }

    await db.query(
      "UPDATE orders SET driver_id = $1, driver_name = $2, driver_phone = $3, status = 'picked_up' WHERE id = $4",
      [driver_id, driver.name, driver.phone, orderId]
    );

    io.to(`order_${orderId}`).emit("order-status-update", {
      orderId: parseInt(orderId),
      status: "picked_up",
      driverId: driver_id,
      driverName: driver.name,
      driverPhone: driver.phone,
      driverVehicle: driverVehicle,
      message: "Driver is on the way to pickup your order",
    });

    if (order.owner_id) {
      io.to(`vendor_${order.owner_id}`).emit("order-accepted-by-driver", {
        orderId: parseInt(orderId),
        driverId: driver_id,
        driverName: driver.name,
        driverPhone: driver.phone,
        vehicleType: driverVehicle,
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
   ADMIN ASSIGNS DRIVER TO ORDER
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

    const driverCheck = await db.query(
      "SELECT id, name, vehicle_type, phone FROM users WHERE id = $1 AND role = 'driver' AND driver_status = 'approved'",
      [driver_id]
    );
    
    if (driverCheck.rows.length === 0) {
      return res.status(404).json({ message: "Driver not found or not approved" });
    }

    const driver = driverCheck.rows[0];

    const orderCheck = await db.query(
      "SELECT * FROM orders WHERE id = $1 AND (driver_id IS NULL OR driver_id = 0) AND status = 'ready_for_pickup'",
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found or already assigned" });
    }

    const order = orderCheck.rows[0];
    const requiredVehicle = order.required_vehicle_type || 'bike';
    const driverVehicle = driver.vehicle_type || 'bike';

    if (driverVehicle === 'bike' && requiredVehicle === 'car') {
      return res.status(400).json({ 
        message: "This order requires a car. Cannot assign to bike rider." 
      });
    }

    await db.query(
      "UPDATE orders SET driver_id = $1, driver_name = $2, driver_phone = $3, status = 'picked_up' WHERE id = $4",
      [driver_id, driver.name, driver.phone, orderId]
    );

    io.to(`driver_${driver_id}`).emit("order-offered", {
      orderId: parseInt(orderId),
      restaurantName: order.restaurant_name,
      customerAddress: order.delivery_address,
      orderTotal: order.total,
      requiredVehicle: requiredVehicle,
      message: "You have been assigned a delivery trip!"
    });

    res.json({ 
      message: "Order assigned to driver successfully",
      orderId: orderId,
      driverId: driver_id,
      vehicleMatch: true
    });
  } catch (err) {
    console.error("Error assigning driver:", err);
    res.status(500).json({ message: "Error assigning driver" });
  }
});

/* =========================
   ADMIN: APPROVE PACKAGE DELIVERY (UPDATED - NO DISTANCE FILTER)
========================= */
router.put("/admin/approve-package/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejection_reason } = req.body;
    const adminId = req.user.id;
    const io = req.app.get("io");

    console.log(`📦 Admin ${action} package delivery #${id}`);

    // First, check if order exists and is a package
    const orderCheck = await db.query(
      `SELECT id, status, delivery_type, pickup_address, delivery_address, delivery_fee, package_weight
       FROM orders 
       WHERE id = $1 AND delivery_type != 'food'`,
      [id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Package order not found" });
    }

    const packageOrder = orderCheck.rows[0];

    if (action === 'reject') {
      await db.query(
        `UPDATE orders 
         SET status = 'cancelled', 
             admin_rejection_reason = $1,
             admin_approved_by = $2,
             admin_approved_at = NOW()
         WHERE id = $3`,
        [rejection_reason || "No reason provided", adminId, id]
      );
      
      if (io) {
        io.to(`order_${id}`).emit("order-status-update", {
          orderId: parseInt(id),
          status: "cancelled",
          reason: rejection_reason,
          message: "Your package delivery request was not approved"
        });
      }
      
      return res.json({ message: "Package delivery request rejected" });
    }

    // Approve the package - update status to pending_driver
    await db.query(
      `UPDATE orders 
       SET status = 'pending_driver',
           admin_approved_by = $1,
           admin_approved_at = NOW(),
           driver_acceptance_deadline = NOW() + INTERVAL '1 hour'
       WHERE id = $2 AND delivery_type != 'food'`,
      [adminId, id]
    );

    console.log(`✅ Package #${id} approved, status: pending_driver`);

    // Get ALL approved, available drivers (no distance filter for testing)
    const driversResult = await db.query(
      `SELECT id, name, email, phone, vehicle_type
       FROM users 
       WHERE role = 'driver' 
         AND driver_status = 'approved'
         AND is_available = true`
    );
    
    const allDrivers = driversResult.rows;
    console.log(`📢 Found ${allDrivers.length} available drivers`);

    // Notify all drivers
    let notifiedCount = 0;
    for (const driver of allDrivers) {
      console.log(`🔔 Notifying driver ${driver.id} (${driver.name}) about package #${id}`);
      
      if (io) {
        io.to(`driver_${driver.id}`).emit("new-package-offer", {
          orderId: parseInt(id),
          pickupAddress: packageOrder.pickup_address,
          deliveryAddress: packageOrder.delivery_address,
          packageType: "Package Delivery",
          packageWeight: packageOrder.package_weight,
          estimatedPay: parseFloat(packageOrder.delivery_fee || 0),
          deadline: new Date(Date.now() + 3600000).toISOString(),
        });
        notifiedCount++;
      }
    }
    
    console.log(`✅ Notified ${notifiedCount} drivers about package #${id}`);

    res.json({ 
      success: true,
      message: "Package delivery approved and sent to drivers",
      driversNotified: notifiedCount
    });
    
  } catch (err) {
    console.error("Error approving package:", err);
    res.status(500).json({ 
      message: "Server error: " + err.message 
    });
  }
});

/* =========================
   DRIVER: ACCEPT PACKAGE DELIVERY
========================= */
router.put("/driver/accept-package/:id", verifyToken, authorizeRoles("driver"), async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user.id;
    const io = req.app.get("io");

    const orderCheck = await db.query(
      `SELECT id, status, driver_id, driver_acceptance_deadline, delivery_type,
              pickup_address, delivery_address, package_weight, delivery_fee
       FROM orders 
       WHERE id = $1 
         AND delivery_type IN ('package', 'document', 'other')
         AND status = 'pending_driver' 
         AND (driver_id IS NULL OR driver_id = 0)
         AND driver_acceptance_deadline > NOW()`,
      [id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(400).json({ 
        message: "This delivery is no longer available or has expired" 
      });
    }

    const order = orderCheck.rows[0];
    const driverResult = await db.query(
      "SELECT id, name, phone, vehicle_type FROM users WHERE id = $1",
      [driverId]
    );
    
    const driver = driverResult.rows[0];

    await db.query(
      `UPDATE orders 
       SET driver_id = $1,
           driver_name = $2,
           driver_phone = $3,
           status = 'assigned',
           assigned_at = NOW()
       WHERE id = $4`,
      [driverId, driver.name, driver.phone, id]
    );

    io.emit("package-offer-taken", { orderId: parseInt(id) });

    io.to(`order_${id}`).emit("order-status-update", {
      orderId: parseInt(id),
      status: "assigned",
      driverId: driverId,
      driverName: driver.name,
      driverPhone: driver.phone,
      message: "A driver has been assigned to your package delivery!"
    });

    io.emit("admin-notification", {
      type: "driver_accepted_package",
      orderId: parseInt(id),
      driverName: driver.name,
      timestamp: new Date(),
    });

    res.json({ 
      message: "Package delivery accepted!",
      orderId: id,
      pickupAddress: order.pickup_address,
      deliveryAddress: order.delivery_address,
      estimatedPay: order.delivery_fee
    });
  } catch (err) {
    console.error("Error accepting package:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// ==================== GET ROUTES (ORDER MATTERS - SPECIFIC BEFORE DYNAMIC!) ====================

/* =========================
   AVAILABLE ORDERS FOR DRIVERS - UPDATED FOR PACKAGES
========================= */
router.get("/available", async (req, res) => {
  try {
    const { driver_id } = req.query;
    console.log("📋 Fetching available orders for driver:", driver_id);
    
    let query = `
      SELECT o.*, 
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
        AND (
          -- Food orders: only ready_for_pickup
          (o.delivery_type = 'food' AND o.status = 'ready_for_pickup')
          OR
          -- Package/Non-food orders: only pending_driver
          (o.delivery_type != 'food' AND o.status = 'pending_driver')
        )
    `;
    
    const values = [];
    
    if (driver_id) {
      const driverResult = await db.query(
        `SELECT vehicle_type FROM users WHERE id = $1 AND role = 'driver'`,
        [driver_id]
      );
      
      if (driverResult.rows.length > 0) {
        const driverVehicle = driverResult.rows[0]?.vehicle_type || 'bike';
        
        if (driverVehicle === 'bike') {
          query += ` AND (o.required_vehicle_type = 'bike' OR o.required_vehicle_type IS NULL OR o.required_vehicle_type = '')`;
        }
      }
    }
    
    query += ` ORDER BY o.created_at ASC`;
    
    const results = await db.query(query, values);
    const orders = results.rows || [];
    console.log(`📋 Found ${orders.length} available orders (${orders.filter(o => o.delivery_type === 'food').length} food, ${orders.filter(o => o.delivery_type !== 'food').length} packages)`);
    res.json(orders);
    
  } catch (err) {
    console.error("Error fetching available orders:", err);
    res.json([]);
  }
});

/* =========================
   GET PENDING PACKAGE APPROVALS (ADMIN)
========================= */
router.get("/admin/pending-packages", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const results = await db.query(
      `SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       WHERE o.delivery_type IN ('package', 'document', 'other')
         AND o.status = 'pending_approval'
       ORDER BY o.created_at ASC`
    );
    res.json(results.rows);
  } catch (err) {
    console.error("Error fetching pending packages:", err);
    res.status(500).json({ message: "Server error" });
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
   CUSTOMER ORDERS (UPDATED with driver details)
========================= */
router.get("/customer/:customer_id", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT o.*, 
              r.name as restaurant_name,
              d.name as driver_name,
              d.phone as driver_phone,
              d.vehicle_type as driver_vehicle_type,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       LEFT JOIN users d ON o.driver_id = d.id
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
   GET SINGLE ORDER (by ID) - MUST BE AFTER SPECIFIC ROUTES!
========================= */
router.get("/:id", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    
    // Check if it's a valid number
    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    
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
      [orderId]
    );
    
    if (orders.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const order = orders.rows[0];
    const items = await db.query("SELECT * FROM order_items WHERE order_id = $1", [orderId]);
    
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
      driver_phone: order.driver_phone,
      driver_earning: order.driver_earning,
      notes: order.notes,
      payment_status: order.payment_status,
      reviewed: order.reviewed,
      original_total: order.original_total,
      promo_code: order.promo_code,
      discount_applied: order.discount_applied,
      item_count: order.item_count,
      required_vehicle_type: order.required_vehicle_type,
      delivery_type: order.delivery_type,
      pickup_address: order.pickup_address,
      recipient_name: order.recipient_name,
      recipient_phone: order.recipient_phone,
      package_description: order.package_description,
      package_weight: order.package_weight,
      package_dimensions: order.package_dimensions,
      requires_signature: order.requires_signature,
      is_fragile: order.is_fragile,
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

export default router;