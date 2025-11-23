import express from "express";
import { availabilityController } from "../controllers/AvailabilityController.js";
import { authMiddleware } from "../middleware/authMiddleware.js"; // middleware to get req.user

const router = express.Router();

// PROFESSIONAL ROUTES
router.post("/professional/me/save", authMiddleware, availabilityController.saveAvailabilityForProfessional);
router.put("/professional/edit", authMiddleware, availabilityController.editAvailabilityForProfessional);
router.delete("/professional/delete/:id", authMiddleware, availabilityController.deleteAvailabilitySlotForProfessional);
router.get("/professional/me", authMiddleware, availabilityController.getMyProfessionalAvailability);
router.get("/professional/:id", availabilityController.getProfessionalAvailabilityById);

// USER ROUTES
router.post("/user/me/save", authMiddleware, availabilityController.addAvailabilitiesForUser);
router.get("/user/me", authMiddleware, availabilityController.getMyUserAvailability);
router.get("/user/:id", authMiddleware, availabilityController.getUserAvailabilityById);

export default router;
