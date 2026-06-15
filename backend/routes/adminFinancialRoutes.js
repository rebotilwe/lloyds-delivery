import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply admin authentication to all routes
router.use(verifyToken);
router.use(authorizeRoles("admin"));

/* =========================
   DEBUG: Check database contents
========================= */
router.get("/financial/debug", async (req, res) => {
  try {
    // Get all delivered orders
    const deliveredOrders = await db.query(
      `SELECT id, total, delivery_fee, driver_earning, vendor_payout_amount, 
              subtotal, delivery_type, status, created_at
       FROM orders 
       WHERE status = 'delivered'
       ORDER BY id DESC
       LIMIT 20`
    );
    
    // Get summary of all delivered orders
    const summary = await db.query(
      `SELECT 
         COUNT(*) as total_orders,
         SUM(total) as total_revenue,
         SUM(driver_earning) as total_driver_earnings,
         SUM(vendor_payout_amount) as total_vendor_payouts,
         SUM(CASE WHEN delivery_type = 'food' THEN subtotal ELSE 0 END) as food_subtotal,
         SUM(CASE WHEN delivery_type = 'food' THEN subtotal * 0.15 ELSE 0 END) as calculated_commission,
         COUNT(CASE WHEN delivery_type = 'food' THEN 1 END) as food_orders,
         COUNT(CASE WHEN delivery_type != 'food' THEN 1 END) as package_orders
       FROM orders 
       WHERE status = 'delivered'`
    );
    
    // Get driver payouts table structure
    const driverPayoutsData = await db.query(
      `SELECT * FROM driver_payouts LIMIT 1`
    ).catch(() => ({ rows: [] }));
    
    // Get vendor payouts table structure
    const vendorPayoutsData = await db.query(
      `SELECT * FROM vendor_payouts LIMIT 1`
    ).catch(() => ({ rows: [] }));
    
    res.json({
      delivered_orders: deliveredOrders.rows.slice(0, 5),
      summary: summary.rows[0],
      driver_payouts_sample: driverPayoutsData.rows[0] || null,
      vendor_payouts_sample: vendorPayoutsData.rows[0] || null,
      message: "Use this to see the actual column names"
    });
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   EDMOND'S FINANCIAL DASHBOARD
========================= */

// Get financial summary
router.get("/financial/summary", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = "";
    const params = [];
    
    if (start_date && end_date) {
      dateFilter = "AND o.created_at BETWEEN $1 AND $2";
      params.push(start_date, end_date);
    }
    
    // Total Revenue from delivered orders
    const revenueResult = await db.query(
      `SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status = 'delivered' ${dateFilter}`,
      params
    );
    
    // FOOD ORDERS ONLY - Platform Commission (15% of subtotal)
    const foodCommissionResult = await db.query(
      `SELECT 
         COALESCE(SUM(o.subtotal * 0.15), 0) as commission,
         COUNT(*) as order_count,
         COALESCE(SUM(o.driver_earning), 0) as driver_payouts,
         COALESCE(SUM(o.total), 0) as revenue
       FROM orders o 
       WHERE o.delivery_type = 'food' AND o.status = 'delivered' ${dateFilter}`,
      params
    );
    
    // PACKAGE ORDERS ONLY - No commission, just tracking
    const packageResult = await db.query(
      `SELECT 
         COUNT(*) as order_count,
         COALESCE(SUM(o.driver_earning), 0) as driver_payouts,
         COALESCE(SUM(o.total), 0) as revenue
       FROM orders o 
       WHERE o.delivery_type != 'food' AND o.status = 'delivered' ${dateFilter}`,
      params
    );
    
    // Vendor Payouts (what vendors actually earned)
    const vendorResult = await db.query(
      `SELECT COALESCE(SUM(vendor_payout_amount), 0) as total 
       FROM orders 
       WHERE status = 'delivered' AND vendor_payout_amount > 0 ${dateFilter}`,
      params
    );
    
    const totalRevenue = parseFloat(revenueResult.rows[0].total);
    const platformCommission = parseFloat(foodCommissionResult.rows[0].commission);
    const foodDriverPayouts = parseFloat(foodCommissionResult.rows[0].driver_payouts);
    const packageDriverPayouts = parseFloat(packageResult.rows[0].driver_payouts);
    const totalDriverPayouts = foodDriverPayouts + packageDriverPayouts;
    const vendorPayouts = parseFloat(vendorResult.rows[0].total);
    
    // Operating costs (30% of commission from food orders only)
    const operatingCosts = platformCommission * 0.3;
    
    // Net profit: Commission from food - operating costs - driver payouts from food only
    const netProfit = platformCommission - operatingCosts - foodDriverPayouts;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
    
    res.json({
      total_revenue: totalRevenue,
      platform_commission: platformCommission,
      driver_payouts: totalDriverPayouts,
      vendor_payouts: vendorPayouts,
      operating_costs: operatingCosts,
      net_profit: netProfit,
      profit_margin: profitMargin
    });
  } catch (err) {
    console.error("Error fetching financial summary:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get revenue chart data
router.get("/financial/revenue-chart", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total), 0) as revenue,
        COALESCE(SUM(CASE WHEN delivery_type = 'food' THEN subtotal * 0.15 ELSE 0 END), 0) as commission
      FROM orders
      WHERE status = 'delivered'
    `;
    
    const params = [];
    if (start_date && end_date) {
      query += ` AND created_at BETWEEN $1 AND $2`;
      params.push(start_date, end_date);
    }
    
    query += ` GROUP BY DATE(created_at) ORDER BY date ASC`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching revenue chart:", err);
    res.json([]);
  }
});

// Get commission chart data
router.get("/financial/commission-chart", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(subtotal * 0.15), 0) as commission
      FROM orders
      WHERE delivery_type = 'food' AND status = 'delivered'
    `;
    
    const params = [];
    if (start_date && end_date) {
      query += ` AND created_at BETWEEN $1 AND $2`;
      params.push(start_date, end_date);
    }
    
    query += ` GROUP BY DATE(created_at) ORDER BY date ASC`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching commission chart:", err);
    res.json([]);
  }
});

// Get payout chart data
router.get("/financial/payout-chart", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(CASE WHEN delivery_type = 'food' THEN driver_earning ELSE 0 END), 0) as driver,
        COALESCE(SUM(vendor_payout_amount), 0) as vendor
      FROM orders
      WHERE status = 'delivered'
    `;
    
    const params = [];
    if (start_date && end_date) {
      query += ` AND created_at BETWEEN $1 AND $2`;
      params.push(start_date, end_date);
    }
    
    query += ` GROUP BY DATE(created_at) ORDER BY date ASC`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching payout chart:", err);
    res.json([]);
  }
});

// Get top restaurants
router.get("/financial/top-restaurants", async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const result = await db.query(
      `SELECT 
         r.id, r.name,
         COUNT(o.id) as total_orders,
         COALESCE(SUM(o.total), 0) as total_revenue,
         COALESCE(SUM(o.subtotal * 0.15), 0) as commission_paid
       FROM restaurants r
       JOIN orders o ON o.restaurant_id = r.id
       WHERE o.status = 'delivered' AND o.delivery_type = 'food'
       GROUP BY r.id, r.name
       ORDER BY total_revenue DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching top restaurants:", err);
    res.json([]);
  }
});

