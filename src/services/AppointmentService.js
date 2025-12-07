import { Appointment, Availability, Professional, User } from "../models/index.js";
import moment from "moment";
import { sanitizeDateToIso } from "../utils/dateUtils.js";
import * as availabilityService from "./AvailabilityService.js";

// Book appointment - returns data, doesn't handle response
export async function bookAppointment(userId, professionalId, rawDate, rawStart, rawEnd) {
  const date = sanitizeDateToIso(rawDate);
  const startTime = moment(rawStart, ["HH:mm:ss", "HH:mm"], true).isValid()
    ? moment(rawStart, ["HH:mm:ss", "HH:mm"]).format("HH:mm:ss")
    : moment(rawStart).format("HH:mm:ss");
  const endTime = moment(rawEnd, ["HH:mm:ss", "HH:mm"], true).isValid()
    ? moment(rawEnd, ["HH:mm:ss", "HH:mm"]).format("HH:mm:ss")
    : moment(rawEnd).format("HH:mm:ss");

  // Fetch all slots for the professional on that date
  const slots = await Availability.findAll({
    where: { professional_id: professionalId, date },
    order: [["startTime", "ASC"]],
  });

  const bookingStart = moment(startTime, "HH:mm:ss");
  const bookingEnd = moment(endTime, "HH:mm:ss");

  const slot = slots.find(s => {
    const sStart = moment(s.startTime, "HH:mm:ss");
    const sEnd = moment(s.endTime, "HH:mm:ss");
    return bookingStart.isSameOrAfter(sStart) && bookingEnd.isSameOrBefore(sEnd) && bookingEnd.isAfter(bookingStart);
  });

  if (!slot) {
    throw new Error("No availability slot covers the requested time");
  }

  // Update availability (split slots)
  const remaining = await availabilityService.updateProfessionalAvailabilityOnBooking({
    slot,
    professionalId,
    date,
    startTime,
    endTime,
    userId,
  });

  // Create appointment record
  const appointment = await Appointment.create({
    user_id: userId,
    professional_id: professionalId,
    date,
    startTime,
    endTime,
    appointmentStatus: "BOOKED",
  });

  return {
    message: "Appointment booked",
    appointment: {
      id: appointment.id,
      userId: appointment.user_id,
      professionalId: appointment.professional_id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      appointmentStatus: appointment.appointmentStatus,
    },
    remainingAvailability: remaining,
  };
}

// Cancel appointment - returns data, doesn't handle response
export async function cancelAppointment(appointmentId, userId) {
  const appointment = await Appointment.findByPk(appointmentId, {
    include: [
      { model: User, as: "user" },
      { model: Professional, as: "professional" }
    ],
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // Verify user owns this appointment or is the professional
  const professional = await Professional.findOne({ where: { user_id: userId } });
  const isOwner = appointment.user_id === userId;
  const isProfessional = professional && appointment.professional_id === professional.id;

  if (!isOwner && !isProfessional) {
    throw new Error("Unauthorized to cancel this appointment");
  }

  appointment.appointmentStatus = "CANCELLED";
  await appointment.save();

  return {
    appointmentId: appointment.id,
    appointmentStatus: appointment.appointmentStatus,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    message: "The appointment has been cancelled",
    professionalId: appointment.professional?.id,
    professionalName: appointment.professional 
      ? `${appointment.professional.firstName} ${appointment.professional.lastName}`
      : null,
    userId: appointment.user?.id,
    userName: appointment.user?.username,
  };
}

// Get my appointments - returns data array
export async function getMyAppointments(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const where = {};
  if (user.role === "PROFESSIONAL") {
    const professional = await Professional.findOne({ where: { user_id: userId } });
    if (!professional) return [];
    where.professional_id = professional.id;
  } else {
    where.user_id = userId;
  }

  const appointments = await Appointment.findAll({
    where,
    include: [
      { model: User, as: "user" },
      { model: Professional, as: "professional" }
    ],
    order: [["date", "DESC"], ["startTime", "ASC"]],
  });

  return appointments.map((a) => {
    const plain = a.get ? a.get({ plain: true }) : a;
    return {
      appointmentId: plain.id,
      date: plain.date,
      startTime: plain.startTime,
      endTime: plain.endTime,
      appointmentStatus: plain.appointmentStatus,
      professionalId: plain.professional?.id || plain.professional_id,
      professionalName: plain.professional 
        ? `${plain.professional.firstName || ""} ${plain.professional.lastName || ""}`.trim()
        : null,
      userId: plain.user?.id || plain.user_id,
      userName: plain.user?.username || 
        (plain.user ? `${plain.user.firstName || ""} ${plain.user.lastName || ""}`.trim() : null),
    };
  });
}

// Get appointment by ID - returns data object
export async function getAppointmentById(appointmentId, userId) {
  const appointment = await Appointment.findByPk(appointmentId, {
    include: [
      { model: User, as: "user" },
      { model: Professional, as: "professional" }
    ],
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // Verify user has access
  const professional = await Professional.findOne({ where: { user_id: userId } });
  const isOwner = appointment.user_id === userId;
  const isProfessional = professional && appointment.professional_id === professional.id;

  if (!isOwner && !isProfessional) {
    throw new Error("Unauthorized to view this appointment");
  }

  return {
    appointmentId: appointment.id,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    appointmentStatus: appointment.appointmentStatus,
    professionalId: appointment.professional?.id,
    professionalName: appointment.professional
      ? `${appointment.professional.firstName} ${appointment.professional.lastName}`
      : null,
    userId: appointment.user?.id,
    userName: appointment.user?.username,
  };
}
