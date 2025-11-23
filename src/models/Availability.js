import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Availability = sequelize.define("Availability", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  title: {
    type: DataTypes.STRING,
    allowNull: false,
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
});
