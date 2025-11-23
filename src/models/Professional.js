import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Professional = sequelize.define("Professional", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  profession: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  location: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  hourlyRate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
