// src/models/index.js
import { sequelize } from "../config/database.js"; // your Sequelize instance
import { User } from "./User.js";
import { Professional } from "./Professional.js";
import { Appointment } from "./Appointment.js";
import { Availability } from "./Availability.js";
import { Review } from "./Review.js";

// ========================
// Define relationships here
// ========================
User.hasOne(Professional, { foreignKey: "user_id", as: "professionalProfile" });
Professional.belongsTo(User, { foreignKey: "user_id", as: "user" });

User.hasMany(Review, { foreignKey: "user_id", as: "reviewsGiven" });
Review.belongsTo(User, { foreignKey: "user_id", as: "reviewer" });

Professional.hasMany(Review, { foreignKey: "professional_id", as: "reviewsReceived" });
Review.belongsTo(Professional, { foreignKey: "professional_id", as: "professional" });

User.hasMany(Availability, { foreignKey: "user_id", as: "availabilities" });
Availability.belongsTo(User, { foreignKey: "user_id", as: "user" });

Professional.hasMany(Availability, { foreignKey: "professional_id", as: "professionalAvailabilities" });
Availability.belongsTo(Professional, { foreignKey: "professional_id", as: "professional" });

User.hasMany(Appointment, { foreignKey: "user_id", as: "appointments" });
Appointment.belongsTo(User, { foreignKey: "user_id", as: "user" });

Professional.hasMany(Appointment, { foreignKey: "professional_id", as: "professionalAppointments" });
Appointment.belongsTo(Professional, { foreignKey: "professional_id", as: "professional" });

// Export everything
export { sequelize, User, Professional, Appointment, Availability, Review };