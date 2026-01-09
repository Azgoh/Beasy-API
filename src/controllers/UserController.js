import userService from "../services/UserService.js";
import userProfileService from "../services/UserProfileService.js";
import { mapUserDto } from "../mappers/UserMapper.js";

export const userController = {

  // POST /api/register
  async register(req, res) {
    try {
      const request = req.body;
      await userService.registerUser(request);
      res.send("Registration successful! Please check your email to verify your account.");
    } catch (err) {
      console.error(err);
      res.status(400).send(err.message);
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
      res.status(400).send("Invalid verification token");
    }
  },

  // POST /api/login
  async login(req, res) {
    try {
      const request = req.body;
      const token = await userService.loginUser(request);
      res.send(token);
    } catch (err) {
      console.error(err);
      res.status(400).send(err.message);
    }
  },

  // GET /api/users
  async getAllUsers(_req, res) {
    try {
      const users = await userService.getAllUsers();
      const dtos = users.map(user => mapUserDto(user));
      res.json(dtos);
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal server error");
    }
  },

  // GET /api/users/:id
  async getUserById(req, res) {
    const { id } = req.params;
    try {
      if (id === "me") {
        if (!req.user) return res.status(401).send("Unauthorized");
        return res.json(mapUserDto(req.user));
      }

      const user = await userService.getUserById(id);
      if (!user) return res.status(404).send("User not found");
      res.json(mapUserDto(user));
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal server error");
    }
  },

  // GET /api/users/me
  async getUserByJwt(req, res) {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const user = await userService.getAuthenticatedUser(req.user.id);
      res.json(mapUserDto(user));
    } catch (err) {
      console.error(err);
      res.status(401).send("Unauthorized");
    }
  },

  // DELETE /api/users/deleteAll
  async deleteAllUsers(_req, res) {
    try {
      await userService.deleteAllUsers();
      res.send("All users deleted successfully");
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal server error");
    }
  },

  // GET /api/me
  async getMe(req, res) {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const dto = await userProfileService.getCurrentUserWithProfessional(req.user);
      return res.json(dto);
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal server error");
    }
  },

  // Auto-verify user for testing (TEST ONLY)
  async autoVerifyUser(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const result = await userService.autoVerifyUserByEmail(email);
      res.json(result);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }
};
