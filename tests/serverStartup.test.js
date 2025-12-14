import test from "ava";
import request from "supertest";
import { sequelize } from "../src/models/index.js";

// Note: Actual entry is /index.js (not src/index.js as per copilot-instructions)

test.before(async () => {
  await sequelize.sync({ force: true });
});

test.after.always(async () => {
  await sequelize.close();
});

test.serial("Express app should be exported and configured", async (t) => {
  // Import from root index.js
  const appModule = await import("../index.js");

  t.truthy(appModule.app, "Express app should be exported");
  t.is(
    typeof appModule.app.listen,
    "function",
    "App should be Express instance"
  );
});

test.serial("Database connection should be established", async (t) => {
  try {
    await sequelize.authenticate();
    t.pass("Database connection is established");
  } catch (error) {
    t.fail(`Database connection failed: ${error.message}`);
  }
});

test.serial("Database models should be synced", async (t) => {
  const models = sequelize.models;

  t.truthy(models.User, "User model should exist");
  t.truthy(models.Professional, "Professional model should exist");
  t.truthy(models.Availability, "Availability model should exist");
  t.truthy(models.Appointment, "Appointment model should exist");
  t.truthy(models.Review, "Review model should exist");
});

test.serial("Sequelize should be properly configured", async (t) => {
  const options = sequelize.options;

  t.truthy(options.dialect, "Should have a dialect configured");
  // Test environment uses sqlite, production uses postgres
  t.true(
    options.dialect === "sqlite" || options.dialect === "postgres",
    "Should use sqlite (test) or postgres (production)"
  );
});

test.serial("Database should support transactions", async (t) => {
  const transaction = await sequelize.transaction();

  try {
    t.truthy(transaction, "Transaction should be created");
    await transaction.commit();
    t.pass("Transaction commit works");
  } catch (error) {
    await transaction.rollback();
    t.fail(`Transaction failed: ${error.message}`);
  }
});

test.serial("Database should handle basic queries", async (t) => {
  try {
    const result = await sequelize.query("SELECT 1 as test");
    t.truthy(result, "Query should execute");
    t.is(result[0][0].test, 1, "Query should return correct result");
  } catch (error) {
    t.fail(`Query failed: ${error.message}`);
  }
});

test.serial("Models should have proper table names", async (t) => {
  const { User, Professional, Appointment, Review, Availability } =
    sequelize.models;

  t.truthy(User.tableName, "User model should have table name");
  t.truthy(Professional.tableName, "Professional model should have table name");
  t.truthy(Appointment.tableName, "Appointment model should have table name");
  t.truthy(Review.tableName, "Review model should have table name");
  t.truthy(Availability.tableName, "Availability model should have table name");
});

test.serial("Sequelize should use correct environment", async (t) => {
  const env = process.env.NODE_ENV;

  t.is(env, "test", "Should be running in test environment");

  const dbUrl = process.env.DB_URL || null;
  const dbName = process.env.DB_NAME || null;
  const dbDialect = process.env.DB_DIALECT || "sqlite";
  const dbStorage = process.env.DB_STORAGE || ":memory:";

  t.truthy(
    dbUrl || dbName || (dbDialect === "sqlite" && dbStorage),
    "Should have database configured"
  );
});

test.serial("Database should handle model creation", async (t) => {
  const { User } = sequelize.models;

  const testUser = await User.create({
    username: "testdbuser",
    email: "testdb@example.com",
    password: "hashedpass",
    enabled: true,
    role: "USER",
    authProvider: "LOCAL",
  });

  t.truthy(testUser.id, "Created user should have ID");
  t.is(testUser.username, "testdbuser");

  await testUser.destroy();
});

test.serial("Database should handle model queries", async (t) => {
  const { User } = sequelize.models;

  await User.create({
    username: "queryuser",
    email: "query@example.com",
    password: "hashedpass",
    enabled: true,
    role: "USER",
    authProvider: "LOCAL",
  });

  const found = await User.findOne({ where: { username: "queryuser" } });

  t.truthy(found, "Should find created user");
  t.is(found.username, "queryuser");

  await found.destroy();
});

test.serial(
  "Server should have proper middleware and routes configured",
  async (t) => {
    // Import from root index.js
    const appModule = await import("../index.js");
    const app = appModule.app;

    // Test that app responds to requests (proves middleware is working)
    const res = await request(app).get("/");

    t.is(res.status, 200, "App should respond to root route");
    t.truthy(res.text, "Response should have content");
  }
);

test.serial("Server should have CORS middleware configured", async (t) => {
  const appModule = await import("../index.js");
  const app = appModule.app;

  const res = await request(app)
    .get("/api/professionals")
    .set("Origin", "http://localhost:4200");

  t.truthy(
    res.headers["access-control-allow-origin"],
    "CORS headers should be set"
  );
});

test.serial("Server should have JSON body parser configured", async (t) => {
  const appModule = await import("../index.js");
  const app = appModule.app;

  const res = await request(app)
    .post("/api/register")
    .send({ username: "test", email: "test@test.com", password: "pass" });

  // Should accept JSON (either succeed or return validation error, not 415)
  t.true(res.status !== 415, "App should parse JSON bodies");
});

test.serial(
  "Server should have auth middleware protecting routes",
  async (t) => {
    const appModule = await import("../index.js");
    const app = appModule.app;

    const res = await request(app).get("/api/users/me");

    t.is(res.status, 401, "Protected routes should require authentication");
  }
);

test.serial("Server should mount all route handlers", async (t) => {
  const appModule = await import("../index.js");
  const app = appModule.app;

  // Test that key routes are mounted
  const routes = [
    { path: "/api/professionals", method: "get" },
    { path: "/api/register", method: "post" },
    { path: "/api/login", method: "post" },
  ];

  for (const route of routes) {
    const res = await request(app)[route.method](route.path);

    // Should not be 404 (route exists, even if auth fails)
    t.true(
      res.status !== 404,
      `Route ${route.method.toUpperCase()} ${route.path} should be mounted`
    );
  }
});

test.serial("Server should have swagger documentation mounted", async (t) => {
  // index.js has swagger-ui-express
  const appModule = await import("../index.js");
  const app = appModule.app;

  const res = await request(app).get("/api-docs/");

  // Swagger should be mounted (200, 301, or 302)
  t.true(
    [200, 301, 302].includes(res.status),
    "Swagger docs should be accessible"
  );
});
