import db from "../config/db.js";

// CREATE ORDER
export const createOrder = (req, res) => {
  const {
    customer_id,
    customer_name,
    restaurant_id,
    restaurant_name,
    items,
    subtotal,
    delivery_fee,
    total,
    delivery_address,
    notes,
  } = req.body;

  const sql = `
    INSERT INTO orders (
      customer_id,
      customer_name,
      restaurant_id,
      restaurant_name,
      items,
      total,
      delivery_fee,
      delivery_address,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      customer_id,
      customer_name,
      restaurant_id,
      restaurant_name,
      JSON.stringify(items),
      total,
      delivery_fee,
      delivery_address,
      "pending",
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Order creation failed" });
      }

      return res.json({
        message: "Order created successfully",
        orderId: result.insertId,
      });
    }
  );
};

// GET ORDERS FOR CUSTOMER
export const getCustomerOrders = (req, res) => {
  const { customer_id } = req.params;

  const sql = `
    SELECT * FROM orders 
    WHERE customer_id = ? 
    ORDER BY created_at DESC
  `;

  db.query(sql, [customer_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });

    return res.json(results);
  });
};
export const getOrderById = (req, res) => {
  const { id } = req.params;

  const sql = "SELECT * FROM orders WHERE id = ?";

  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });

    if (results.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json(results[0]);
  });
};