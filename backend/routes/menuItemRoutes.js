import express from "express";
import db from "../config/db.js";

const router = express.Router();

// GET all menu items
router.get("/", async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT mi.*, r.name as restaurant_name 
       FROM menu_items mi
       LEFT JOIN restaurants r ON mi.restaurant_id = r.id
       ORDER BY mi.created_at DESC`
    );
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET menu items by restaurant
router.get("/restaurant/:restaurant_id", async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY name",
      [req.params.restaurant_id]
    );
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET single menu item
router.get("/:id", async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT * FROM menu_items WHERE id = ?",
      [req.params.id]
    );
    if (results.length === 0) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    res.json(results[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// CREATE menu item
router.post("/", async (req, res) => {
  try {
    const { restaurant_id, name, description, price, image_url, category } = req.body;
    
    const [result] = await db.query(
      `INSERT INTO menu_items 
       (restaurant_id, name, description, price, image_url, category) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [restaurant_id, name, description, price, image_url || null, category || null]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      message: "Menu item created successfully" 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE menu item
router.put("/:id", async (req, res) => {
  try {
    const { restaurant_id, name, description, price, image_url, category } = req.body;
    
    await db.query(
      `UPDATE menu_items 
       SET restaurant_id = ?, name = ?, description = ?, price = ?, image_url = ?, category = ?
       WHERE id = ?`,
      [restaurant_id, name, description, price, image_url, category, req.params.id]
    );
    
    res.json({ message: "Menu item updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE menu item
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM menu_items WHERE id = ?", [req.params.id]);
    res.json({ message: "Menu item deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;