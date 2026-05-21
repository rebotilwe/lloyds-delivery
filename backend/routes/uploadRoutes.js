import express from "express";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Upload image endpoint for restaurants/admin
router.post("/", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Construct the URL to access the file
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    
    res.json({ 
      imageUrl, 
      message: "Image uploaded successfully" 
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Failed to upload image" });
  }
});

export default router;