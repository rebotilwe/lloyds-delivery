import express from "express";
import db from "../config/db.js";

const router = express.Router();

// GET all restaurants
router.get("/", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM restaurants");
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET restaurant by ID
router.get("/:id", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM restaurants WHERE id = ?", [req.params.id]);
    if (results.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE restaurant
router.post("/", async (req, res) => {
  try {
    const { name, description, cuisine_type, address, phone, image_url, rating, delivery_fee, estimated_delivery_time } = req.body;
    const [result] = await db.query(
      "INSERT INTO restaurants (name, description, cuisine_type, address, phone, image_url, rating, delivery_fee, estimated_delivery_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [name, description, cuisine_type, address, phone, image_url, rating, delivery_fee, estimated_delivery_time]
    );
    res.status(201).json({ id: result.insertId, message: "Restaurant created" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE restaurant
router.put("/:id", async (req, res) => {
  try {
    await db.query("UPDATE restaurants SET ? WHERE id = ?", [req.body, req.params.id]);
    res.json({ message: "Restaurant updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE restaurant
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM restaurants WHERE id = ?", [req.params.id]);
    res.json({ message: "Restaurant deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;