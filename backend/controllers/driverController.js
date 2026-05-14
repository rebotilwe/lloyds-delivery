import db from "../config/db.js";
import path from "path";

export const submitDriverApplication = async (req, res) => {
  try {
    const { userId, car_info } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Parse car info
    let car;
    try {
      car = JSON.parse(car_info);
    } catch (e) {
      car = car_info;
    }

    // Get uploaded file paths - convert to relative URLs
    const getRelativePath = (file) => {
      if (!file) return null;
      // Return just the filename with uploads/ prefix
      const filename = path.basename(file.path);
      return `/uploads/${filename}`;
    };

    const id_copy = getRelativePath(req.files?.id_copy?.[0]);
    const pdp = getRelativePath(req.files?.pdp?.[0]);
    const profile_photo = getRelativePath(req.files?.profile_photo?.[0]);
    const car_license = getRelativePath(req.files?.car_license?.[0]);

    if (!id_copy || !pdp || !profile_photo) {
      return res.status(400).json({ message: "Missing required files" });
    }

    // Update user with driver application data
    const sql = `
      UPDATE users 
      SET 
        driver_status = 'pending',
        id_copy = ?,
        pdp = ?,
        profile_photo = ?,
        car_license = ?,
        car_make = ?,
        car_model = ?,
        car_year = ?,
        car_color = ?,
        license_plate = ?
      WHERE id = ?
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

    await db.query(sql, values);

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