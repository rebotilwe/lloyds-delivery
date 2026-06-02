import express from "express";
import multer from "multer";
import { createClient } from '@supabase/supabase-js';
import db from "../config/db.js";

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Use memory storage (don't save to disk)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDF files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

router.post(
  "/onboarding",
  upload.fields([
    { name: "id_copy", maxCount: 1 },
    { name: "pdp", maxCount: 1 },
    { name: "profile_photo", maxCount: 1 },
    { name: "car_license", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { userId, car_info } = req.body;
      const files = req.files;

      console.log("📝 Processing driver application for userId:", userId);

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Parse car info
      let car = {};
      try {
        car = typeof car_info === 'string' ? JSON.parse(car_info) : (car_info || {});
      } catch (e) {
        car = {};
      }

      // Upload each file to Supabase Storage
      const fileUrls = {};
      const BUCKET_NAME = 'driver-docs';

      for (const [fieldName, fileArray] of Object.entries(files)) {
        const file = fileArray[0];
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}/${fieldName}-${Date.now()}.${fileExt}`;
        
        console.log(`📤 Uploading ${fieldName} to Supabase...`);
        
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          console.error(`Upload error for ${fieldName}:`, error);
          throw error;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(fileName);
        
        fileUrls[fieldName] = publicUrl;
        console.log(`✅ Uploaded ${fieldName}: ${publicUrl}`);
      }

      // Check required files
      if (!fileUrls.id_copy || !fileUrls.pdp || !fileUrls.profile_photo) {
        return res.status(400).json({ message: "Missing required files" });
      }

      // Update database
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
        fileUrls.id_copy,
        fileUrls.pdp,
        fileUrls.profile_photo,
        fileUrls.car_license || null,
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

      console.log("✅ Driver application submitted successfully");

      return res.json({
        success: true,
        message: "Driver application submitted successfully",
      });

    } catch (error) {
      console.error("❌ Error:", error);
      return res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);

export default router;