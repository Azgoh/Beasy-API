import test from "ava";
import request from "supertest";
import { sequelize, User } from "../src/models/index.js";
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

test.serial("POST /api/register should create a new user", async (t) => {
  const res = await request(app)
    .post("/api/register")
    .send({
      username: "testuser",
      email: "test@example.com",
      password: "123456",
      role: "USER",
    });

  t.is(res.status, 200);
  t.true(res.text.includes("Registration successful"));

  const user = await User.findOne({ where: { email: "test@example.com" } });
  t.truthy(user);
  t.is(user.username, "testuser");
  t.truthy(user.verificationToken);
  t.false(user.enabled);
});

test.serial("POST /api/login should return a JWT token", async (t) => {
  const hashedPassword = await bcrypt.hash("123456", 10);
  await User.create({
    username: "loginuser",
    email: "login@example.com",
    password: hashedPassword,
    enabled: true,
    verificationToken: null,
    role: "USER",
    authProvider: "LOCAL",
  });

  const res = await request(app)
    .post("/api/login")
    .send({ email: "login@example.com", password: "123456" });

  t.is(res.status, 200);
  t.truthy(res.text);
  t.true(res.text.length > 20);
});

test.serial("GET /api/users should return all users (requires auth)", async (t) => {
  const loginRes = await request(app)
    .post("/api/login")
    .send({ email: "login@example.com", password: "123456" });

  const token = loginRes.text;

  const res = await request(app)
    .get("/api/users")
    .set("Authorization", `Bearer ${token}`);

  t.is(res.status, 200);
  t.true(Array.isArray(res.body));
  t.true(res.body.length > 0);
});

test.serial("GET /api/users/:id should return user by id", async (t) => {
  const hashedPassword = await bcrypt.hash("123456", 10);
  const user = await User.create({
    username: "getbyiduser",
    email: "getbyid@example.com",
    password: hashedPassword,
    enabled: true,
    role: "USER",
    authProvider: "LOCAL",
  });

  const loginRes = await request(app)
    .post("/api/login")
    .send({ email: "getbyid@example.com", password: "123456" });

  const token = loginRes.text;

  const res = await request(app)
    .get(`/api/users/${user.id}`)
    .set("Authorization", `Bearer ${token}`);

  t.is(res.status, 200);
  t.is(res.body.email, user.email);
  t.is(res.body.username, user.username);
});

test.serial("GET /api/users/me should return authenticated user info", async (t) => {
  const loginRes = await request(app)
    .post("/api/login")
    .send({ email: "login@example.com", password: "123456" });

  const token = loginRes.text;

  const res = await request(app)
    .get("/api/users/me")
    .set("Authorization", `Bearer ${token}`);

  t.is(res.status, 200);
  t.is(res.body.email, "login@example.com");
});

test.serial("GET /api/me should return authenticated user profile", async (t) => {
  const loginRes = await request(app)
    .post("/api/login")
    .send({ email: "login@example.com", password: "123456" });

  const token = loginRes.text;

  const res = await request(app)
    .get("/api/me")
    .set("Authorization", `Bearer ${token}`);

  t.is(res.status, 200);
  
  // UserProfileService.getCurrentUserWithProfessional returns:
  // { userProfile: {...}, professionalProfile: {...} | null }
  t.truthy(res.body.userProfile);
  t.is(res.body.userProfile.email, "login@example.com");
  t.is(res.body.userProfile.username, "loginuser");
  
  // User is not a professional, so professionalProfile should be null
  t.is(res.body.professionalProfile, null);
});

test.serial("DELETE /api/users/deleteAll should delete all users", async (t) => {
  const loginRes = await request(app)
    .post("/api/login")
    .send({ email: "login@example.com", password: "123456" });

  const token = loginRes.text;

  const res = await request(app)
    .delete("/api/users/deleteAll")
    .set("Authorization", `Bearer ${token}`);

  t.is(res.status, 200);
  t.true(res.text.includes("All users deleted successfully"));

  const usersLeft = await User.findAll();
  t.is(usersLeft.length, 0);
});

test.serial("POST /api/login should fail for unverified user", async (t) => {
  const hashedPassword = await bcrypt.hash("123456", 10);
  await User.create({
    username: "unverified",
    email: "unverified@example.com",
    password: hashedPassword,
    enabled: false,
    verificationToken: "some-token",
    role: "USER",
    authProvider: "LOCAL",
  });

  const res = await request(app)
    .post("/api/login")
    .send({ email: "unverified@example.com", password: "123456" });

  t.is(res.status, 400);
  t.true(res.text.includes("not enabled") || res.text.includes("Verify"));
});
