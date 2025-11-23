import express from "express";
import { professionalController } from "../controllers/ProfessionalController.js";
import { authMiddleware } from "../middleware/authMiddleware.js"; // JWT middleware

const router = express.Router();

// PROFESSIONAL ROUTES
router.post("/register", authMiddleware, professionalController.registerProfessional);
router.get("/me", authMiddleware, professionalController.getProfessionalByJwt);
router.get("/:id", professionalController.getProfessionalById);
router.get("/", professionalController.getAllProfessionals); // can be public

export default router;
