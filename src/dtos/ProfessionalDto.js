import { mapReviewResponseDto } from "./review.dto.js"; 

export const mapProfessionalDto = (professional) => ({
  id: professional.id,
  firstName: professional.firstName,
  lastName: professional.lastName,
  profession: professional.profession,
  location: professional.location,
  description: professional.description,
  phone: professional.phone,
  hourlyRate: professional.hourlyRate,
  reviewsReceived: professional.reviewsReceived
    ? professional.reviewsReceived.map(mapReviewResponseDto)
    : [],
});
