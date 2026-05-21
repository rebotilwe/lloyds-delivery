import express from "express";
import db from "../config/db.js";

const router = express.Router();

// GET all restaurants
router.get("/", async (req, res) => {
  try {
    const results = await db.query("SELECT * FROM restaurants ORDER BY id");
    res.json(results.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET restaurant by ID
router.get("/:id", async (req, res) => {
  try {
    const results = await db.query("SELECT * FROM restaurants WHERE id = $1", [req.params.id]);
    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json(results.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE restaurant
router.post("/", async (req, res) => {
  try {
    const { name, description, cuisine_type, address, phone, image_url, rating, delivery_fee, estimated_delivery_time } = req.body;
    const result = await db.query(
      `INSERT INTO restaurants (name, description, cuisine_type, address, phone, image_url, rating, delivery_fee, estimated_delivery_time) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [name, description, cuisine_type, address, phone, image_url, rating, delivery_fee, estimated_delivery_time]
    );
    res.status(201).json({ id: result.rows[0].id, message: "Restaurant created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE restaurant
router.put("/:id", async (req, res) => {
  try {
    const { name, description, cuisine_type, address, phone, image_url, rating, delivery_fee, estimated_delivery_time } = req.body;
    await db.query(
      `UPDATE restaurants SET 
        name = $1, description = $2, cuisine_type = $3, address = $4, 
        phone = $5, image_url = $6, rating = $7, delivery_fee = $8, estimated_delivery_time = $9 
       WHERE id = $10`,
      [name, description, cuisine_type, address, phone, image_url, rating, delivery_fee, estimated_delivery_time, req.params.id]
    );
    res.json({ message: "Restaurant updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE restaurant
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM restaurants WHERE id = $1", [req.params.id]);
    res.json({ message: "Restaurant deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;