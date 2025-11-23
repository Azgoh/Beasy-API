import { body, validationResult } from "express-validator";

export const mapReviewRequestDto = (body) => ({
  professionalId: body.professionalId,
  score: body.score,
  review: body.review,
});

export const validateReviewRequest = [
  body("professionalId")
    .notEmpty().withMessage("Professional ID cannot be null")
    .isInt().withMessage("Professional ID must be a number"),
  body("score")
    .notEmpty().withMessage("Score cannot be null")
    .isInt({ min: 1, max: 5 }).withMessage("Score must be between 1 and 5"),
  body("review")
    .optional()
    .isLength({ max: 150 }).withMessage("Review must be up to 150 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
