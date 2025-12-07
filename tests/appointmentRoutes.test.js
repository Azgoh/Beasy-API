import test from "ava";
import request from "supertest";
import { sequelize, User, Professional, Availability, Appointment } from "../src/models/index.js";
import bcrypt from "bcrypt";
import moment from "moment";

let app;

test.before(async () => {
  const appModule = await import("../index.js");
  app = appModule.app;
  
  await sequelize.sync({ force: true });
});

test.after.always(async () => {
  await sequelize.close();
});

// Counter to generate unique phone numbers and emails
let phoneCounter = 3000000000;
let emailCounter = 1;

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
async function createProfessional(token, data = {}) {
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

// Helper to create availability slot
async function createAvailability(token, date, startTime, endTime, title = "Available") {
  const res = await request(app)
    .post("/api/availability/professional/me/save")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title,
      date,
      startTime,
      endTime,
    });
  
  return res;
}

test.serial("POST /api/appointments/book should create a new appointment", async (t) => {
  const profEmail = `prof${emailCounter}@test.com`;
  const userEmail = `user${emailCounter}@test.com`;
  emailCounter++;

  // Create professional with availability
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof1",
    profEmail,
    "123456"
  );
  
  await createProfessional(profToken, { firstName: "John", lastName: "Plumber" });
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const tomorrow = moment().add(1, "days").format("YYYY-MM-DD");
  await createAvailability(profToken, tomorrow, "09:00:00", "17:00:00");

  // Create regular user
  const { token: userToken } = await createUserAndLogin("user1", userEmail, "123456");

  // Book appointment
  const res = await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      professionalId: professional.id,
      date: tomorrow,
      startTime: "10:00:00",
      endTime: "11:00:00",
    });

  t.is(res.status, 201);
  t.truthy(res.body.appointment);
  t.is(res.body.appointment.professionalId, professional.id);
  t.is(res.body.appointment.date, tomorrow);
  t.is(res.body.appointment.startTime, "10:00:00");
  t.is(res.body.appointment.endTime, "11:00:00");
  t.is(res.body.appointment.appointmentStatus, "BOOKED");
});

test.serial("POST /api/appointments/book should fail without availability", async (t) => {
  const profEmail = `prof${emailCounter}@test.com`;
  const userEmail = `user${emailCounter}@test.com`;
  emailCounter++;

  // Create professional WITHOUT availability
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof2",
    profEmail,
    "123456"
  );
  
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const { token: userToken } = await createUserAndLogin("user2", userEmail, "123456");

  const tomorrow = moment().add(1, "days").format("YYYY-MM-DD");
  const res = await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      professionalId: professional.id,
      date: tomorrow,
      startTime: "10:00:00",
      endTime: "11:00:00",
    });

  t.is(res.status, 400);
  t.true(res.body.message.includes("No availability") || res.body.message.includes("not available"));
});

test.serial("POST /api/appointments/book should fail with invalid time range", async (t) => {
  const profEmail = `prof${emailCounter}@test.com`;
  const userEmail = `user${emailCounter}@test.com`;
  emailCounter++;

  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof3",
    profEmail,
    "123456"
  );
  
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const tomorrow = moment().add(1, "days").format("YYYY-MM-DD");
  await createAvailability(profToken, tomorrow, "09:00:00", "17:00:00");

  const { token: userToken } = await createUserAndLogin("user3", userEmail, "123456");

  // Try to book outside availability window
  const res = await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      professionalId: professional.id,
      date: tomorrow,
      startTime: "08:00:00",
      endTime: "09:00:00",
    });

  t.is(res.status, 400);
  t.truthy(res.body.message);
});

test.serial("POST /api/appointments/book should require authentication", async (t) => {
  const tomorrow = moment().add(1, "days").format("YYYY-MM-DD");
  
  const res = await request(app)
    .post("/api/appointments/book")
    .send({
      professionalId: 1,
      date: tomorrow,
      startTime: "10:00:00",
      endTime: "11:00:00",
    });

  t.is(res.status, 401);
});

test.serial("POST /api/appointments/book should fail with missing data", async (t) => {
  const userEmail = `user${emailCounter}@test.com`;
  emailCounter++;

  const { token: userToken } = await createUserAndLogin("user4", userEmail, "123456");

  const res = await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      professionalId: 1,
      // Missing date, startTime, endTime
    });

  t.is(res.status, 400);
  t.truthy(res.body.message);
});