// Get top drivers
router.get("/financial/top-drivers", async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const result = await db.query(
      `SELECT 
         u.id, u.name,
         COUNT(o.id) as total_deliveries,
         COALESCE(SUM(o.driver_earning), 0) as total_earnings,
         COALESCE(u.driver_rating, 0) as rating
       FROM users u
       JOIN orders o ON o.driver_id = u.id
       WHERE o.status = 'delivered' AND u.role = 'driver'
       GROUP BY u.id, u.name, u.driver_rating
       ORDER BY total_earnings DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching top drivers:", err);
    res.json([]);
  }
});

// Get recent transactions (FIXED - using correct column names)
router.get("/financial/recent-transactions", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get orders revenue
    const ordersResult = await db.query(
      `SELECT 
         'revenue' as type,
         id::text as reference,
         created_at as date,
         'Order #' || id || ' - ' || COALESCE(restaurant_name, 'Package') as description,
         total as amount
       FROM orders
       WHERE status = 'delivered'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    
    // Get driver payouts - using 'amount' column
    let driverPayoutsResult = [];
    try {
      const dpResult = await db.query(
        `SELECT 
           'driver_payout' as type,
           id::text as reference,
           created_at as date,
           'Driver payout - Driver ID: ' || driver_id as description,
           -amount as amount
         FROM driver_payouts
         WHERE status = 'paid'
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );
      driverPayoutsResult = dpResult.rows;
    } catch (err) {
      console.error("Error fetching driver payouts:", err.message);
    }
    
    // Get vendor payouts - using 'amount' column
    let vendorPayoutsResult = [];
    try {
      const vpResult = await db.query(
        `SELECT 
           'vendor_payout' as type,
           id::text as reference,
           created_at as date,
           'Vendor payout' as description,
           -amount as amount
         FROM vendor_payouts
         WHERE status = 'paid'
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );
      vendorPayoutsResult = vpResult.rows;
    } catch (err) {
      console.error("Error fetching vendor payouts:", err.message);
    }
    
    // Combine all transactions
    const allTransactions = [...ordersResult.rows, ...driverPayoutsResult, ...vendorPayoutsResult];
    
    // Sort by date
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Calculate running balance
    let balance = 0;
    const transactions = allTransactions.slice(0, limit).map(t => {
      balance += parseFloat(t.amount);
      return { ...t, balance: balance };
    });
    
    res.json(transactions);
  } catch (err) {
    console.error("Error fetching recent transactions:", err);
    res.json([]);
  }
});

