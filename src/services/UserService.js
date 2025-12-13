import { User, Professional } from "../models/index.js";
import bcrypt from "bcryptjs";
import { generateToken, verifyToken } from "../utils/jwt.js";
import { v4 as uuidv4 } from "uuid";
import emailService from "./EmailService.js"; 
import { Op } from "sequelize";
import { mapUserDto } from "../mappers/UserMapper.js";

export class userService {

  // Register a new user
  async registerUser({ username, email, password, role }) {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) throw new Error("Username exists");

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) throw new Error("Email already registered");

    const token = uuidv4();

    const newUser = await User.create({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      enabled: true,
      role: role || "USER",
      authProvider: "LOCAL",
      verificationToken: null, // Auto-verify for simplicity
    });

    // const confirmationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`; // Change this to http://localhost:8080/api for local dev
    // await emailService.sendEmail(email, "Email Verification", `Click this link to verify your email: ${confirmationUrl}`);

    return { message: "User registered successfully." };
  }

  // Verify email token
  async validateVerificationToken(token) {
    const user = await User.findOne({ where: { verificationToken: token } });
    if (!user) return "Invalid";

    user.enabled = true;
    user.verificationToken = null;
    await user.save();

    return "Valid";
  }

  // Login user and return JWT token string
  async loginUser(payload) {
    const identifier = payload && (payload.identifier || payload.username || payload.email);
    const password = payload && payload.password;

    if (!identifier || !password) throw new Error("Missing credentials");

    const user = await User.findOne({
      where: {
        [Op.or]: [{ username: identifier }, { email: identifier }],
      },
    });

    if (!user) throw new Error("Invalid credentials");
    if (!user.enabled) throw new Error("Account not enabled. Verify your email.");
    if (user.authProvider !== "LOCAL") throw new Error("This account uses OAuth login");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    const token = generateToken({ id: user.id, role: user.role });
    
    return token; // Return token string only (your frontend expects this)
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

  // Auto-verify user by email (TEST ONLY - DO NOT USE IN PRODUCTION)
  async autoVerifyUserByEmail(email) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error("User not found");

    user.enabled = true;
    user.verificationToken = null;
    await user.save();

    return { message: "User auto-verified for testing", userId: user.id };
  }

}

export default new userService();
