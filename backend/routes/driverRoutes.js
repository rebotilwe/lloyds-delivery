import express from "express";
import { submitDriverApplication } from "../controllers/driverController.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.post(
  "/onboarding",
  upload.fields([
    { name: "id_copy", maxCount: 1 },
    { name: "pdp", maxCount: 1 },
    { name: "profile_photo", maxCount: 1 },
    { name: "car_license", maxCount: 1 },
  ]),
  submitDriverApplication
);

export default router;