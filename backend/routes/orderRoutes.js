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
        restaurant_name, 
        status || 'pending', 
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
    console.log(`✅ Order created with ID: ${orderId}, Type: ${delivery_type || 'food'}`);

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
   AVAILABLE ORDERS FOR DRIVERS (UPDATED with delivery_type)
========================= */
router.get("/available", async (req, res) => {
  try {
    const { driver_id } = req.query;
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
        AND (o.status = 'ready_for_pickup' OR o.status = 'pending')
    `;
    
    const values = [];
    
    // If a specific driver is requesting, filter by their vehicle type
    if (driver_id) {
      const driverResult = await db.query(
        `SELECT vehicle_type FROM users WHERE id = $1 AND role = 'driver'`,
        [driver_id]
      );
      
      const driverVehicle = driverResult.rows[0]?.vehicle_type || 'bike';
      
      // Bike drivers can only take bike orders
      if (driverVehicle === 'bike') {
        query += ` AND (o.required_vehicle_type = 'bike' OR o.required_vehicle_type IS NULL)`;
      }
      // Car drivers: no filter needed
    }
    
    query += ` ORDER BY o.created_at ASC`;
    
    const results = await db.query(query, values);
    res.json(results.rows || []);
  } catch (err) {
    console.error("Error fetching available orders:", err);
    res.json([]);
  }
});

/* =========================
   DRIVER ORDERS (assigned/accepted) - includes package details
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

// ... REST OF YOUR EXISTING ROUTES (accept, assign, status, cancel, reviews, etc.) ...

/* =========================
   ADMIN: APPROVE PACKAGE DELIVERY
========================= */
router.put("/admin/approve-package/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejection_reason } = req.body;
    const adminId = req.user.id;
    const io = req.app.get("io");

    console.log(`📦 Admin ${action} package delivery #${id}`);

    if (action === 'reject') {
      await db.query(
        `UPDATE orders 
         SET status = 'cancelled', 
             admin_rejection_reason = $1,
             admin_approved_by = $2,
             admin_approved_at = NOW()
         WHERE id = $3 AND delivery_type != 'food'`,
        [rejection_reason, adminId, id]
      );
      
      io.to(`order_${id}`).emit("order-status-update", {
        orderId: parseInt(id),
        status: "cancelled",
        reason: rejection_reason,
        message: "Your package delivery request was not approved"
      });
      
      return res.json({ message: "Package delivery request rejected" });
    }

    // Approve the package
    await db.query(
      `UPDATE orders 
       SET status = 'pending_driver',
           admin_approved_by = $1,
           admin_approved_at = NOW(),
           driver_acceptance_deadline = NOW() + INTERVAL '1 hour'
       WHERE id = $2 AND delivery_type != 'food'`,
      [adminId, id]
    );

    // Get order details for driver notification
    const order = await db.query(
      `SELECT o.*, u.latitude, u.longitude 
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    const packageOrder = order.rows[0];
    
    if (!packageOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Get nearby drivers (within 10km radius)
    let nearbyDrivers = [];
    if (packageOrder.pickup_lat && packageOrder.pickup_lng) {
      const driversResult = await db.query(
        `SELECT id, name, email, phone, vehicle_type 
         FROM users 
         WHERE role = 'driver' 
           AND driver_status = 'approved'
           AND is_available = true
           AND ST_DWithin(
             ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
             ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
             10000
           )`,
        [packageOrder.pickup_lng, packageOrder.pickup_lat]
      );
      nearbyDrivers = driversResult.rows;
    } else {
      // If no coordinates, get all available drivers
      const driversResult = await db.query(
        `SELECT id, name, email, phone, vehicle_type 
         FROM users 
         WHERE role = 'driver' 
           AND driver_status = 'approved'
           AND is_available = true`
      );
      nearbyDrivers = driversResult.rows;
    }

    // Notify each nearby driver
    for (const driver of nearbyDrivers) {
      io.to(`driver_${driver.id}`).emit("new-package-offer", {
        orderId: parseInt(id),
        pickupAddress: packageOrder.pickup_address,
        deliveryAddress: packageOrder.delivery_address,
        packageType: packageOrder.restaurant_name,
        packageWeight: packageOrder.package_weight,
        estimatedPay: packageOrder.delivery_fee,
        deadline: packageOrder.driver_acceptance_deadline,
        distance: packageOrder.pickup_lat ? calculateDistance(
          driver.latitude, driver.longitude,
          packageOrder.pickup_lat, packageOrder.pickup_lng
        ) : null,
      });
    }
    
    console.log(`📢 Notified ${nearbyDrivers.length} drivers about package #${id}`);

    res.json({ 
      message: "Package delivery approved and sent to drivers",
      driversNotified: nearbyDrivers.length
    });
  } catch (err) {
    console.error("Error approving package:", err);
    res.status(500).json({ message: "Server error: " + err.message });
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

    // Check if order is still available
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

    // Get driver details
    const driverResult = await db.query(
      "SELECT id, name, phone, vehicle_type FROM users WHERE id = $1",
      [driverId]
    );
    
    const driver = driverResult.rows[0];

    // Assign driver to order
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

    // Notify other drivers that this order is taken
    io.emit("package-offer-taken", { orderId: parseInt(id) });

    // Notify customer that driver is assigned
    io.to(`order_${id}`).emit("order-status-update", {
      orderId: parseInt(id),
      status: "assigned",
      driverId: driverId,
      driverName: driver.name,
      driverPhone: driver.phone,
      message: "A driver has been assigned to your package delivery!"
    });

    // Notify admin that driver accepted
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

export default router;