import express from "express";
import { appointmentController } from "../controllers/AppointmentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js"; // assuming you have JWT auth

const router = express.Router();

// Book a new appointment
router.post("/book", authMiddleware, appointmentController.bookAppointment);

// Cancel an appointment
router.put("/cancel/:id", authMiddleware, appointmentController.cancelAppointment);

// Get all my appointments
router.get("/my", authMiddleware, appointmentController.getMyAppointments);

// Get appointment by ID
router.get("/:id", authMiddleware, appointmentController.getAppointmentById);

export default router;
