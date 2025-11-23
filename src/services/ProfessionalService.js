import { Professional, User } from "../models/index.js";

export class professionalService {

  // Register a professional profile for the authenticated user
  async registerProfessional(dto) {
    // normalize userId: accept either a primitive id or an object like req.user
    let userId = dto && (dto.userId || (dto.user && dto.user.id));
    if (typeof userId === "object" && userId !== null) {
      userId = userId.id || userId.userId;
    }
    if (!userId) throw new Error("Invalid or missing userId");

    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");

    const existingProfile = await Professional.findOne({ where: { user_id: userId } });
    if (existingProfile) throw new Error("Professional profile already exists for this user");

    const professional = await Professional.create({
      user_id: userId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      profession: dto.profession,
      location: dto.location,
      description: dto.description,
      phone: dto.phone,
      hourlyRate: dto.hourlyRate,
    });

    // Update user's role to PROFESSIONAL
    user.role = "PROFESSIONAL";
    await user.save();

    return professional;
  }

  // Get the authenticated professional
  async getAuthenticatedProfessional(userId) {
    const professional = await Professional.findOne({
      where: { user_id: userId },
    });
    if (!professional) throw new Error("Professional not found");
    return professional;
  }

  // Get professional by ID
  async getProfessionalById(professionalId) {
    const professional = await Professional.findByPk(professionalId);
    if (!professional) throw new Error("Professional not found");
    return professional;
  }

  // Get all professionals
  async getAllProfessionals() {
    return await Professional.findAll();
  }

  // Search professionals by profession and location
  async searchProfessionals(profession, location) {
    return await Professional.findAll({
      where: {
        profession: profession.toLowerCase(),
        location: location.toLowerCase(),
      },
    });
  }

  // Update professional profile
  async updateProfessional(professionalId, dto) {
    const professional = await this.getProfessionalById(professionalId);

    professional.firstName = dto.firstName;
    professional.lastName = dto.lastName;
    professional.profession = dto.profession;
    professional.location = dto.location;
    professional.description = dto.description;
    professional.phone = dto.phone;
    professional.hourlyRate = dto.hourlyRate;

    return await professional.save();
  }

}

export default new professionalService();
