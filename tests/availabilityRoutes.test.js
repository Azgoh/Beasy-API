import test from "ava";
import request from "supertest";
import { sequelize, User, Professional, Availability } from "../src/models/index.js";
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

// Counter to generate unique phone numbers
let phoneCounter = 1000000000;

// Helper to create a verified user and get token
async function createUserAndLogin(username, email, password, role = "USER") {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    enabled: true,
    verificationToken: null,
    role,
    authProvider: "LOCAL",
  });

  const loginRes = await request(app)
    .post("/api/login")
    .send({ email, password });

  return { token: loginRes.text, userId: user.id };
}

// Helper to create professional profile with unique phone
async function createProfessional(token, data) {
  const uniquePhone = String(phoneCounter++);
  
  const res = await request(app)
    .post("/api/professionals/register")
    .set("Authorization", `Bearer ${token}`)
    .send({
      firstName: data.firstName || "Test",
      lastName: data.lastName || "Professional",
      profession: data.profession || "Plumber",
      location: data.location || "New York",
      phone: uniquePhone,
      hourlyRate: data.hourlyRate || "50",
      ...data,
    });
  
  return res;
}

// =========================
// PROFESSIONAL ROUTES TESTS
// =========================

test.serial("POST /api/availability/professional/me/save should create availability slot", async (t) => {
  const { token, userId } = await createUserAndLogin("prof1", "prof1@test.com", "123456");
  await createProfessional(token, { firstName: "John", profession: "Plumber" });

  const res = await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Morning Shift",
      date: "2025-12-15",
      startTime: "09:00:00",
      endTime: "12:00:00",
    });

  t.is(res.status, 201);
  t.truthy(res.body.id);
  t.is(res.body.title, "Morning Shift");
  t.truthy(res.body.date);
  t.is(res.body.startTime, "09:00:00");
  t.is(res.body.endTime, "12:00:00");
  t.truthy(res.body.professional_id);
});

test.serial("POST /api/availability/professional/me/save should require authentication", async (t) => {
  const res = await request(app)
    .post("/api/availability/professional/me/save")
    .send({
      title: "Test",
      date: "2025-12-15",
      startTime: "09:00:00",
      endTime: "12:00:00",
    });

  t.is(res.status, 401);
});

test.serial("POST /api/availability/professional/me/save should fail without professional profile", async (t) => {
  const { token } = await createUserAndLogin("user1", "user1@test.com", "123456");

  const res = await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Test",
      date: "2025-12-15",
      startTime: "09:00:00",
      endTime: "12:00:00",
    });

  t.is(res.status, 400);
  t.truthy(res.body.message);
});

test.serial("PUT /api/availability/professional/edit should update availability slot", async (t) => {
  const { token } = await createUserAndLogin("prof2", "prof2@test.com", "123456");
  await createProfessional(token, { firstName: "Jane", profession: "Electrician" });

  // Create availability first
  const createRes = await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Morning Shift",
      date: "2025-12-16",
      startTime: "09:00:00",
      endTime: "12:00:00",
    });

  t.is(createRes.status, 201);
  const slotId = createRes.body.id;

  // Update it - must include date even if not changing
  const res = await request(app)
    .put("/api/availability/professional/edit")
    .set("Authorization", `Bearer ${token}`)
    .send({
      id: slotId,
      title: "Updated Shift",
      date: "2025-12-16",
      startTime: "10:00:00",
      endTime: "13:00:00",
    });

  t.is(res.status, 200);
  t.is(res.body.title, "Updated Shift");
  t.is(res.body.startTime, "10:00:00");
  t.is(res.body.endTime, "13:00:00");
});

