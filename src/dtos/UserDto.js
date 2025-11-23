import { mapReviewResponseDto } from "./review.dto.js";

export const mapUserDto = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role, // assume stored as string
  enabled: user.enabled,
  authProvider: user.authProvider,
  reviewsGiven: user.reviewsGiven
    ? user.reviewsGiven.map(mapReviewResponseDto)
    : [],
});
