import express from "express";
import {
  getVendorMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/vendorMenuController.js";

const router = express.Router();

// GET all menu items for vendor
router.get("/", getVendorMenu);

// CREATE menu item
router.post("/", createMenuItem);

// UPDATE menu item
router.put("/:id", updateMenuItem);

// DELETE menu item
router.delete("/:id", deleteMenuItem);

export default router;