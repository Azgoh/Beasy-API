import { mapUserDto } from "./user.dto.js";
import { mapProfessionalDto } from "./professional.dto.js";

export const mapUserWithProfessionalDto = (user, professional = null) => ({
  userProfile: mapUserDto(user),
  professionalProfile: professional ? mapProfessionalDto(professional) : null,
});
