import { body, validationResult } from "express-validator";

export const validateExistingAvailabilityRequest = [
  body("id").notEmpty().withMessage("ID is required"),
  body("title").notEmpty().withMessage("Title is required"),
  body("date").notEmpty().withMessage("Date cannot be null").isISO8601().toDate(),
  body("startTime").notEmpty().withMessage("Start time cannot be null"),
  body("endTime").notEmpty().withMessage("End time cannot be null"),
  body().custom((value) => {
    const start = new Date(`1970-01-01T${value.startTime}:00`);
    const end = new Date(`1970-01-01T${value.endTime}:00`);
    if (start >= end) {
      throw new Error("Start time must be before end time");
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];


export const mapExistingAvailabilityRequestDto = (body) => ({
  id: body.id,
  title: body.title,
  date: body.date ? new Date(body.date) : null,
  startTime: body.startTime,
  endTime: body.endTime,
});