test.serial("PUT /api/availability/professional/edit should fail for unauthorized professional", async (t) => {
  const { token: token1 } = await createUserAndLogin("prof3", "prof3@test.com", "123456");
  await createProfessional(token1, { firstName: "Alice" });

  const { token: token2 } = await createUserAndLogin("prof4", "prof4@test.com", "123456");
  await createProfessional(token2, { firstName: "Bob" });

  // Create availability with prof3
  const createRes = await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token1}`)
    .send({
      title: "Alice Shift",
      date: "2025-12-17",
      startTime: "09:00:00",
      endTime: "12:00:00",
    });

  const slotId = createRes.body.id;

  // Try to edit with prof4 (should fail)
  const res = await request(app)
    .put("/api/availability/professional/edit")
    .set("Authorization", `Bearer ${token2}`)
    .send({
      id: slotId,
      title: "Bob trying to edit",
      date: "2025-12-17",
      startTime: "10:00:00",
      endTime: "13:00:00",
    });

  t.is(res.status, 400);
  t.truthy(res.body.message);
});

test.serial("DELETE /api/availability/professional/delete/:id should delete availability slot", async (t) => {
  const { token } = await createUserAndLogin("prof5", "prof5@test.com", "123456");
  await createProfessional(token, { firstName: "Charlie" });

  // Create availability
  const createRes = await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "To Delete",
      date: "2025-12-18",
      startTime: "09:00:00",
      endTime: "12:00:00",
    });

  const slotId = createRes.body.id;

  // Delete it
  const res = await request(app)
    .delete(`/api/availability/professional/delete/${slotId}`)
    .set("Authorization", `Bearer ${token}`);

  t.is(res.status, 200);
  t.truthy(res.body.message);

  // Verify it's gone
  const slot = await Availability.findByPk(slotId);
  t.is(slot, null);
});

test.serial("DELETE /api/availability/professional/delete/:id should fail for unauthorized professional", async (t) => {
  const { token: token1 } = await createUserAndLogin("prof6", "prof6@test.com", "123456");
  await createProfessional(token1, { firstName: "Diana" });

  const { token: token2 } = await createUserAndLogin("prof7", "prof7@test.com", "123456");
  await createProfessional(token2, { firstName: "Eve" });

  // Create availability with prof6
  const createRes = await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token1}`)
    .send({
      title: "Diana Shift",
      date: "2025-12-19",
      startTime: "09:00:00",
      endTime: "12:00:00",
    });

  const slotId = createRes.body.id;

  // Try to delete with prof7 (should fail)
  const res = await request(app)
    .delete(`/api/availability/professional/delete/${slotId}`)
    .set("Authorization", `Bearer ${token2}`);

  t.is(res.status, 400);
  t.truthy(res.body.message);
});

test.serial("GET /api/availability/professional/me should return authenticated professional's availability", async (t) => {
  const { token } = await createUserAndLogin("prof8", "prof8@test.com", "123456");
  await createProfessional(token, { firstName: "Frank" });

  // Create multiple slots
  await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Slot 1",
      date: "2025-12-20",
      startTime: "09:00:00",
      endTime: "12:00:00",
    });

  await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Slot 2",
      date: "2025-12-20",
      startTime: "14:00:00",
      endTime: "17:00:00",
    });

  const res = await request(app)
    .get("/api/availability/professional/me")
    .set("Authorization", `Bearer ${token}`);

  t.is(res.status, 200);
  t.true(Array.isArray(res.body));
  t.true(res.body.length >= 2);
  
  const slot1 = res.body.find(s => s.title === "Slot 1");
  t.truthy(slot1);
  t.is(slot1.startTime, "09:00:00");
});

test.serial("GET /api/availability/professional/:id should return professional's availability by ID (public)", async (t) => {
  const { token, userId } = await createUserAndLogin("prof9", "prof9@test.com", "123456");
  await createProfessional(token, { firstName: "Grace" });

  // Get professional ID
  const professional = await Professional.findOne({ where: { user_id: userId } });
  t.truthy(professional, "Professional profile should exist");

  // Create availability
  await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Public Slot",
      date: "2025-12-21",
      startTime: "09:00:00",
      endTime: "12:00:00",
    });

  // Public endpoint - no auth required
  const res = await request(app)
    .get(`/api/availability/professional/${professional.id}`);

  t.is(res.status, 200);
  t.true(Array.isArray(res.body));
  t.true(res.body.length >= 1);
  
  const slot = res.body.find(s => s.title === "Public Slot");
  t.truthy(slot);
});

