// index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
const swaggerDocument = JSON.parse(readFileSync('./docs/swagger.json', 'utf8'));

// Import route files
import userRoutes from "./src/routes/UserRoutes.js";
import professionalRoutes from "./src/routes/ProfessionalRoutes.js";
import reviewRoutes from "./src/routes/ReviewRoutes.js";
import availabilityRoutes from "./src/routes/AvailabilityRoutes.js";
import appointmentRoutes from "./src/routes/AppointmentRoutes.js";

// Import DB
import * as models from "./src/models/index.js";
import runSeed from "./src/seed/runSeed.js";

dotenv.config();
const app = express();

// Middlewares
app.use(cors({ origin: "http://localhost:4200" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Test route
app.get("/", (req, res) => res.send("API is running"));

// Routes
app.use("/api", userRoutes);
app.use("/api/professionals", professionalRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/appointments", appointmentRoutes);

// Add before routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Start server
const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    // Test DB connection
    await models.sequelize.authenticate();
    console.log("Database connected successfully!");

    // If you want to drop tables on every startup set RESET_DB=true
    const reset = process.env.RESET_DB === "true";
    // sync options: force when RESET_DB=true, otherwise respect SYNC_ALTER
    const syncOptions = {
      force: reset,
      alter: !reset && process.env.SYNC_ALTER === "true",
    };

    await models.sequelize.sync(syncOptions);
    console.log(
      `All models were synchronized successfully. force=${syncOptions.force}, alter=${syncOptions.alter}`
    );

    // Run JS seeder when SEED=true or when RESET_DB=true (so fresh DB gets seeded)
    if (process.env.SEED === "true" || reset) {
      try {
        console.log("Running JS model-based seed...");
        await runSeed(models);
        console.log("Seeding completed (via models).");
      } catch (seedErr) {
        console.error("JS seeding failed:", seedErr);
      }
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Unable to connect to DB or start server:", err);
    process.exit(1);
  }
}

startServer();