import reviewService from "../services/ReviewService.js";
import { mapReviewResponseDto, mapReviewResponseDtoList } from "../mappers/ReviewMapper.js";

export const reviewController = {

  // POST /api/reviews/add
  async addOrUpdateReview(req, res) {
    try {
      const reviewRequest = req.body;
      reviewRequest.userId = req.user.id;

      const review = await reviewService.addOrUpdateReview(reviewRequest);
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
      res.status(500).json({ message: "Internal server error" });
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
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/reviews/my-received-reviews
  async getMyReceivedReviewsAsAProfessional(req, res) {
    try {
      const professionalId = req.user.professionalId; 
      const reviews = await reviewService.getMyReceivedReviewsAsAProfessional(professionalId);
      res.json(mapReviewResponseDtoList(reviews));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
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
      res.status(500).json({ message: "Internal server error" });
    }
  },

};
