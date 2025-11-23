import { body, validationResult } from "express-validator";

export const validateRegisterRequest = [
  body("username")
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 5, max: 20 }).withMessage("Username must be between 5 and 20 characters"),
  body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8, max: 30 }).withMessage("Password must be between 8 and 30 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];


export const mapRegisterRequestDto = (body) => ({
  username: body.username,
  email: body.email,
  password: body.password,
});
