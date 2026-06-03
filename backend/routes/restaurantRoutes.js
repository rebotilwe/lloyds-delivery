import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET all restaurants
router.get("/", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT r.*, 
              COALESCE(r.markup_percentage, 12.5) as markup_percentage,
              u.name as owner_name
       FROM restaurants r
       LEFT JOIN users u ON r.owner_id = u.id
       ORDER BY r.id`
    );
    res.json(results.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET restaurant by ID (includes markup)
router.get("/:id", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT r.*, 
              COALESCE(r.markup_percentage, 12.5) as markup_percentage,
              u.name as owner_name
       FROM restaurants r
       LEFT JOIN users u ON r.owner_id = u.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json(results.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE restaurant (with owner_id)
router.post("/", verifyToken, authorizeRoles("admin", "vendor"), async (req, res) => {
  try {
    const { 
      name, description, cuisine_type, address, phone, image_url, 
      rating, delivery_fee, estimated_delivery_time, owner_id, markup_percentage 
    } = req.body;
    
    const numericMarkup = parseFloat(markup_percentage) || 12.5;
    
    const result = await db.query(
      `INSERT INTO restaurants 
       (name, description, cuisine_type, address, phone, image_url, rating, 
        delivery_fee, estimated_delivery_time, owner_id, markup_percentage) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [name, description, cuisine_type, address, phone, image_url, rating, 
       delivery_fee, estimated_delivery_time, owner_id || req.user.id, numericMarkup]
    );
    
    res.status(201).json({ 
      id: result.rows[0].id, 
      message: "Restaurant created",
      markup_percentage: numericMarkup
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE restaurant
router.put("/:id", verifyToken, authorizeRoles("admin", "vendor"), async (req, res) => {
  try {
    const { 
      name, description, cuisine_type, address, phone, image_url, 
      rating, delivery_fee, estimated_delivery_time, markup_percentage 
    } = req.body;
    
    const numericMarkup = markup_percentage ? parseFloat(markup_percentage) : null;
    
    let query = `
      UPDATE restaurants SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        cuisine_type = COALESCE($3, cuisine_type),
        address = COALESCE($4, address),
        phone = COALESCE($5, phone),
        image_url = COALESCE($6, image_url),
        rating = COALESCE($7, rating),
        delivery_fee = COALESCE($8, delivery_fee),
        estimated_delivery_time = COALESCE($9, estimated_delivery_time)
    `;
    
    const values = [name, description, cuisine_type, address, phone, image_url, rating, delivery_fee, estimated_delivery_time];
    let paramIndex = 10;
    
    if (numericMarkup !== null) {
      query += `, markup_percentage = $${paramIndex}`;
      values.push(numericMarkup);
      paramIndex++;
    }
    
    query += ` WHERE id = $${paramIndex}`;
    values.push(req.params.id);
    
    await db.query(query, values);
    
    res.json({ 
      message: "Restaurant updated successfully",
      markup_percentage: numericMarkup
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE restaurant markup (admin only)
router.put("/:id/markup", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { markup_percentage } = req.body;
    const restaurantId = req.params.id;
    
    if (markup_percentage < 10 || markup_percentage > 15) {
      return res.status(400).json({ message: "Markup must be between 10% and 15%" });
    }
    
    await db.query(
      "UPDATE restaurants SET markup_percentage = $1 WHERE id = $2",
      [markup_percentage, restaurantId]
    );
    
    res.json({ 
      message: "Markup updated successfully", 
      markup_percentage 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE restaurant
router.delete("/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    await db.query("DELETE FROM restaurants WHERE id = $1", [req.params.id]);
    res.json({ message: "Restaurant deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;