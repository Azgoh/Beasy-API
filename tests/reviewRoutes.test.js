import test from "ava";
import request from "supertest";
import { sequelize, User, Professional, Review } from "../src/models/index.js";
import bcrypt from "bcrypt";

let app;

test.before(async () => {
  const appModule = await import("../index.js");
  app = appModule.app;
  await sequelize.sync({ force: true });
});

test.beforeEach(async () => {
  // Clean database before each test for full isolation
  await Review.destroy({ where: {}, force: true, truncate: true, cascade: true });
  await Professional.destroy({ where: {}, force: true, truncate: true, cascade: true });
  await User.destroy({ where: {}, force: true, truncate: true, cascade: true });
  
  // Reset auto-increment sequences
  await sequelize.query('ALTER SEQUENCE "Users_id_seq" RESTART WITH 1');
  await sequelize.query('ALTER SEQUENCE "Professionals_id_seq" RESTART WITH 1');
  await sequelize.query('ALTER SEQUENCE "Reviews_id_seq" RESTART WITH 1');
});

test.after.always(async () => {
  await sequelize.close();
});

let phoneCounter = 2000000000;

async function createUserAndLogin(username, email, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
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

  return { token: loginRes.text, userId: user.id };
}

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

test.serial("POST /api/reviews/add should create a new review", async (t) => {
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof1",
    "prof1@test.com",
    "123456"
  );
  
  await createProfessional(profToken, { firstName: "John" });
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const { token: userToken } = await createUserAndLogin("user1", "user1@test.com", "123456");

  const res = await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      professionalId: professional.id,
      score: 5,
      review: "Excellent service!",
    });

  t.is(res.status, 200);
  t.truthy(res.body.id);
  t.is(res.body.score, 5);
  t.is(res.body.review, "Excellent service!");
});

test.serial("POST /api/reviews/add should update existing review", async (t) => {
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof2",
    "prof2@test.com",
    "123456"
  );
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const { token: userToken } = await createUserAndLogin("user2", "user2@test.com", "123456");

  await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ 
      professionalId: professional.id, 
      score: 3, 
      review: "Average" 
    });

  const res = await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ 
      professionalId: professional.id, 
      score: 5, 
      review: "Actually excellent!" 
    });

  t.is(res.status, 200);
  t.is(res.body.score, 5);
  t.is(res.body.review, "Actually excellent!");
});

test.serial("POST /api/reviews/add should fail with invalid score", async (t) => {
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof3",
    "prof3@test.com",
    "123456"
  );
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const { token: userToken } = await createUserAndLogin("user3", "user3@test.com", "123456");

  const res = await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ 
      professionalId: professional.id, 
      score: 6, 
      review: "Test" 
    });

  t.is(res.status, 400);
  t.true(res.body.message.includes("between 1 and 5"));
});

test.serial("POST /api/reviews/add should fail for non-existent professional", async (t) => {
  const { token: userToken } = await createUserAndLogin("user4", "user4@test.com", "123456");

  const res = await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ professionalId: 99999, score: 5, review: "Test" });

  t.is(res.status, 400);
  t.true(res.body.message.includes("not found"));
});

test.serial("POST /api/reviews/add should require authentication", async (t) => {
  const res = await request(app)
    .post("/api/reviews/add")
    .send({ professionalId: 1, score: 5, review: "Test" });

  t.is(res.status, 401);
});

test.serial("GET /api/reviews/professionals/:professionalId should return reviews", async (t) => {
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof5",
    "prof5@test.com",
    "123456"
  );
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const { token: user1Token } = await createUserAndLogin("user6", "user6@test.com", "123456");
  await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ 
      professionalId: professional.id, 
      score: 5, 
      review: "Great!" 
    });

  const res = await request(app)
    .get(`/api/reviews/professionals/${professional.id}`)
    .set("Authorization", `Bearer ${profToken}`);

  t.is(res.status, 200);
  t.true(Array.isArray(res.body));
  t.true(res.body.length >= 1);
});

test.serial("GET /api/reviews/professionals/:professionalId should require authentication", async (t) => {
  const res = await request(app)
    .get("/api/reviews/professionals/1");

  t.is(res.status, 401);
});

