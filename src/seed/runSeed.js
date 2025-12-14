import moment from "moment";

function mapAttrs(model, candidate) {
  if (!model || !model.rawAttributes) return candidate;
  const res = {};
  for (const [k, v] of Object.entries(candidate)) {
    if (model.rawAttributes[k]) {
      res[k] = v;
      continue;
    }
    const snake = k.replace(/[A-Z]/g, m => "_" + m.toLowerCase());
    if (model.rawAttributes[snake]) {
      res[snake] = v;
      continue;
    }
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (model.rawAttributes[camel]) {
      res[camel] = v;
      continue;
    }
    // fallback
    res[k] = v;
  }
  return res;
}

export default async function runSeed(models) {
  const sequelize = models.sequelize || models.default?.sequelize;
  const User = models.User || models.Users || models.user || models.users;
  const Professional =
    models.Professional ||
    models.ProfessionalProfile ||
    models.professional_profiles ||
    models.professionalProfiles ||
    models.professional;
  const Availability =
    models.Availability || models.availabilities || models.availableSlot || models.Availabilities;
  const Appointment =
    models.Appointment || models.appointments || models.Appointments;
  const Review =
    models.Review || models.ReviewEntity || models.review_entity || models.reviews;

  if (!sequelize) throw new Error("Sequelize instance not found in models export.");
  if (!User) throw new Error("User model not found in models export.");

  const t = await sequelize.transaction();
  try {
    // Users
    const users = [
      { username: "admin", email: "admin@example.com", password: "$2a$12$pCZbFA6MDLy2PL4EaQqih.hvdGM/wZ1Gue/fjhU.B2n24sxuW04ze", role: "USER", enabled: true, verificationToken: null, authProvider: "LOCAL" },
      { username: "john_doe", email: "john@example.com", password: "$2a$12$rgWiAVLqohu2E2jNOLCRe.JXvku3DC0VznCWYS1R9lCt2F0pSpR0C", role: "USER", enabled: true, verificationToken: null, authProvider: "LOCAL" },
      { username: "jane_smith", email: "jane@example.com", password: "$2a$12$rgWiAVLqohu2E2jNOLCRe.JXvku3DC0VznCWYS1R9lCt2F0pSpR0C", role: "USER", enabled: true, verificationToken: null, authProvider: "LOCAL" },
      { username: "alice_miller", email: "alice@example.com", password: "$2a$12$rgWiAVLqohu2E2jNOLCRe.JXvku3DC0VznCWYS1R9lCt2F0pSpR0C", role: "PROFESSIONAL", enabled: true, verificationToken: null, authProvider: "LOCAL" },
      { username: "bob_jones", email: "bob@example.com", password: "$2a$12$rgWiAVLqohu2E2jNOLCRe.JXvku3DC0VznCWYS1R9lCt2F0pSpR0C", role: "PROFESSIONAL", enabled: true, verificationToken: null, authProvider: "LOCAL" },
    ];

    const createdUsers = {};
    for (const u of users) {
      const attrs = mapAttrs(User, u);
      const [instance] = await User.findOrCreate({ where: { username: attrs.username }, defaults: attrs, transaction: t });
      // ensure we store the Sequelize instance
      const userInstance = instance && instance.get ? instance : await User.findOne({ where: { username: attrs.username }, transaction: t });
      if (!userInstance) {
        throw new Error(`Failed to create or find user ${attrs.username}`);
      }
      createdUsers[attrs.username] = userInstance;
      console.log(`User ready: ${attrs.username} (id=${userInstance.id ?? userInstance.get("id")})`);
    }

    // PROFESSIONAL PROFILES
    const profs = [
      { username: "alice_miller", firstName: "Alice", lastName: "Miller", profession: "Plumber", location: "New York", description: "Experienced plumber", phone: "1234567890", hourlyRate: "50" },
      { username: "bob_jones", firstName: "Bob", lastName: "Jones", profession: "Electrician", location: "Los Angeles", description: "Certified electrician", phone: "0987654321", hourlyRate: "60" },
    ];

    const createdProfs = {};
    if (Professional) {
      for (const p of profs) {
        // resolve user instance reliably
        const userInst = createdUsers[p.username] ?? await User.findOne({ where: { username: p.username }, transaction: t });
        if (!userInst) {
          console.warn(`Skipping professional for ${p.username} - user not found`);
          continue;
        }
        const resolvedUserId = userInst.id ?? userInst.get?.("id");
        // ensure userId is present
        if (!resolvedUserId) {
          console.warn(`Skipping professional for ${p.username} - resolved user id missing`);
          continue;
        }

        // prepare payload and set whichever attribute exists on the model (userId or user_id)
        const payload = {
          firstName: p.firstName,
          lastName: p.lastName,
          profession: p.profession,
          location: p.location,
          description: p.description,
          phone: p.phone,
          hourlyRate: p.hourlyRate,
        };
        // attach proper key for FK based on model attributes
        if (Professional.rawAttributes && Professional.rawAttributes.userId) payload.userId = resolvedUserId;
        else if (Professional.rawAttributes && Professional.rawAttributes.user_id) payload.user_id = resolvedUserId;
        else payload.userId = resolvedUserId; // fallback

        const attrs = mapAttrs(Professional, payload);
        // try to find existing by either possible FK column
        let profInstance = await Professional.findOne({ where: { ...(attrs.userId ? { userId: attrs.userId } : {}), ...(attrs.user_id ? { user_id: attrs.user_id } : {}) }, transaction: t });
        if (!profInstance) {
          const [inst] = await Professional.findOrCreate({ where: { ...(attrs.userId ? { userId: attrs.userId } : {}), ...(attrs.user_id ? { user_id: attrs.user_id } : {}) }, defaults: attrs, transaction: t });
          profInstance = inst && inst.get ? inst : await Professional.findOne({ where: { ...(attrs.userId ? { userId: attrs.userId } : {}), ...(attrs.user_id ? { user_id: attrs.user_id } : {}) }, transaction: t });
        }
        if (profInstance) {
          createdProfs[profInstance.id] = profInstance;
          console.log(`Professional ready: ${profInstance.id} for user ${p.username}`);
        }
      }
    }

    // Reviews (optional)
    if (Review && createdProfs) {
      const aliceProf = Object.values(createdProfs).find(p => {
        const fn = p.firstName ?? p.get?.("firstName");
        return typeof fn === "string" && fn.toLowerCase().includes("alice");
      });
      const bobProf = Object.values(createdProfs).find(p => {
        const fn = p.firstName ?? p.get?.("firstName");
        return typeof fn === "string" && fn.toLowerCase().includes("bob");
      });

      const createOrFindReview = async (profInstance, userInstance, score, text) => {
        if (!profInstance || !userInstance) return;
        // build attrs mapped to model fields
        const defaults = mapAttrs(Review, {
          professionalId: profInstance.id ?? profInstance.get?.("id"),
          userId: userInstance.id ?? userInstance.get?.("id"),
          score,
          review: text,
          timestamp: new Date(),
        });
        // build where using actual DB column keys (fallback to camelCase)
        const where = {};
        if (defaults.professional_id !== undefined) where.professional_id = defaults.professional_id;
        else if (defaults.professionalId !== undefined) where.professionalId = defaults.professionalId;
        if (defaults.user_id !== undefined) where.user_id = defaults.user_id;
        else if (defaults.userId !== undefined) where.userId = defaults.userId;

        await Review.findOrCreate({ where, defaults, transaction: t });
      };

      await createOrFindReview(aliceProf, createdUsers["john_doe"], 5, "Great work, very professional!");
      await createOrFindReview(bobProf, createdUsers["jane_smith"], 4, "Good service, arrived on time.");
    }

    // Appointments
    if (Appointment && createdUsers) {
      const aliceId = Object.values(createdProfs)[0]?.id;
      const bobId = Object.values(createdProfs)[1]?.id;
      const appts = [
        { userId: createdUsers["john_doe"].id, professionalId: aliceId, date: "2025-11-25", startTime: "07:00:00", endTime: "08:30:00", appointmentStatus: 0 },
        { userId: createdUsers["jane_smith"].id, professionalId: bobId, date: "2025-11-26", startTime: "17:00:00", endTime: "18:00:00", appointmentStatus: 2 },
        { userId: createdUsers["john_doe"].id, professionalId: bobId, date: "2025-11-25", startTime: "06:00:00", endTime: "07:00:00", appointmentStatus: 0 },
        { userId: createdUsers["jane_smith"].id, professionalId: aliceId, date: "2025-11-26", startTime: "18:00:00", endTime: "19:00:00", appointmentStatus: 0 },
      ];

      // map numeric codes to enum labels used by the Appointment model
      const statusMap = {
        0: "BOOKED",
        1: "CANCELLED",
        2: "COMPLETED",
      };

      for (const a of appts) {
        const status = typeof a.appointmentStatus === "number"
          ? (statusMap[a.appointmentStatus] ?? String(a.appointmentStatus))
          : a.appointmentStatus;

        const attrs = mapAttrs(Appointment, {
          user_id: a.userId,
          professional_id: a.professionalId,
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          appointmentStatus: status,
        });

        await Appointment.findOrCreate({
          where: {
            user_id: attrs.user_id ?? attrs.userId,
            professional_id: attrs.professional_id ?? attrs.professionalId,
            date: attrs.date,
            startTime: attrs.startTime ?? attrs.start_time
          },
          defaults: attrs,
          transaction: t
        });
      }
    }

    // Availabilities
    if (Availability && createdUsers) {
      const aliceProf = Object.values(createdProfs)[0];
      const bobProf = Object.values(createdProfs)[1];
      const avails = [
        { title: "Morning Slot", date: "2025-12-18", startTime: "09:00:00", endTime: "12:00:00", userId: createdUsers["alice_miller"].id, professionalId: aliceProf?.id },
        { title: "Afternoon Slot", date: "2025-12-18", startTime: "13:00:00", endTime: "17:00:00", userId: createdUsers["alice_miller"].id, professionalId: aliceProf?.id },
        { title: "Morning Slot", date: "2025-12-19", startTime: "09:00:00", endTime: "12:00:00", userId: createdUsers["alice_miller"].id, professionalId: aliceProf?.id },
        { title: "Afternoon Slot", date: "2025-12-19", startTime: "13:00:00", endTime: "17:00:00", userId: createdUsers["alice_miller"].id, professionalId: aliceProf?.id },

        { title: "Morning Slot", date: "2025-12-18", startTime: "08:00:00", endTime: "11:00:00", userId: createdUsers["bob_jones"].id, professionalId: bobProf?.id },
        { title: "Afternoon Slot", date: "2025-12-18", startTime: "12:00:00", endTime: "16:00:00", userId: createdUsers["bob_jones"].id, professionalId: bobProf?.id },
        { title: "Morning Slot", date: "2025-12-19", startTime: "08:00:00", endTime: "11:00:00", userId: createdUsers["bob_jones"].id, professionalId: bobProf?.id },
        { title: "Afternoon Slot", date: "2025-12-19", startTime: "12:00:00", endTime: "16:00:00", userId: createdUsers["bob_jones"].id, professionalId: bobProf?.id },
      ];

      for (const a of avails) {
        const attrs = mapAttrs(Availability, {
          title: a.title,
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          start_time: a.startTime,
          end_time: a.endTime,
          user_id: a.userId,
          professional_id: a.professionalId,
          userId: a.userId,
          professionalId: a.professionalId,
        });
        await Availability.findOrCreate({ where: { professional_id: attrs.professional_id ?? attrs.professionalId, date: attrs.date, startTime: attrs.startTime ?? attrs.start_time }, defaults: attrs, transaction: t });
      }
    }

    await t.commit();
    console.log("Seeding completed (via models)");
  } catch (err) {
    await t.rollback();
    console.error("Seeding failed (via models):", err);
    throw err;
  }
}