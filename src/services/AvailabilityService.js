import { Availability, Professional, User } from "../models/index.js";
import moment from "moment";
import { sanitizeDateToIso } from "../utils/dateUtils.js";

/**
 * Save availability for a professional
 */
export async function saveAvailabilityForProfessional(dto, professionalId) {
  if (!professionalId) {
    professionalId = dto && (dto.professionalId ?? dto.professional_id ?? null);
  }
  if (!professionalId) throw new Error("Missing professional id");

  // normalize date to YYYY-MM-DD for storage
  if (dto && dto.date) dto.date = sanitizeDateToIso(dto.date);

  const payload = {
    title: dto.title,
    date: dto.date,
    startTime: dto.startTime,
    endTime: dto.endTime,
    professional_id: professionalId,
  };

  const created = await Availability.create(payload);
  const plain = created.get ? created.get({ plain: true }) : created;

  // return shape the frontend expects (date as "D MMMM YYYY")
  return {
    id: plain.id,
    title: plain.title,
    date: plain.date ? moment(plain.date).format("D MMMM YYYY") : plain.date,
    startTime: plain.startTime,
    endTime: plain.endTime,
    professional_id: plain.professional_id,
  };
}

/**
 * Edit existing availability for a professional
 */
export async function editAvailabilityForProfessional(dto, professionalId) {
  if (!dto || !dto.id) throw new Error("Missing availability id");
  if (!professionalId) {
    professionalId = dto.professionalId ?? dto.professional_id ?? null;
  }
  if (!professionalId) throw new Error("Missing professional id");

  const availability = await Availability.findByPk(dto.id);
  if (!availability) throw new Error("Availability not found");

  // ensure the availability belongs to this professional
  if (availability.professional_id !== professionalId) {
    throw new Error("Not authorized to edit this availability");
  }

  // sanitize date similarly as in save
  if (dto.date) {
    const m = moment(dto.date, ["D MMMM YYYY", "DD MMMM YYYY", "YYYY-MM-DD", "D MMM YYYY"], true);
    if (m.isValid()) dto.date = m.format("YYYY-MM-DD");
  }

  availability.title = dto.title ?? availability.title;
  availability.date = dto.date ?? availability.date;
  availability.startTime = dto.startTime ?? availability.startTime;
  availability.endTime = dto.endTime ?? availability.endTime;
  await availability.save();
  return availability;
}

/**
 * Delete availability slot
 */
export async function deleteAvailabilitySlotForProfessional(slotIdOrDto, professionalOrUser) {
  // Normalize slot id
  const slotId = slotIdOrDto && typeof slotIdOrDto === "object" ? slotIdOrDto.id : slotIdOrDto;
  if (!slotId) throw new Error("Missing availability id");

  // load availability
  const availability = await Availability.findByPk(slotId);
  if (!availability) throw new Error("Availability slot not found or unauthorized");

  // Resolve professional id from second arg which may be:
  // - a primitive professional id
  // - a user object (req.user / Sequelize instance) -> resolve Professional by user_id
  // - a dto containing userId/professionalId
  let resolvedProfessionalId = null;
  if (professionalOrUser) {
    if (typeof professionalOrUser === "object") {
      // possible shapes: req.user (Sequelize) or dto
      const userId =
        professionalOrUser.id ??
        (professionalOrUser.dataValues && professionalOrUser.dataValues.id) ??
        professionalOrUser.userId ??
        professionalOrUser.user_id ??
        null;

      const possibleProfId =
        professionalOrUser.professionalId ?? professionalOrUser.professional_id ?? null;

      if (possibleProfId) resolvedProfessionalId = possibleProfId;
      else if (userId) {
        const prof = await Professional.findOne({ where: { user_id: userId } });
        if (!prof) throw new Error("No professional profile for current user");
        resolvedProfessionalId = prof.id;
      }
    } else {
      // primitive
      resolvedProfessionalId = professionalOrUser;
    }
  }

  // If we couldn't resolve a professional id from caller, fall back to availability ownership check:
  if (!resolvedProfessionalId) {
    // allow deletion only if availability has professional_id and caller omitted identity (defensive)
    // but we cannot authorize without caller info -> deny
    throw new Error("Not authorized to delete this availability");
  }

  // Ownership check
  if (String(availability.professional_id) !== String(resolvedProfessionalId)) {
    throw new Error("Availability slot not found or unauthorized");
  }

  await availability.destroy();
  return { message: "Availability deleted successfully" };
}

/**
 * Get all availability for a professional
 */
export async function getProfessionalAvailability(professionalId) {
  // original: return await Availability.findAll({ where: { professional_id: professionalId }, ... })
  const rows = await Availability.findAll({
    where: { professional_id: professionalId },
    order: [["date", "ASC"], ["startTime", "ASC"]],
  });

  // normalize/format date for frontend which expects "D MMMM YYYY" (e.g. "24 November 2025")
  return rows.map((r) => {
    const plain = r.get ? r.get({ plain: true }) : r;
    return {
      ...plain,
      // format stored date (ISO) into the frontend-friendly format used by the React calendar
      date: plain.date ? moment(plain.date).format("D MMMM YYYY") : plain.date,
      // keep startTime/endTime as stored (HH:mm:ss) so frontend can combine with date
      startTime: plain.startTime,
      endTime: plain.endTime,
    };
  });
}

