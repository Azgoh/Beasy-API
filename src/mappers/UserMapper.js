import { mapReviewResponseDtoList } from "./ReviewMapper.js";

export const mapUserDto = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role, 
  enabled: user.enabled,
  authProvider: user.authProvider, 
  reviewsGiven: user.reviewsGiven ? mapReviewResponseDtoList(user.reviewsGiven) : [],
});
