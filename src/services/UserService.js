import { User, Professional } from "../models/index.js";
import bcrypt from "bcryptjs";
import { generateToken, verifyToken } from "../utils/jwt.js";
import { v4 as uuidv4 } from "uuid";
import emailService from "./EmailService.js"; 
import { Op } from "sequelize";

export class userService {

  // Register a new user
  async registerUser({ username, email, password }) {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) throw new Error("Username exists");

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) throw new Error("Email already registered");

    const token = uuidv4();

    const newUser = await User.create({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      enabled: false,
      role: "USER",
      authProvider: "LOCAL",
      verificationToken: token,
    });

    const confirmationUrl = `http://localhost:8080/api/verify-email?token=${token}`;
    await emailService.sendEmail(email, "Email Verification", `Click this link to verify your email: ${confirmationUrl}`);

    return { message: "Registration successful. Please check your email." };
  }

  // Verify email token
  async validateVerificationToken(token) {
    const user = await User.findOne({ where: { verificationToken: token } });
    if (!user) return "Invalid";

    user.enabled = true;
    user.verificationToken = null; // optional: clear token
    await user.save();

    return "Valid";
  }

  // Login user and return JWT
  async loginUser(payload) {
    // accept { identifier, username, email, password }
    const identifier = payload && (payload.identifier || payload.username || payload.email);
    const password = payload && payload.password;

    if (!identifier || !password) throw new Error("Missing credentials");

    const user = await User.findOne({
      where: {
        [Op.or]: [{ username: identifier }, { email: identifier }],
      },
    });

    if (!user) throw new Error("User not found");
    if (!user.enabled) throw new Error("Account not enabled. Verify your email.");
    if (user.authProvider !== "LOCAL") throw new Error("This account uses OAuth login");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    const token = generateToken({ id: user.id, role: user.role });
    return token;
  }

  // Get currently authenticated user from JWT payload
  async getAuthenticatedUser(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");
    return user;
  }

  // Get user by ID
  async getUserById(id) {
    const user = await User.findByPk(id);
    if (!user) throw new Error("User not found");
    return user;
  }

  // List all users
  async getAllUsers() {
    return await User.findAll();
  }

  // Delete all users (admin only)
  async deleteAllUsers() {
    await User.destroy({ where: {} });
    return { message: "All users deleted successfully" };
  }

}

export default new userService();