/**
 * Update professional availability after appointment booking
 */
export async function updateProfessionalAvailabilityOnBooking(payload) {
  // payload may contain: slot (Sequelize instance or plain), slotId, professionalId, date, startTime, endTime
  // This function will ensure booking inside a slot is allowed anywhere inside the slot
  // and will split the existing availability into up to two remaining slots.
  try {
    // resolve slot instance
    if (!payload) throw new Error("Missing payload");
    if (!payload.slot && (payload.slotId || payload.id)) {
      payload.slot = await Availability.findByPk(payload.slotId ?? payload.id);
    }
    if (payload.slot && typeof payload.slot === "object" && typeof payload.slot.save !== "function") {
      // plain object -> try load by id
      const possibleId = payload.slot.id ?? null;
      if (possibleId) payload.slot = await Availability.findByPk(possibleId);
    }

    // fallback: try to find by professional + date + startTime
    if (!payload.slot && payload.professionalId && payload.date && payload.startTime) {
      payload.slot = await Availability.findOne({
        where: {
          professional_id: payload.professionalId,
          date: payload.date,
          startTime: payload.startTime,
        },
      });
    }

    if (!payload.slot) throw new Error("Availability slot not found");

    const slot = payload.slot; // Sequelize instance
    const slotStart = moment(slot.startTime, "HH:mm:ss");
    const slotEnd = moment(slot.endTime, "HH:mm:ss");

    // normalize booking times
    const bookingStart = moment(payload.startTime, ["HH:mm:ss", "HH:mm"], true).isValid()
      ? moment(payload.startTime, ["HH:mm:ss", "HH:mm"])
      : moment(payload.startTime);
    const bookingEnd = moment(payload.endTime, ["HH:mm:ss", "HH:mm"], true).isValid()
      ? moment(payload.endTime, ["HH:mm:ss", "HH:mm"])
      : moment(payload.endTime);

    if (!bookingStart.isValid() || !bookingEnd.isValid()) {
      throw new Error("Invalid booking time format");
    }

    // validate booking fits inside slot
    if (bookingStart.isBefore(slotStart) || bookingEnd.isAfter(slotEnd) || !bookingEnd.isAfter(bookingStart)) {
      throw new Error("Booking must be within availability slot");
    }

    // compute remaining segments
    const beforeExists = bookingStart.isAfter(slotStart);
    const afterExists = bookingEnd.isBefore(slotEnd);

    // Use transaction to remove original slot and create remaining ones
    const sequelize = Availability.sequelize || Availability.constructor?.sequelize;
    const t = sequelize ? await sequelize.transaction() : null;

    try {
      // remove original slot
      await slot.destroy({ transaction: t });

      const createdRemaining = [];

      if (beforeExists) {
        const before = await Availability.create(
          {
            title: slot.title,
            date: slot.date,
            startTime: slotStart.format("HH:mm:ss"),
            endTime: bookingStart.format("HH:mm:ss"),
            professional_id: slot.professional_id,
          },
          { transaction: t }
        );
        createdRemaining.push(before);
      }

      if (afterExists) {
        const after = await Availability.create(
          {
            title: slot.title,
            date: slot.date,
            startTime: bookingEnd.format("HH:mm:ss"),
            endTime: slotEnd.format("HH:mm:ss"),
            professional_id: slot.professional_id,
          },
          { transaction: t }
        );
        createdRemaining.push(after);
      }

      if (t) await t.commit();

      // return remaining availabilities (formatted for frontend)
      return createdRemaining.map((r) => {
        const plain = r.get ? r.get({ plain: true }) : r;
        return {
          ...plain,
          date: plain.date ? moment(plain.date).format("D MMMM YYYY") : plain.date,
          startTime: plain.startTime,
          endTime: plain.endTime,
        };
      });
    } catch (err) {
      if (t) await t.rollback();
      throw err;
    }
  } catch (err) {
    throw err;
  }
}

/**
 * Update professional availability after appointment cancellation
 */
export async function updateProfessionalAvailabilityOnCancellation({ professionalId, date, startTime, endTime }) {
  date = sanitizeDate(date);

  const availabilities = await Availability.findAll({
    where: { professional_id: professionalId, date },
    order: [["startTime", "ASC"]],
  });

  const left = availabilities.find(a => a.endTime === startTime);
  const right = availabilities.find(a => a.startTime === endTime);

  if (left && right) {
    left.endTime = right.endTime;
    await left.save();
    await right.destroy();
  } else if (left) {
    left.endTime = endTime;
    await left.save();
  } else if (right) {
    right.startTime = startTime;
    await right.save();
  } else {
    await Availability.create({ professional_id: professionalId, date, startTime, endTime });
  }
}

