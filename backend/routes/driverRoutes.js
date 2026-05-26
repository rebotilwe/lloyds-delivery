import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { submitDriverApplication } from "../controllers/driverController.js";

// Ensure drivers directory exists
const driversDir = path.join(process.cwd(), 'uploads', 'drivers');
if (!fs.existsSync(driversDir)) {
  fs.mkdirSync(driversDir, { recursive: true });
}

const driverDocumentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, driversDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fieldName = file.fieldname;
    // Clean filename: remove spaces, add proper extension
    const cleanName = fieldName + '-' + uniqueSuffix + path.extname(file.originalname);
    cb(null, cleanName);
  }
});

const documentFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDF files are allowed'), false);
  }
};

const uploadDriverDocs = multer({ 
  storage: driverDocumentStorage, 
  fileFilter: documentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const router = express.Router();

router.post(
  "/onboarding",
  uploadDriverDocs.fields([
    { name: "id_copy", maxCount: 1 },
    { name: "pdp", maxCount: 1 },
    { name: "profile_photo", maxCount: 1 },
    { name: "car_license", maxCount: 1 },
  ]),
  submitDriverApplication
);

export default router;