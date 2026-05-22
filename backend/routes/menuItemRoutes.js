import express from "express";
import db from "../config/db.js";

const router = express.Router();

// GET all menu items
router.get("/", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT mi.*, r.name as restaurant_name 
       FROM menu_items mi
       LEFT JOIN restaurants r ON mi.restaurant_id = r.id
       ORDER BY mi.created_at DESC`
    );
    
    // Ensure price is returned as a number
    const menuItems = results.rows.map(item => ({
      ...item,
      price: parseFloat(item.price) || 0
    }));
    
    res.json(menuItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET menu items by restaurant
router.get("/restaurant/:restaurant_id", async (req, res) => {
  try {
    const results = await db.query(
      "SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY name",
      [req.params.restaurant_id]
    );
    
    // Ensure price is returned as a number
    const menuItems = results.rows.map(item => ({
      ...item,
      price: parseFloat(item.price) || 0
    }));
    
    res.json(menuItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET single menu item
router.get("/:id", async (req, res) => {
  try {
    const results = await db.query(
      "SELECT * FROM menu_items WHERE id = $1",
      [req.params.id]
    );
    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    
    // Ensure price is returned as a number
    const menuItem = {
      ...results.rows[0],
      price: parseFloat(results.rows[0].price) || 0
    };
    
    res.json(menuItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// CREATE menu item
router.post("/", async (req, res) => {
  try {
    const { restaurant_id, name, description, price, image_url, category } = req.body;
    
    // Ensure price is a number
    const numericPrice = parseFloat(price) || 0;
    
    const result = await db.query(
      `INSERT INTO menu_items 
       (restaurant_id, name, description, price, image_url, category) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [restaurant_id, name, description, numericPrice, image_url || null, category || null]
    );
    
    res.status(201).json({ 
      id: result.rows[0].id, 
      message: "Menu item created successfully",
      price: numericPrice
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
    
    // Ensure price is a number
    const numericPrice = parseFloat(price) || 0;
    
    await db.query(
      `UPDATE menu_items 
       SET restaurant_id = $1, name = $2, description = $3, price = $4, image_url = $5, category = $6
       WHERE id = $7`,
      [restaurant_id, name, description, numericPrice, image_url, category, req.params.id]
    );
    
    res.json({ 
      message: "Menu item updated successfully",
      price: numericPrice
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE menu item
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM menu_items WHERE id = $1", [req.params.id]);
    res.json({ message: "Menu item deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;