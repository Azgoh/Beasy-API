import * as availabilityService from "../services/AvailabilityService.js";
import { Professional } from "../models/index.js";

export const availabilityController = {
  // PROFESSIONAL ENDPOINTS

  // POST /api/availability/professional/me/save
  async saveAvailabilityForProfessional(req, res) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const userId = typeof req.user === "object"
        ? (req.user.id ?? (req.user.dataValues && req.user.dataValues.id))
        : req.user;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const professional = await Professional.findOne({ where: { user_id: userId } });
      if (!professional) return res.status(400).json({ message: "No professional profile for current user" });

      const dto = req.body || {};
      const saved = await availabilityService.saveAvailabilityForProfessional(dto, professional.id);

      // debug log to confirm server returns created object
      console.log("Saved availability (returned to client):", saved);

      return res.status(201).json(saved);
    } catch (err) {
      console.error(err);
      return res.status(400).json({ message: err.message || "Bad request" });
    }
  },

  // PUT /api/availability/professional/edit
  async editAvailabilityForProfessional(req, res) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const userId =
        typeof req.user === "object"
          ? req.user.id ?? (req.user.dataValues && req.user.dataValues.id)
          : req.user;
      const professional = await Professional.findOne({
        where: { user_id: userId },
      });
      if (!professional)
        return res
          .status(400)
          .json({ message: "No professional profile for current user" });

      const dto = req.body || {};
      const updated = await availabilityService.editAvailabilityForProfessional(
        dto,
        professional.id
      );
      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(400).json({ message: err.message || "Bad request" });
    }
  },

  // DELETE /api/availability/professional/delete/:id
  async deleteAvailabilitySlotForProfessional(req, res) {
    try {
      const { id } = req.params;
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      // pass req.user so service can resolve professional and authorize
      const result = await availabilityService.deleteAvailabilitySlotForProfessional(id, req.user);
      return res.status(200).json(result);
    } catch (err) {
      console.error(err);
      return res.status(400).json({ message: err.message || "Bad request" });
    }
  },

  // GET /api/availability/professional/me
  async getMyProfessionalAvailability(req, res) {
    try {
      const userId = req.user.id;
      const availability =
        await availabilityService.getMyProfessionalAvailability(userId);
      return res.json(availability);
    } catch (err) {
      console.error(err);
      return res.status(400).json({ message: err.message || "Bad request" });
    }
  },

  // GET /api/availability/professional/:id
  async getProfessionalAvailabilityById(req, res) {
    try {
      const { id } = req.params;
      const availabilities =
        await availabilityService.getProfessionalAvailability(id);
      res.json(availabilities);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },

  // USER ENDPOINTS

  // POST /api/availability/user/me/save
  async addAvailabilitiesForUser(req, res) {
    try {
      const batch = req.body.availabilities;
      const userId = req.user.id;
      const result = await availabilityService.saveAvailabilitiesForUser(
        batch,
        userId
      );
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  },

  // GET /api/availability/user/me
  async getMyUserAvailability(req, res) {
    try {
      const userId = req.user.id;
      const availabilities = await availabilityService.getMyUserAvailability(
        userId
      );
      res.json(availabilities);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },

  // GET /api/availability/user/:id
  async getUserAvailabilityById(req, res) {
    try {
      const { id } = req.params;
      const availabilities = await availabilityService.getUserAvailabilityById(
        id
      );
      res.json(availabilities);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },
};
