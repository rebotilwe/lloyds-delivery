import db from "../config/db.js";

// GET MENU
export const getVendorMenu = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM menu_items ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Menu fetch error:", err);
    res.status(500).json({ message: "Failed to fetch menu" });
  }
};

// CREATE MENU ITEM
export const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, category } = req.body;

    const { rows } = await db.query(
      `INSERT INTO menu_items (name, description, price, category)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, price, category]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Menu create error:", err);
    res.status(500).json({ message: "Failed to create menu item" });
  }
};

// UPDATE MENU ITEM
export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category } = req.body;

    const { rows } = await db.query(
      `UPDATE menu_items
       SET name=$1, description=$2, price=$3, category=$4
       WHERE id=$5
       RETURNING *`,
      [name, description, price, category, id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Menu update error:", err);
    res.status(500).json({ message: "Failed to update menu item" });
  }
};

// DELETE MENU ITEM
export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(`DELETE FROM menu_items WHERE id=$1`, [id]);

    res.json({ message: "Menu item deleted" });
  } catch (err) {
    console.error("Menu delete error:", err);
    res.status(500).json({ message: "Failed to delete menu item" });
  }
};