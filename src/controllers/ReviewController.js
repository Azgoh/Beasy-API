import reviewService from "../services/ReviewService.js";
import { mapReviewResponseDto, mapReviewResponseDtoList } from "../mappers/ReviewMapper.js";
import { Professional } from "../models/index.js";

export const reviewController = {

  // POST /api/reviews/add
  async addOrUpdateReview(req, res) {
    try {
      const userId = req.user.id;
      const reviewRequestDto = req.body;

      const review = await reviewService.addOrUpdateReview(userId, reviewRequestDto);
      res.json(mapReviewResponseDto(review));
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  },

  // GET /api/reviews/professionals/:professionalId
  async getReviewsForProfessionalById(req, res) {
    const { professionalId } = req.params;
    try {
      const reviews = await reviewService.getReviewsForProfessionalById(professionalId);
      res.json(mapReviewResponseDtoList(reviews));
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  },

  // GET /api/reviews/professionals/:professionalId/average
  async getAverageRatingByProfessionalId(req, res) {
    const { professionalId } = req.params;
    try {
      const avg = await reviewService.getAverageRating(professionalId);
      res.json(avg);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  },

  // GET /api/reviews/my-received-reviews
  async getMyReceivedReviewsAsAProfessional(req, res) {
    try {
      const userId = req.user.id;

      // Find professional by user_id (following the pattern from professional registration)
      const professional = await Professional.findOne({ where: { user_id: userId } });
      if (!professional) {
        return res.status(400).json({ message: "Professional not found" });
      }

      const reviews = await reviewService.getMyReceivedReviewsAsAProfessional(professional.id);
      res.json(mapReviewResponseDtoList(reviews));
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  },

  // GET /api/reviews/my-given-reviews
  async getMyGivenReviewsAsAUser(req, res) {
    try {
      const userId = req.user.id;
      const reviews = await reviewService.getMyGivenReviewsAsAUser(userId);
      res.json(mapReviewResponseDtoList(reviews));
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  },

};