// Get Edmond's balance (FIXED - using correct column names)
router.get("/edmond/balance", async (req, res) => {
  try {
    // Total platform commission earned from food deliveries
    const commissionResult = await db.query(
      `SELECT COALESCE(SUM(o.subtotal * 0.15), 0) as total_commission
       FROM orders o
       WHERE o.delivery_type = 'food' AND o.status = 'delivered'`
    );
    
    // Total paid to drivers from food deliveries (platform's share)
    const foodDriverPayouts = await db.query(
      `SELECT COALESCE(SUM(driver_earning), 0) as total
       FROM orders
       WHERE delivery_type = 'food' AND status = 'delivered'`
    );
    
    // Total paid out to drivers via driver_payouts table using 'amount' column
    let paidOutToDrivers = 0;
    try {
      const paidResult = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM driver_payouts
         WHERE status = 'paid'`
      );
      paidOutToDrivers = parseFloat(paidResult.rows[0].total);
    } catch (err) {
      console.error("Error fetching paid out drivers:", err.message);
    }
    
    const totalCommission = parseFloat(commissionResult.rows[0].total_commission);
    const foodDriverEarnings = parseFloat(foodDriverPayouts.rows[0].total);
    const operatingCosts = totalCommission * 0.3;
    
    // Edmond's share = commission - operating costs - driver payouts (food only)
    const netProfit = totalCommission - operatingCosts - foodDriverEarnings;
    
    res.json({
      current_balance: Math.max(0, netProfit - paidOutToDrivers),
      total_earned: totalCommission,
      total_withdrawn: paidOutToDrivers
    });
  } catch (err) {
    console.error("Error fetching Edmond balance:", err);
    res.json({ current_balance: 0, total_earned: 0, total_withdrawn: 0 });
  }
});

// Export financial report as CSV
router.get("/financial/export", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = "";
    const params = [];
    
    if (start_date && end_date) {
      dateFilter = "AND created_at BETWEEN $1 AND $2";
      params.push(start_date, end_date);
    }
    
    const orders = await db.query(
      `SELECT 
         id, created_at, delivery_type, customer_name, restaurant_name,
         total, delivery_fee, driver_earning, vendor_payout_amount,
         subtotal, status
       FROM orders
       WHERE status = 'delivered' ${dateFilter}
       ORDER BY created_at DESC`,
      params
    );
    
    // Create CSV
    const headers = ["Order ID", "Date", "Type", "Customer", "Restaurant", 
                     "Total", "Delivery Fee", "Driver Earning", "Vendor Payout", 
                     "Subtotal", "Commission (15%)", "Status"];
    
    const rows = orders.rows.map(o => [
      o.id,
      o.created_at,
      o.delivery_type,
      o.customer_name || '',
      o.restaurant_name || '',
      o.total,
      o.delivery_fee || 0,
      o.driver_earning || 0,
      o.vendor_payout_amount || 0,
      o.subtotal || 0,
      o.delivery_type === 'food' ? (o.subtotal * 0.15).toFixed(2) : 0,
      o.status
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=financial-report-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err) {
    console.error("Error exporting report:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;