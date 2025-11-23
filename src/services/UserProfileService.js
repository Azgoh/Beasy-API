import userService from "./UserService.js";
import { Professional } from "../models/index.js";
import { mapUserDto } from "../mappers/UserMapper.js";
import { mapProfessionalDto } from "../mappers/ProfessionalMapper.js";

/**
 * Return a JSON object shaped for the frontend:
 * { userProfile: {...}, professionalProfile: {...} | null }
 * Accepts either a primitive id or a user object (req.user).
 */
const normalizeId = (userOrId) => {
  if (!userOrId) return null;
  if (typeof userOrId === "object") return userOrId.id ?? userOrId.userId ?? userOrId.user_id ?? null;
  return userOrId;
};

export async function getCurrentUserWithProfessional(userOrId) {
  const id = normalizeId(userOrId);
  if (!id) throw new Error("Invalid or missing user id");

  const user = await userService.getAuthenticatedUser(id);
  // Professional model uses user_id column in DB; find by that column
  const professional = await Professional.findOne({ where: { user_id: id } });

  return {
    userProfile: mapUserDto(user),
    professionalProfile: professional ? mapProfessionalDto(professional) : null,
  };
}

export default { getCurrentUserWithProfessional };

