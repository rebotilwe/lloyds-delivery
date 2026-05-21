// Replace all ? with $1, $2, etc. and results with results.rows

// Example - GET ALL ORDERS
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
    console.log('Fetched orders from DB:', results.rows.length);
    res.json(results.rows || []);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Error fetching orders", error: err.message });
  }
});

// INSERT order - use RETURNING id instead of insertId
const result = await db.query(
  `INSERT INTO orders (...) VALUES ($1, $2, ...) RETURNING id`,
  [...values]
);
const orderId = result.rows[0].id;