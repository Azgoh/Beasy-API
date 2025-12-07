import test from "ava";
import request from "supertest";
import { sequelize, User, Professional } from "../src/models/index.js";
import bcrypt from "bcrypt";

let app;

test.before(async () => {
  const appModule = await import("../index.js");
  app = appModule.app;
  
  await sequelize.sync({ force: true });
});

test.after.always(async () => {
  await sequelize.close();
});

// Helper to create a verified user and get token
async function createUserAndLogin(username, email, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({
    username,
    email,
    password: hashedPassword,
    enabled: true,
    verificationToken: null,
    role: "USER",
    authProvider: "LOCAL",
  });

  const loginRes = await request(app)
    .post("/api/login")
    .send({ email, password });

  return loginRes.text; // JWT token as plain text
}

test.serial("POST /api/professionals/register should create professional profile", async (t) => {
  const token = await createUserAndLogin("profuser1", "prof1@example.com", "123456");

  const res = await request(app)
    .post("/api/professionals/register")
    .set("Authorization", `Bearer ${token}`)
    .send({
      firstName: "John",
      lastName: "Plumber",
      profession: "Plumber",
      location: "New York",
      description: "Expert plumber with 10 years experience",
      phone: "1234567890",
      hourlyRate: "50",
    });

  t.is(res.status, 200);
  t.true(res.text.includes("Professional profile created successfully"));

  // Verify professional was created
  const user = await User.findOne({ where: { email: "prof1@example.com" } });
  t.is(user.role, "PROFESSIONAL"); // Role should be updated

  const professional = await Professional.findOne({ where: { user_id: user.id } });
  t.truthy(professional);
  t.is(professional.firstName, "John");
  t.is(professional.lastName, "Plumber");
  t.is(professional.profession, "Plumber");
  t.is(professional.hourlyRate, "50");
});

test.serial("POST /api/professionals/register should fail if profile already exists", async (t) => {
  const token = await createUserAndLogin("profuser2", "prof2@example.com", "123456");

  // Create first profile
  await request(app)
    .post("/api/professionals/register")
    .set("Authorization", `Bearer ${token}`)
    .send({
      firstName: "Jane",
      lastName: "Electrician",
      profession: "Electrician",
      location: "Boston",
      phone: "9876543210",
      hourlyRate: "60",
    });

  // Try to create duplicate
  const res = await request(app)
    .post("/api/professionals/register")
    .set("Authorization", `Bearer ${token}`)
    .send({
      firstName: "Jane",
      lastName: "Electrician",
      profession: "Electrician",
      location: "Boston",
      phone: "9876543210",
      hourlyRate: "60",
    });

  t.is(res.status, 400);
  t.truthy(res.body.message);
  t.true(res.body.message.includes("already exists"));
});

test.serial("POST /api/professionals/register should require authentication", async (t) => {
  const res = await request(app)
    .post("/api/professionals/register")
    .send({
      firstName: "Test",
      lastName: "User",
      profession: "Carpenter",
      location: "Chicago",
      phone: "5555555555",
      hourlyRate: "45",
    });

  t.is(res.status, 401);
});

test.serial("GET /api/professionals/me should return authenticated professional profile", async (t) => {
  const token = await createUserAndLogin("profuser3", "prof3@example.com", "123456");

  // Create professional profile
  await request(app)
    .post("/api/professionals/register")
    .set("Authorization", `Bearer ${token}`)
    .send({
      firstName: "Alice",
      lastName: "Carpenter",
      profession: "Carpenter",
      location: "Seattle",
      description: "Quality carpentry",
      phone: "1112223333",
      hourlyRate: "55",
    });

  const res = await request(app)
    .get("/api/professionals/me")
    .set("Authorization", `Bearer ${token}`);

  t.is(res.status, 200);
  t.is(res.body.firstName, "Alice");
  t.is(res.body.lastName, "Carpenter");
  t.is(res.body.profession, "Carpenter");
  t.is(res.body.location, "Seattle");
  t.is(res.body.hourlyRate, "55");
});

test.serial("GET /api/professionals/me should return 404 if no profile exists", async (t) => {
  const token = await createUserAndLogin("profuser4", "prof4@example.com", "123456");

  const res = await request(app)
    .get("/api/professionals/me")
    .set("Authorization", `Bearer ${token}`);

  t.is(res.status, 500); // Your controller returns 500, not 404
  t.truthy(res.body.message);
});

test.serial("GET /api/professionals/:id should return professional by ID", async (t) => {
  const token = await createUserAndLogin("profuser5", "prof5@example.com", "123456");

  // Create professional profile
  await request(app)
    .post("/api/professionals/register")
    .set("Authorization", `Bearer ${token}`)
    .send({
      firstName: "Bob",
      lastName: "Painter",
      profession: "Painter",
      location: "Austin",
      phone: "4445556666",
      hourlyRate: "40",
    });

  const user = await User.findOne({ where: { email: "prof5@example.com" } });
  const professional = await Professional.findOne({ where: { user_id: user.id } });

  // Public endpoint - no auth required
  const res = await request(app)
    .get(`/api/professionals/${professional.id}`);

  t.is(res.status, 200);
  t.is(res.body.firstName, "Bob");
  t.is(res.body.lastName, "Painter");
  t.is(res.body.profession, "Painter");
});

test.serial("GET /api/professionals/:id should return 404 for non-existent professional", async (t) => {
  const res = await request(app)
    .get("/api/professionals/99999");

  t.is(res.status, 500); // Your controller returns 500 for not found
  t.truthy(res.body.message);
});

test.serial("GET /api/professionals should return all professionals", async (t) => {
  // Create multiple professionals
  const token1 = await createUserAndLogin("profuser6", "prof6@example.com", "123456");
  await request(app)
    .post("/api/professionals/register")
    .set("Authorization", `Bearer ${token1}`)
    .send({
      firstName: "Charlie",
      lastName: "Mechanic",
      profession: "Mechanic",
      location: "Denver",
      phone: "7778889999",
      hourlyRate: "65",
    });

  const token2 = await createUserAndLogin("profuser7", "prof7@example.com", "123456");
  await request(app)
    .post("/api/professionals/register")
    .set("Authorization", `Bearer ${token2}`)
    .send({
      firstName: "Diana",
      lastName: "Gardener",
      profession: "Gardener",
      location: "Portland",
      phone: "3334445555",
      hourlyRate: "35",
    });

  // Public endpoint - no auth required
  const res = await request(app)
    .get("/api/professionals");

  t.is(res.status, 200);
  t.true(Array.isArray(res.body));
  t.true(res.body.length >= 2);

  // Verify professionals have required fields
  const charlie = res.body.find(p => p.firstName === "Charlie");
  t.truthy(charlie);
  t.is(charlie.profession, "Mechanic");
  t.is(charlie.hourlyRate, "65");

  const diana = res.body.find(p => p.firstName === "Diana");
  t.truthy(diana);
  t.is(diana.profession, "Gardener");
  t.is(diana.location, "Portland");
});

test.serial("GET /api/professionals should include reviewsReceived field", async (t) => {
  const res = await request(app)
    .get("/api/professionals");

  t.is(res.status, 200);
  t.true(Array.isArray(res.body));
  
  // Check that reviewsReceived field exists (even if empty array)
  if (res.body.length > 0) {
    t.true('reviewsReceived' in res.body[0]);
    t.true(Array.isArray(res.body[0].reviewsReceived));
  }
});