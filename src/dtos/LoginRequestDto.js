import { body, validationResult } from "express-validator";

export const validateLoginRequest = [
  body("identifier").notEmpty().withMessage("Username or email is required"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8, max: 30 })
    .withMessage("Password must be between 8 and 30 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];


export const mapLoginRequestDto = (body) => ({
  identifier: body.identifier,
  password: body.password,
});
