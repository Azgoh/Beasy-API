import { Review, User, Professional } from "../models/index.js";

export class reviewService {

  // Add or update a review
  async addOrUpdateReview(userId, reviewRequestDto) {
    const { professionalId, score, review: reviewText } = reviewRequestDto;

    if (score < 1 || score > 5) {
      throw new Error("Score must be between 1 and 5");
    }

    // Fetch professional
    const professional = await Professional.findByPk(professionalId);
    if (!professional) throw new Error("Professional not found");

    // Check if user already has a review for this professional
    let existingReview = await Review.findOne({
      where: { user_id: userId, professional_id: professionalId },
    });

    if (existingReview) {
      existingReview.score = score;
      existingReview.review = reviewText;
      existingReview.timestamp = new Date();
      return await existingReview.save();
    } else {
      return await Review.create({
        user_id: userId,
        professional_id: professionalId,
        score,
        review: reviewText,
        timestamp: new Date(),
      });
    }
  }

  // Get all reviews for a professional
  async getReviewsForProfessionalById(professionalId) {
    const professional = await Professional.findByPk(professionalId, {
      include: ["reviewsReceived"],
    });
    if (!professional) throw new Error("Professional not found");
    return professional.reviewsReceived;
  }

  // Get reviews received by current professional
  async getMyReceivedReviewsAsAProfessional(professionalId) {
    const professional = await Professional.findByPk(professionalId, {
      include: ["reviewsReceived"],
    });
    if (!professional) throw new Error("Professional not found");
    return professional.reviewsReceived;
  }

  // Get reviews given by current user
  async getMyGivenReviewsAsAUser(userId) {
    const user = await User.findByPk(userId, {
      include: ["reviewsGiven"],
    });
    if (!user) throw new Error("User not found");
    return user.reviewsGiven;
  }

  // Get average rating for a professional
  async getAverageRating(professionalId) {
    const reviews = await this.getReviewsForProfessionalById(professionalId);
    if (!reviews || reviews.length === 0) return 0.0;
    const total = reviews.reduce((sum, r) => sum + r.score, 0);
    return total / reviews.length;
  }
}

export default new reviewService();