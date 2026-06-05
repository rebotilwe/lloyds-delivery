import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Helper function to calculate customer price with markup
const calculateCustomerPrice = (vendorPrice, markupPercentage) => {
  const markup = markupPercentage / 100;
  const customerPrice = vendorPrice * (1 + markup);
  return Math.ceil(customerPrice * 100) / 100;
};

// GET all menu items (shows customer price)
router.get("/", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT mi.*, r.name as restaurant_name, 
              COALESCE(r.markup_percentage, 12.5) as markup_percentage,
              COALESCE(mi.customer_price, mi.price) as display_price
       FROM menu_items mi
       LEFT JOIN restaurants r ON mi.restaurant_id = r.id
       ORDER BY mi.created_at DESC`
    );
    
    const menuItems = results.rows.map(item => ({
      ...item,
      price: parseFloat(item.display_price) || 0,
      vendor_price: parseFloat(item.vendor_price) || parseFloat(item.price) / (1 + (item.markup_percentage / 100)),
      markup_applied: item.markup_percentage
    }));
    
    res.json(menuItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET menu items by restaurant (shows customer price)
// GET menu items by restaurant (public - only approved)
router.get("/restaurant/:restaurant_id", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT mi.*, r.name as restaurant_name,
              COALESCE(r.markup_percentage, 12.5) as markup_percentage,
              COALESCE(mi.customer_price, mi.price) as display_price
       FROM menu_items mi
       LEFT JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE mi.restaurant_id = $1 
         AND mi.approval_status = 'approved'
       ORDER BY mi.name`,
    );
    
    const menuItems = results.rows.map(item => ({
      ...item,
      price: parseFloat(item.display_price) || 0,
      vendor_price: parseFloat(item.vendor_price) || parseFloat(item.price) / (1 + (item.markup_percentage / 100))
    }));
    
    res.json(menuItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET menu items by restaurant for VENDOR (shows vendor price)
router.get("/vendor/restaurant/:restaurant_id", verifyToken, authorizeRoles("vendor"), async (req, res) => {
  try {
    // Verify vendor owns this restaurant
    const restaurantCheck = await db.query(
      "SELECT owner_id FROM restaurants WHERE id = $1",
      [req.params.restaurant_id]
    );
    
    if (restaurantCheck.rows[0]?.owner_id !== req.user.id) {
      return res.status(403).json({ message: "You don't own this restaurant" });
    }
    
    const results = await db.query(
      `SELECT mi.*, r.name as restaurant_name,
              COALESCE(r.markup_percentage, 12.5) as markup_percentage,
              COALESCE(mi.vendor_price, mi.price / (1 + (r.markup_percentage / 100))) as vendor_price_display,
              COALESCE(mi.customer_price, mi.price) as customer_price_display
       FROM menu_items mi
       LEFT JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE mi.restaurant_id = $1 
       ORDER BY mi.name`,
      [req.params.restaurant_id]
    );
    
    const menuItems = results.rows.map(item => ({
      ...item,
      vendor_price: parseFloat(item.vendor_price_display) || 0,
      customer_price: parseFloat(item.customer_price_display) || 0,
      markup_percentage: item.markup_percentage
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
      `SELECT mi.*, r.name as restaurant_name,
              COALESCE(r.markup_percentage, 12.5) as markup_percentage,
              COALESCE(mi.customer_price, mi.price) as display_price
       FROM menu_items mi
       LEFT JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE mi.id = $1`,
      [req.params.id]
    );
    
    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    
    const menuItem = {
      ...results.rows[0],
      price: parseFloat(results.rows[0].display_price) || 0,
      vendor_price: parseFloat(results.rows[0].vendor_price) || parseFloat(results.rows[0].price) / (1 + (results.rows[0].markup_percentage / 100))
    };
    
    res.json(menuItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// CREATE menu item (with markup calculation)
router.post("/", verifyToken, authorizeRoles("vendor"), async (req, res) => {
  try {
    const { restaurant_id, name, description, price, image_url, category } = req.body;
    
    // Verify vendor owns this restaurant
    const restaurantCheck = await db.query(
      "SELECT id, markup_percentage, owner_id FROM restaurants WHERE id = $1",
      [restaurant_id]
    );
    
    if (restaurantCheck.rows.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    
    if (restaurantCheck.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: "You don't own this restaurant" });
    }
    
    const markupPercentage = parseFloat(restaurantCheck.rows[0].markup_percentage) || 12.5;
    const vendorPrice = parseFloat(price) || 0;
    const customerPrice = calculateCustomerPrice(vendorPrice, markupPercentage);
    
    const result = await db.query(
      `INSERT INTO menu_items 
       (restaurant_id, name, description, vendor_price, customer_price, price, markup_applied, image_url, category) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [restaurant_id, name, description, vendorPrice, customerPrice, customerPrice, markupPercentage, image_url || null, category || null]
    );
    
    res.status(201).json({ 
      id: result.rows[0].id, 
      message: "Menu item created successfully",
      vendor_price: vendorPrice,
      customer_price: customerPrice,
      markup_applied: markupPercentage
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE menu item
router.put("/:id", verifyToken, authorizeRoles("vendor"), async (req, res) => {
  try {
    const { name, description, price, image_url, category } = req.body;
    
    // Get current menu item and verify ownership
    const menuItemCheck = await db.query(
      `SELECT mi.*, r.owner_id, r.markup_percentage 
       FROM menu_items mi
       JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE mi.id = $1`,
      [req.params.id]
    );
    
    if (menuItemCheck.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    
    if (menuItemCheck.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: "You don't own this restaurant" });
    }
    
    const markupPercentage = parseFloat(menuItemCheck.rows[0].markup_percentage) || 12.5;
    const vendorPrice = parseFloat(price) || menuItemCheck.rows[0].vendor_price;
    const customerPrice = calculateCustomerPrice(vendorPrice, markupPercentage);
    
    await db.query(
      `UPDATE menu_items 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           vendor_price = $3,
           customer_price = $4,
           price = $4,
           markup_applied = $5,
           image_url = COALESCE($6, image_url),
           category = COALESCE($7, category)
       WHERE id = $8`,
      [name, description, vendorPrice, customerPrice, markupPercentage, image_url, category, req.params.id]
    );
    
    res.json({ 
      message: "Menu item updated successfully",
      vendor_price: vendorPrice,
      customer_price: customerPrice
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE menu item
router.delete("/:id", verifyToken, authorizeRoles("vendor", "admin"), async (req, res) => {
  try {
    const menuItemCheck = await db.query(
      `SELECT mi.*, r.owner_id 
       FROM menu_items mi
       JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE mi.id = $1`,
      [req.params.id]
    );
    
    if (menuItemCheck.rows.length > 0 && menuItemCheck.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "You don't own this restaurant" });
    }
    
    await db.query("DELETE FROM menu_items WHERE id = $1", [req.params.id]);
    res.json({ message: "Menu item deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;