test.serial("GET /api/reviews/professionals/:professionalId/average should calculate average", async (t) => {
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof7",
    "prof7@test.com",
    "123456"
  );
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const { token: user1Token } = await createUserAndLogin("user8", "user8@test.com", "123456");
  await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ 
      professionalId: professional.id, 
      score: 4, 
      review: "Good" 
    });

  const { token: user2Token } = await createUserAndLogin("user9", "user9@test.com", "123456");
  await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${user2Token}`)
    .send({ 
      professionalId: professional.id, 
      score: 4, 
      review: "Good too" 
    });

  const res = await request(app)
    .get(`/api/reviews/professionals/${professional.id}/average`)
    .set("Authorization", `Bearer ${profToken}`);

  t.is(res.status, 200);
  t.is(res.body, 4.0);
});

test.serial("GET /api/reviews/professionals/:professionalId/average should return 0 for no reviews", async (t) => {
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof8",
    "prof8@test.com",
    "123456"
  );
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const res = await request(app)
    .get(`/api/reviews/professionals/${professional.id}/average`)
    .set("Authorization", `Bearer ${profToken}`);

  t.is(res.status, 200);
  t.is(res.body, 0.0);
});

test.serial("GET /api/reviews/my-given-reviews should return user's reviews", async (t) => {
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof9",
    "prof9@test.com",
    "123456"
  );
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const { token: userToken } = await createUserAndLogin("user10", "user10@test.com", "123456");
  await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ 
      professionalId: professional.id, 
      score: 5, 
      review: "My review" 
    });

  const res = await request(app)
    .get("/api/reviews/my-given-reviews")
    .set("Authorization", `Bearer ${userToken}`);

  t.is(res.status, 200);
  t.true(Array.isArray(res.body));
  t.true(res.body.length >= 1);
});

test.serial("GET /api/reviews/my-given-reviews should require authentication", async (t) => {
  const res = await request(app)
    .get("/api/reviews/my-given-reviews");

  t.is(res.status, 401);
});

test.serial("GET /api/reviews/my-received-reviews should return professional's received reviews", async (t) => {
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof10",
    "prof10@test.com",
    "123456"
  );
  
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const { token: userToken } = await createUserAndLogin("user11", "user11@test.com", "123456");
  await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ 
      professionalId: professional.id, 
      score: 5, 
      review: "Great work!" 
    });

  const res = await request(app)
    .get("/api/reviews/my-received-reviews")
    .set("Authorization", `Bearer ${profToken}`);

  t.is(res.status, 200);
  t.true(Array.isArray(res.body));
  t.true(res.body.length >= 1);
});

test.serial("GET /api/reviews/my-received-reviews should require authentication", async (t) => {
  const res = await request(app)
    .get("/api/reviews/my-received-reviews");

  t.is(res.status, 401);
});

test.serial("Reviews should support multiple users reviewing same professional", async (t) => {
  const { token: profToken, userId: profUserId } = await createUserAndLogin(
    "prof11",
    "prof11@test.com",
    "123456"
  );
  await createProfessional(profToken);
  const professional = await Professional.findOne({ where: { user_id: profUserId } });

  const { token: user1Token } = await createUserAndLogin("user12", "user12@test.com", "123456");
  await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${user1Token}`)
    .send({ professionalId: professional.id, score: 5, review: "User 1" });

  const { token: user2Token } = await createUserAndLogin("user13", "user13@test.com", "123456");
  await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${user2Token}`)
    .send({ professionalId: professional.id, score: 4, review: "User 2" });

  const { token: user3Token } = await createUserAndLogin("user14", "user14@test.com", "123456");
  await request(app)
    .post("/api/reviews/add")
    .set("Authorization", `Bearer ${user3Token}`)
    .send({ professionalId: professional.id, score: 3, review: "User 3" });

  const res = await request(app)
    .get(`/api/reviews/professionals/${professional.id}`)
    .set("Authorization", `Bearer ${profToken}`);

  t.is(res.status, 200);
  t.is(res.body.length, 3);
});