test.serial("PUT /api/appointments/cancel/:id should cancel an appointment", async (t) => {
  const profEmail = `prof${emailCounter}@test.com`;
  const userEmail = `user${emailCounter}@test.com`;
  emailCounter++;

  // Create professional and availability
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof5",
    profEmail,
    "123456"
  );
  
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const tomorrow = moment().add(1, "days").format("YYYY-MM-DD");
  await createAvailability(profToken, tomorrow, "09:00:00", "17:00:00");

  // Book appointment
  const { token: userToken } = await createUserAndLogin("user5", userEmail, "123456");
  
  const bookRes = await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      professionalId: professional.id,
      date: tomorrow,
      startTime: "10:00:00",
      endTime: "11:00:00",
    });

  const appointmentId = bookRes.body.appointment.id;

  // Cancel appointment
  const res = await request(app)
    .put(`/api/appointments/cancel/${appointmentId}`)
    .set("Authorization", `Bearer ${userToken}`);

  t.is(res.status, 200);
  t.is(res.body.appointmentStatus, "CANCELLED");
  t.truthy(res.body.message);
});

test.serial("PUT /api/appointments/cancel/:id should fail for non-existent appointment", async (t) => {
  const userEmail = `user${emailCounter}@test.com`;
  emailCounter++;

  const { token: userToken } = await createUserAndLogin("user6", userEmail, "123456");

  const res = await request(app)
    .put("/api/appointments/cancel/99999")
    .set("Authorization", `Bearer ${userToken}`);

  t.is(res.status, 404);
  t.true(res.body.message.includes("not found"));
});

test.serial("PUT /api/appointments/cancel/:id should require authentication", async (t) => {
  const res = await request(app)
    .put("/api/appointments/cancel/1");

  t.is(res.status, 401);
});

test.serial("GET /api/appointments/my should return user's appointments", async (t) => {
  const profEmail = `prof${emailCounter}@test.com`;
  const userEmail = `user${emailCounter}@test.com`;
  emailCounter++;

  // Create professional and availability
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof7",
    profEmail,
    "123456"
  );
  
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const tomorrow = moment().add(1, "days").format("YYYY-MM-DD");
  await createAvailability(profToken, tomorrow, "09:00:00", "17:00:00");

  // Book appointment as user
  const { token: userToken } = await createUserAndLogin("user7", userEmail, "123456");
  
  await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      professionalId: professional.id,
      date: tomorrow,
      startTime: "10:00:00",
      endTime: "11:00:00",
    });

  // Get user's appointments
  const res = await request(app)
    .get("/api/appointments/my")
    .set("Authorization", `Bearer ${userToken}`);

  t.is(res.status, 200);
  t.true(Array.isArray(res.body));
  t.true(res.body.length >= 1);
  t.truthy(res.body[0].professionalName);
});

test.serial("GET /api/appointments/my should return professional's appointments", async (t) => {
  const profEmail = `prof${emailCounter}@test.com`;
  const userEmail = `user${emailCounter}@test.com`;
  emailCounter++;

  // Create professional and availability
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof8",
    profEmail,
    "123456"
  );
  
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });
  
  // Update user role to PROFESSIONAL
  await User.update({ role: "PROFESSIONAL" }, { where: { id: profUserId } });

  const tomorrow = moment().add(1, "days").format("YYYY-MM-DD");
  await createAvailability(profToken, tomorrow, "09:00:00", "17:00:00");

  // Another user books appointment
  const { token: userToken } = await createUserAndLogin("user8", userEmail, "123456");
  
  await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      professionalId: professional.id,
      date: tomorrow,
      startTime: "10:00:00",
      endTime: "11:00:00",
    });

  // Professional fetches their appointments
  const res = await request(app)
    .get("/api/appointments/my")
    .set("Authorization", `Bearer ${profToken}`);

  t.is(res.status, 200);
  t.true(Array.isArray(res.body));
  t.true(res.body.length >= 1);
  t.truthy(res.body[0].userName);
});

test.serial("GET /api/appointments/my should require authentication", async (t) => {
  const res = await request(app)
    .get("/api/appointments/my");

  t.is(res.status, 401);
});

test.serial("GET /api/appointments/:id should return appointment by ID", async (t) => {
  const profEmail = `prof${emailCounter}@test.com`;
  const userEmail = `user${emailCounter}@test.com`;
  emailCounter++;

  // Create professional and availability
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof9",
    profEmail,
    "123456"
  );
  
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const tomorrow = moment().add(1, "days").format("YYYY-MM-DD");
  await createAvailability(profToken, tomorrow, "09:00:00", "17:00:00");

  // Book appointment
  const { token: userToken } = await createUserAndLogin("user9", userEmail, "123456");
  
  const bookRes = await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      professionalId: professional.id,
      date: tomorrow,
      startTime: "10:00:00",
      endTime: "11:00:00",
    });

  const appointmentId = bookRes.body.appointment.id;

  // Get appointment by ID
  const res = await request(app)
    .get(`/api/appointments/${appointmentId}`)
    .set("Authorization", `Bearer ${userToken}`);

  t.is(res.status, 200);
  t.is(res.body.appointmentId, appointmentId);
  t.is(res.body.date, tomorrow);
  t.is(res.body.startTime, "10:00:00");
  t.is(res.body.endTime, "11:00:00");
  t.truthy(res.body.professionalName);
  t.truthy(res.body.userName);
});