// ===================
// USER ROUTES TESTS
// ===================

test.serial("POST /api/availability/user/me/save should create user availabilities in batch", async (t) => {
  const { token } = await createUserAndLogin("user2", "user2@test.com", "123456");

  const res = await request(app)
    .post("/api/availability/user/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      availabilities: [
        {
          title: "User Slot 1",
          date: "2025-12-22",
          startTime: "09:00:00",
          endTime: "11:00:00",
        },
        {
          title: "User Slot 2",
          date: "2025-12-22",
          startTime: "13:00:00",
          endTime: "15:00:00",
        },
      ],
    });

  // Check what status your controller actually returns
  t.true(res.status === 200 || res.status === 201);
  t.true(Array.isArray(res.body));
  t.true(res.body.length >= 2);
});

test.serial("POST /api/availability/user/me/save should require authentication", async (t) => {
  const res = await request(app)
    .post("/api/availability/user/me/save")
    .send({
      availabilities: [
        {
          title: "Test",
          date: "2025-12-22",
          startTime: "09:00:00",
          endTime: "11:00:00",
        },
      ],
    });

  t.is(res.status, 401);
});

test.serial("GET /api/availability/user/me should return authenticated user's availability", async (t) => {
  const { token } = await createUserAndLogin("user3", "user3@test.com", "123456");

  // Create user availability
  await request(app)
    .post("/api/availability/user/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      availabilities: [
        {
          title: "My User Slot",
          date: "2025-12-23",
          startTime: "10:00:00",
          endTime: "12:00:00",
        },
      ],
    });

  const res = await request(app)
    .get("/api/availability/user/me")
    .set("Authorization", `Bearer ${token}`);

  t.is(res.status, 200);
  t.true(Array.isArray(res.body));
  t.true(res.body.length >= 1);

  const slot = res.body.find(s => s.title === "My User Slot");
  t.truthy(slot);
});

test.serial("GET /api/availability/user/:id should return user's availability by ID", async (t) => {
  const { token, userId } = await createUserAndLogin("user4", "user4@test.com", "123456");

  // Create user availability
  await request(app)
    .post("/api/availability/user/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      availabilities: [
        {
          title: "User by ID Slot",
          date: "2025-12-24",
          startTime: "11:00:00",
          endTime: "13:00:00",
        },
      ],
    });

  // Need auth to access this endpoint
  const res = await request(app)
    .get(`/api/availability/user/${userId}`)
    .set("Authorization", `Bearer ${token}`);

  t.is(res.status, 200);
  t.true(Array.isArray(res.body));
  t.true(res.body.length >= 1);

  const slot = res.body.find(s => s.title === "User by ID Slot");
  t.truthy(slot);
});

test.serial("Availability slots should be ordered by date and time", async (t) => {
  const { token } = await createUserAndLogin("prof10", "prof10@test.com", "123456");
  await createProfessional(token, { firstName: "Henry" });

  // Create slots in random order
  await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Slot C",
      date: "2025-12-26",
      startTime: "14:00:00",
      endTime: "16:00:00",
    });

  await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Slot A",
      date: "2025-12-25",
      startTime: "09:00:00",
      endTime: "11:00:00",
    });

  await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Slot B",
      date: "2025-12-25",
      startTime: "14:00:00",
      endTime: "16:00:00",
    });

  const res = await request(app)
    .get("/api/availability/professional/me")
    .set("Authorization", `Bearer ${token}`);

  t.is(res.status, 200);
  t.true(res.body.length >= 3);

  // Should be ordered by date, then by time
  const slotA = res.body.find(s => s.title === "Slot A");
  const slotB = res.body.find(s => s.title === "Slot B");
  const slotC = res.body.find(s => s.title === "Slot C");

  const indexA = res.body.indexOf(slotA);
  const indexB = res.body.indexOf(slotB);
  const indexC = res.body.indexOf(slotC);

  t.true(indexA < indexB); // Same date, A is earlier time
  t.true(indexB < indexC); // C is later date
});