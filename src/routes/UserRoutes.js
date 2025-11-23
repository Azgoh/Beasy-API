import express from "express";
import { userController } from "../controllers/UserController.js";
import { authMiddleware } from "../middleware/authMiddleware.js"; // JWT middleware

const router = express.Router();

// Public endpoints
router.post("/register", userController.register);
router.get("/verify-email", userController.verifyEmail);
router.post("/login", userController.login);

// Authenticated endpoints
router.get("/users", authMiddleware, userController.getAllUsers);
router.get("/users/:id", authMiddleware, userController.getUserById);
router.get("/users/me", authMiddleware, userController.getUserByJwt);
router.delete("/users/deleteAll", authMiddleware, userController.deleteAllUsers);
router.get("/me", authMiddleware, userController.getMe);

export default router;
