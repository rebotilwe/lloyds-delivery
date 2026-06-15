import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { sendPackageRejectionEmail } from "../services/emailService.js";

const router = express.Router();

// Send package rejection email
router.post("/send-rejection-email", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { 
      orderId, 
      customerEmail, 
      customerName, 
      rejectionReason, 
      pickupAddress, 
      deliveryAddress, 
      packageWeight, 
      orderTotal 
    } = req.body;
    
    if (!customerEmail || !rejectionReason) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    const order = {
      id: orderId,
      customer_email: customerEmail,
      customer_name: customerName,
      pickup_address: pickupAddress,
      delivery_address: deliveryAddress,
      package_weight: packageWeight,
      total: orderTotal
    };
    
    await sendPackageRejectionEmail(order, rejectionReason);
    
    res.json({ success: true, message: "Rejection email sent successfully" });
  } catch (error) {
    console.error("Error sending rejection email:", error);
    res.status(500).json({ message: "Failed to send email" });
  }
});

export default router;