import dotenv from "dotenv";
import { verifyToken } from "../utils/jwt.js";
import userService from "../services/UserService.js";

dotenv.config();

//Authenticate
export const authMiddleware = async (req, res, next) => {
 try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    // load user by id from payload and attach sanitized user info to req.user
    const user = await userService.getAuthenticatedUser(payload.id);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    // attach only the fields controllers need (avoid attaching sensitive fields)
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      enabled: user.enabled,
    };
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Unauthorized" });
  }
};