/**
 * Save availability for a user (batch)
 */
export async function saveAvailabilitiesForUser(userId, availabilities) {
  // Validate user exists
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const createdAvailabilities = await Promise.all(
    availabilities.map(async (dto) => {
      // normalize date to YYYY-MM-DD for storage
      if (dto.date) dto.date = sanitizeDateToIso(dto.date);

      const payload = {
        user_id: userId,
        title: dto.title,
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
      };

      const created = await Availability.create(payload);
      const plain = created.get ? created.get({ plain: true }) : created;

      return {
        id: plain.id,
        title: plain.title,
        date: plain.date ? moment(plain.date).format("D MMMM YYYY") : plain.date,
        startTime: plain.startTime,
        endTime: plain.endTime,
        user_id: plain.user_id,
      };
    })
  );

  return createdAvailabilities;
}

/**
 * Get authenticated user's availability
 */
export async function getMyUserAvailability(userId) {
  if (!userId) {
    throw new Error("Invalid user id");
  }

  const availabilities = await Availability.findAll({
    where: { user_id: userId },
    order: [
      ["date", "ASC"],
      ["startTime", "ASC"],
    ],
  });

  return availabilities.map((avail) => ({
    id: avail.id,
    title: avail.title,
    date: moment(avail.date).format("D MMMM YYYY"),
    startTime: avail.startTime,
    endTime: avail.endTime,
    user_id: avail.user_id,
  }));
}

/**
 * Get user availability by user ID
 */
export async function getUserAvailabilityById(userId) {
  if (!userId) {
    throw new Error("Invalid user id");
  }

  const availabilities = await Availability.findAll({
    where: { user_id: userId },
    order: [
      ["date", "ASC"],
      ["startTime", "ASC"],
    ],
  });

  return availabilities.map((avail) => ({
    id: avail.id,
    title: avail.title,
    date: moment(avail.date).format("D MMMM YYYY"),
    startTime: avail.startTime,
    endTime: avail.endTime,
    user_id: avail.user_id,
  }));
}

// new/updated helper: robustly resolve a professional id and return availability
export async function getMyProfessionalAvailability(input) {
  let candidate = input;

  if (!candidate) throw new Error("Invalid professional id");

  // If passed a Sequelize model instance (user), extract its id and resolve professional
  if (typeof candidate === "object") {
    // Sequelize instances often expose .id or .dataValues.id
    const possibleId = candidate.id ?? (candidate.dataValues && candidate.dataValues.id) ?? null;
    if (possibleId) {
      // treat input as a user id -> find professional by user_id
      const profByUser = await Professional.findOne({ where: { user_id: possibleId } });
      if (!profByUser) throw new Error("No professional profile for this user");
      return await getProfessionalAvailability(profByUser.id);
    }

    // fallback: normalize DTO shapes
    const normalized =
      candidate.professionalId ?? candidate.professional_id ?? candidate.userId ?? candidate.user_id ?? null;
    if (!normalized) throw new Error("Invalid professional id");
    candidate = normalized;
  }

  // candidate now should be a primitive id (either professional id or user id)
  const byProfId = await Professional.findOne({ where: { id: candidate } });
  if (byProfId) return await getProfessionalAvailability(byProfId.id);

  const byUserId = await Professional.findOne({ where: { user_id: candidate } });
  if (byUserId) return await getProfessionalAvailability(byUserId.id);

  throw new Error("Invalid professional id");
}

// helper: parse common human-friendly formats to a Date (ISO) Sequelize accepts
function sanitizeDate(input) {
  if (!input) return null;
  // if already a Date or valid ISO string, return Date
  if (input instanceof Date) return input;
  // Try strict ISO parse first
  if (moment(input, moment.ISO_8601, true).isValid()) return moment(input).toDate();
  // Try common readable formats (e.g. "24 November 2025", "24 Nov 2025", "2025-11-24")
  const formats = ["D MMMM YYYY", "DD MMMM YYYY", "D MMM YYYY", "YYYY-MM-DD", "MM/DD/YYYY"];
  for (const fmt of formats) {
    const m = moment(input, fmt, true);
    if (m.isValid()) return m.toDate();
  }
  // fallback: let moment attempt a parse (non-strict) but convert to Date
  const fallback = moment(input);
  if (fallback.isValid()) return fallback.toDate();
  throw new Error(`Invalid date format: ${input}`);
}

export default {
  saveAvailabilityForProfessional,
  editAvailabilityForProfessional,
  deleteAvailabilitySlotForProfessional,
  getProfessionalAvailability,
  updateProfessionalAvailabilityOnBooking,
  updateProfessionalAvailabilityOnCancellation,
  saveAvailabilitiesForUser,
  getMyUserAvailability,
  getUserAvailabilityById,
};
