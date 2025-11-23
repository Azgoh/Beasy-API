import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { Role } from "../enumerations/Role.js";
import { AuthProvider } from "../enumerations/AuthProvider.js";

export const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  role: {
    type: DataTypes.ENUM(...Object.values(Role)),
    allowNull: false,
  },

  authProvider: {
    type: DataTypes.ENUM(...Object.values(AuthProvider)),
    allowNull: false,
  },

  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});