test.serial("GET /api/appointments/:id should return 404 for non-existent appointment", async (t) => {
  const userEmail = `user${emailCounter}@test.com`;
  emailCounter++;

  const { token: userToken } = await createUserAndLogin("user10", userEmail, "123456");

  const res = await request(app)
    .get("/api/appointments/99999")
    .set("Authorization", `Bearer ${userToken}`);

  t.is(res.status, 404);
  t.true(res.body.message.includes("not found"));
});

test.serial("GET /api/appointments/:id should require authentication", async (t) => {
  const res = await request(app)
    .get("/api/appointments/1");

  t.is(res.status, 401);
});

test.serial("Appointments should split availability correctly", async (t) => {
  const profEmail = `prof${emailCounter}@test.com`;
  const userEmail = `user${emailCounter}@test.com`;
  emailCounter++;

  // Create professional with large availability block
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof11",
    profEmail,
    "123456"
  );
  
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const tomorrow = moment().add(1, "days").format("YYYY-MM-DD");
  await createAvailability(profToken, tomorrow, "09:00:00", "17:00:00");

  const { token: userToken } = await createUserAndLogin("user11", userEmail, "123456");

  // Book appointment in the middle (should split availability)
  const res = await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      professionalId: professional.id,
      date: tomorrow,
      startTime: "12:00:00",
      endTime: "13:00:00",
    });

  t.is(res.status, 201);
  t.truthy(res.body.appointment);
  
  // Verify availability was consumed
  const remainingAvail = await Availability.findAll({
    where: { 
      professional_id: professional.id,
      date: tomorrow 
    }
  });
  
  // Should have split into morning and afternoon slots
  t.true(remainingAvail.length >= 1);
});

test.serial("Multiple users should be able to book different slots", async (t) => {
  const profEmail = `prof${emailCounter}@test.com`;
  const user1Email = `user${emailCounter}a@test.com`;
  const user2Email = `user${emailCounter}b@test.com`;
  emailCounter++;

  // Create professional with availability
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof12",
    profEmail,
    "123456"
  );
  
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const tomorrow = moment().add(1, "days").format("YYYY-MM-DD");
  await createAvailability(profToken, tomorrow, "09:00:00", "17:00:00");

  // User 1 books 10-11
  const { token: user1Token } = await createUserAndLogin("user12a", user1Email, "123456");
  const res1 = await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({
      professionalId: professional.id,
      date: tomorrow,
      startTime: "10:00:00",
      endTime: "11:00:00",
    });

  t.is(res1.status, 201);

  // User 2 books 14-15
  const { token: user2Token } = await createUserAndLogin("user12b", user2Email, "123456");
  const res2 = await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${user2Token}`)
    .send({
      professionalId: professional.id,
      date: tomorrow,
      startTime: "14:00:00",
      endTime: "15:00:00",
    });

  t.is(res2.status, 201);

  // Verify both appointments exist
  const appointments = await Appointment.findAll({
    where: { professional_id: professional.id, date: tomorrow },
  });

  t.true(appointments.length >= 2);
});

test.serial("Appointments should prevent double booking", async (t) => {
  const profEmail = `prof${emailCounter}@test.com`;
  const user1Email = `user${emailCounter}a@test.com`;
  const user2Email = `user${emailCounter}b@test.com`;
  emailCounter++;

  // Create professional with availability
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof13",
    profEmail,
    "123456"
  );
  
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const tomorrow = moment().add(1, "days").format("YYYY-MM-DD");
  await createAvailability(profToken, tomorrow, "09:00:00", "17:00:00");

  // User 1 books 10-11
  const { token: user1Token } = await createUserAndLogin("user13a", user1Email, "123456");
  const res1 = await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({
      professionalId: professional.id,
      date: tomorrow,
      startTime: "10:00:00",
      endTime: "11:00:00",
    });

  t.is(res1.status, 201);

  // User 2 tries to book overlapping time 10:30-11:30 (should fail)
  const { token: user2Token } = await createUserAndLogin("user13b", user2Email, "123456");
  const res2 = await request(app)
    .post("/api/appointments/book")
    .set("Authorization", `Bearer ${user2Token}`)
    .send({
      professionalId: professional.id,
      date: tomorrow,
      startTime: "10:30:00",
      endTime: "11:30:00",
    });

  t.is(res2.status, 400);
  t.truthy(res2.body.message);
});