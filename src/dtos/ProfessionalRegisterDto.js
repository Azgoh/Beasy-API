import { body, validationResult } from "express-validator";

export const validateProfessionalRegister = [
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
  body("profession").notEmpty().withMessage("Profession is required"),
  body("location").notEmpty().withMessage("Location is required"),
  body("description").optional().isLength({ max: 100 }).withMessage("Description can be up to 100 characters"),
  body("phone")
    .notEmpty().withMessage("Phone number is required")
    .isLength({ min: 10, max: 10 }).withMessage("Phone number must be 10 characters"),
  body("hourlyRate").notEmpty().withMessage("Hourly rate is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];


export const mapProfessionalRegisterDto = (body) => ({
  firstName: body.firstName,
  lastName: body.lastName,
  profession: body.profession,
  location: body.location,
  description: body.description,
  phone: body.phone,
  hourlyRate: body.hourlyRate,
});
