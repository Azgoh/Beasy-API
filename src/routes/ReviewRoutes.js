import express from "express";
import { reviewController } from "../controllers/ReviewController.js";
import { authMiddleware } from "../middleware/authMiddleware.js"; // JWT middleware

const router = express.Router();

// POST /api/reviews/add
router.post("/add", authMiddleware, reviewController.addOrUpdateReview);

// GET /api/reviews/professionals/:professionalId
router.get("/professionals/:professionalId", authMiddleware, reviewController.getReviewsForProfessionalById);

// GET /api/reviews/professionals/:professionalId/average
router.get("/professionals/:professionalId/average", authMiddleware, reviewController.getAverageRatingByProfessionalId);

// GET /api/reviews/my-received-reviews
router.get("/my-received-reviews", authMiddleware, reviewController.getMyReceivedReviewsAsAProfessional);

// GET /api/reviews/my-given-reviews
router.get("/my-given-reviews", authMiddleware, reviewController.getMyGivenReviewsAsAUser);

export default router;
