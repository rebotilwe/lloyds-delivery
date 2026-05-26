import db from "../config/db.js";
import path from "path";

export const submitDriverApplication = async (req, res) => {
  try {
    const { userId, car_info } = req.body;

    console.log("📝 Submitting driver application for userId:", userId);
    console.log("📦 Files received:", req.files ? Object.keys(req.files) : "No files");
    console.log("🚗 Car info:", car_info);

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Parse car info
    let car = {};
    try {
      car = typeof car_info === 'string' ? JSON.parse(car_info) : (car_info || {});
    } catch (e) {
      console.error("Error parsing car_info:", e);
      car = {};
    }

    // Get uploaded file paths
    const getRelativePath = (file) => {
      if (!file) return null;
      const filename = path.basename(file.path);
      return `/uploads/drivers/${filename}`;
    };

    const id_copy = getRelativePath(req.files?.id_copy?.[0]);
    const pdp = getRelativePath(req.files?.pdp?.[0]);
    const profile_photo = getRelativePath(req.files?.profile_photo?.[0]);
    const car_license = getRelativePath(req.files?.car_license?.[0]);

    console.log("📄 Document paths:", { id_copy, pdp, profile_photo, car_license });

    if (!id_copy || !pdp || !profile_photo) {
      return res.status(400).json({ message: "Missing required files: ID copy, PDP, and profile photo are required" });
    }

    // ✅ REMOVED car_info from the UPDATE (since you have individual columns)
    const sql = `
      UPDATE users 
      SET 
        driver_status = 'pending',
        id_copy = $1,
        pdp = $2,
        profile_photo = $3,
        car_license = $4,
        car_make = $5,
        car_model = $6,
        car_year = $7,
        car_color = $8,
        license_plate = $9
      WHERE id = $10
      RETURNING id
    `;

    const values = [
      id_copy,
      pdp,
      profile_photo,
      car_license,
      car?.make || null,
      car?.model || null,
      car?.year || null,
      car?.color || null,
      car?.license_plate || null,
      userId,
    ];

    const result = await db.query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Driver application submitted successfully for user:", userId);

    return res.json({
      success: true,
      message: "Driver application submitted successfully",
    });
  } catch (error) {
    console.error("❌ DB ERROR:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};