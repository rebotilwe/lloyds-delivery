import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply admin authentication to all routes
router.use(verifyToken);
router.use(authorizeRoles("admin"));

/* =========================
   EDMOND'S FINANCIAL DASHBOARD
========================= */

// Get financial summary
// Get financial summary (CORRECTED)
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
    
    // Platform Commission (15% of subtotal for food deliveries ONLY)
    const commissionResult = await db.query(
      `SELECT COALESCE(SUM(o.subtotal * 0.15), 0) as total 
       FROM orders o 
       WHERE o.delivery_type = 'food' AND o.status = 'delivered' ${dateFilter}`,
      params
    );
    
    // Driver Payouts (what drivers actually earned)
    const driverResult = await db.query(
      `SELECT COALESCE(SUM(driver_earning), 0) as total 
       FROM orders 
       WHERE status = 'delivered' AND driver_earning > 0 ${dateFilter}`,
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
    const platformCommission = parseFloat(commissionResult.rows[0].total);
    const driverPayouts = parseFloat(driverResult.rows[0].total);
    const vendorPayouts = parseFloat(vendorResult.rows[0].total);
    
    // Operating costs (platform expenses, hosting, support, etc.)
    // For now, let's use a fixed percentage or actual costs from a separate table
    const operatingCosts = platformCommission * 0.3; // 30% of commission for operating costs
    
    // Net profit calculation: Commission - Operating Costs - Driver Payouts
    // Note: Vendor payouts come from customer payments, not from platform commission
    const netProfit = platformCommission - operatingCosts - driverPayouts;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
    
    console.log("Financial Summary:", {
      totalRevenue,
      platformCommission,
      driverPayouts,
      vendorPayouts,
      operatingCosts,
      netProfit,
      profitMargin
    });
    
    res.json({
      total_revenue: totalRevenue,
      platform_commission: platformCommission,
      driver_payouts: driverPayouts,
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
// Get revenue chart data (CORRECTED)
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
    
    query += ` GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`;
    
    const result = await db.query(query, params);
    res.json(result.rows.reverse());
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
        COALESCE(SUM(driver_earning), 0) as driver,
        COALESCE(SUM(vendor_payout_amount), 0) as vendor
      FROM orders
      WHERE status = 'delivered'
    `;
    
    const params = [];
    if (start_date && end_date) {
      query += ` AND created_at BETWEEN $1 AND $2`;
      params.push(start_date, end_date);
    }
    
    query += ` GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`;
    
    const result = await db.query(query, params);
    res.json(result.rows.reverse());
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

// Get recent transactions
router.get("/financial/recent-transactions", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await db.query(
      `SELECT 
         'revenue' as type,
         id::text as reference,
         created_at as date,
         'Order #' || id as description,
         total as amount,
         total as balance
       FROM orders
       WHERE status = 'delivered'
       UNION ALL
       SELECT 
         'payout' as type,
         id::text as reference,
         paid_at as date,
         'Driver payout - ' || COALESCE(driver_name, 'Unknown') as description,
         -total_amount as amount,
         -total_amount as balance
       FROM driver_payouts
       WHERE status = 'paid' AND paid_at IS NOT NULL
       UNION ALL
       SELECT 
         'payout' as type,
         id::text as reference,
         paid_at as date,
         'Vendor payout - ' || COALESCE(vendor_name, 'Unknown') as description,
         -total_amount as amount,
         -total_amount as balance
       FROM vendor_payouts
       WHERE status = 'paid' AND paid_at IS NOT NULL
       ORDER BY date DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching recent transactions:", err);
    res.json([]);
  }
});

// Get Edmond's balance
// Get Edmond's balance (CORRECTED)
router.get("/edmond/balance", async (req, res) => {
  try {
    // Total platform commission earned from food deliveries
    const commissionResult = await db.query(
      `SELECT COALESCE(SUM(o.subtotal * 0.15), 0) as total_commission
       FROM orders o
       WHERE o.delivery_type = 'food' AND o.status = 'delivered'`
    );
    
    // Total paid to drivers
    const driverPayoutsResult = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_paid
       FROM driver_payouts
       WHERE status = 'paid'`
    );
    
    // Total withdrawn by Edmond (track separately - you'll need a withdrawals table)
    const totalCommission = parseFloat(commissionResult.rows[0].total_commission);
    const paidToDrivers = parseFloat(driverPayoutsResult.rows[0].total_paid);
    const operatingCosts = totalCommission * 0.3;
    
    // Edmond's share = commission - driver payouts - operating costs
    const netProfit = totalCommission - paidToDrivers - operatingCosts;
    
    res.json({
      current_balance: Math.max(0, netProfit),
      total_earned: totalCommission,
      total_withdrawn: 0 // Track withdrawals separately
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
         id, created_at, total, delivery_fee, driver_earning, vendor_payout_amount,
         status, delivery_type, customer_name, restaurant_name
       FROM orders
       WHERE status = 'delivered' ${dateFilter}
       ORDER BY created_at DESC`,
      params
    );
    
    // Create CSV
    const headers = ["Order ID", "Date", "Type", "Customer", "Restaurant", "Total", "Delivery Fee", "Driver Earning", "Vendor Payout", "Status"];
    const rows = orders.rows.map(o => [
      o.id,
      o.created_at,
      o.delivery_type,
      o.customer_name,
      o.restaurant_name,
      o.total,
      o.delivery_fee,
      o.driver_earning || 0,
      o.vendor_payout_amount || 0,
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