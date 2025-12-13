import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
});

let sequelize;

if (process.env.NODE_ENV === "test") {
  // SQLite για tests
  sequelize = new Sequelize({
    dialect: process.env.DB_DIALECT,
    storage: process.env.DB_STORAGE,
    logging: false,
  });
} else if (process.env.DATABASE_URL) {
  // 👉 Render / Production (Postgres via DATABASE_URL)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else {
  // 👉 Local Postgres
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      dialect: "postgres",
      logging: false,
    }
  );
}

export { sequelize };

export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(
      `Database connected successfully (${
        process.env.NODE_ENV === "test"
          ? "SQLite TEST"
          : process.env.DATABASE_URL
          ? "PostgreSQL (Render)"
          : "PostgreSQL (Local)"
      })`
    );
  } catch (err) {
    console.error("Unable to connect to database:", err);
    process.exit(1);
  }
};
