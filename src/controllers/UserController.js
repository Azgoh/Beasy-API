import userService from "../services/UserService.js";
import userProfileService from "../services/UserProfileService.js";
import { mapUserDto } from "../mappers/UserMapper.js";

export const userController = {

  // POST /api/register
  async register(req, res) {
    try {
      const request = req.body;
      await userService.registerUser(request);
      res.status(200).send("Registration successful. Please check your email to verify your account.");
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  },

  // GET /api/verify-email?token=...
  async verifyEmail(req, res) {
    const { token } = req.query;
    try {
      const result = await userService.validateVerificationToken(token);
      const redirectUrl = `http://localhost:4200/verify-email?status=${result === "Valid" ? "success" : "fail"}`;
      res.redirect(302, redirectUrl);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid verification token" });
    }
  },

  // POST /api/login
  async login(req, res) {
    try {
      const request = req.body;
      const token = await userService.loginUser(request);
      res.status(200).send(token);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  },

  // GET /api/users
  async getAllUsers(req, res) {
    try {
      const users = await userService.getAllUsers();
      const dtos = users.map(user => mapUserDto(user));
      res.json(dtos);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/users/:id
  async getUserById(req, res) {
    const { id } = req.params;
    try {
      // support the common "me" shortcut (frontend calls /users/me)
      if (id === "me") {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        return res.json(mapUserDto(req.user));
      }

      const user = await userService.getUserById(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(mapUserDto(user));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/users/me
  async getUserByJwt(req, res) {
    try {
      const user = await userService.getAuthenticatedUser(req.user && req.user.id);
      res.json(mapUserDto(user));
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      res.json(mapUserDto(req.user));
    } catch (err) {
      console.error(err);
      res.status(401).json({ message: "Unauthorized" });
    }
  },

  // DELETE /api/users/deleteAll
  async deleteAllUsers(req, res) {
    try {
      // εδώ μπορείς να βάλεις έλεγχο για admin πχ req.user.role === 'ADMIN'
      await userService.deleteAllUsers();
      res.send("All users deleted successfully");
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/me
  async getMe(req, res) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const dto = await userProfileService.getCurrentUserWithProfessional(req.user);
      return res.json(dto);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
