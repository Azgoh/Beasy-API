import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { AppointmentStatus } from "../enumerations/AppointmentStatus.js";

export const Appointment = sequelize.define("Appointment", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  startTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },

  endTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },

  appointmentStatus: {
    type: DataTypes.ENUM(...Object.values(AppointmentStatus)),
    allowNull: false,
  },
});
