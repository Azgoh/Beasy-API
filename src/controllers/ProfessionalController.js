import professionalService from "../services/ProfessionalService.js";
import { Professional, Review, User } from "../models/index.js";
import { mapProfessionalDto } from "../mappers/ProfessionalMapper.js";

export const professionalController = {

  // POST /api/professionals/register
  async registerProfessional(req, res) {
    try {
      const dto = req.body;
      dto.userId = req.user.id;
      await professionalService.registerProfessional(dto);
      res.status(200).send("Professional profile created successfully");
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  },

  // GET /api/professionals/:id
  async getProfessionalById(req, res) {
    const { id } = req.params;
    try {
      const professional = await professionalService.getProfessionalById(id);
      if (!professional) return res.status(404).json({ message: "Professional not found" });
      res.json(mapProfessionalDto(professional));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/professionals/me
  async getProfessionalByJwt(req, res) {
    try {
      const professional = await professionalService.getAuthenticatedProfessional(req.user.id);
      if (!professional) return res.status(404).json({ message: "Professional profile not found" });
      res.json(mapProfessionalDto(professional));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/professionals
  async getAllProfessionals(_req, res) {
    try {
      // detect association aliases if defined
      const profAssocKeys = Professional.associations ? Object.keys(Professional.associations) : [];
      const reviewAssocKey = profAssocKeys.find((k) => /review/i.test(k));
      const reviewInclude = reviewAssocKey
        ? { model: Review, as: reviewAssocKey }
        : { model: Review };

      // try to also include reviewer user if Review has a user association
      const reviewAssocKeys = Review.associations ? Object.keys(Review.associations) : [];
      const reviewUserAssocKey = reviewAssocKeys.find((k) => /user/i.test(k));
      if (reviewUserAssocKey) reviewInclude.include = [{ model: User, as: reviewUserAssocKey }];

      const rows = await Professional.findAll({
        include: [reviewInclude],
        order: [["id", "ASC"]],
      });

      const result = rows.map((r) => {
        const p = r.get ? r.get({ plain: true }) : r;

        // normalize various possible include keys into reviewsReceived
        const possibleKeys = ["reviewsReceived", "reviews", "Reviews", "reviewEntity", "review_entity"];
        let reviews = [];
        for (const k of possibleKeys) {
          if (p[k]) {
            reviews = p[k];
            break;
          }
        }
        // ensure array and attach as reviewsReceived for mapper
        p.reviewsReceived = Array.isArray(reviews) ? reviews : [];

        return mapProfessionalDto(p);
      });

      return res.json(result);
    } catch (err) {
      console.error("getAllProfessionals error:", err);
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  },

};
