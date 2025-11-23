import { Appointment, Availability, Professional, User } from "../models/index.js";
import { Op } from "sequelize";
import moment from "moment";
import { sanitizeDateToIso } from "../utils/dateUtils.js";
import * as availabilityService from "./AvailabilityService.js";

// Book appointment
export async function bookAppointment(req, res) {
  try {
    const { professionalId, date: rawDate, startTime: rawStart, endTime: rawEnd } = req.body;
    if (!professionalId || !rawDate || !rawStart || !rawEnd) {
      return res.status(400).json({ message: "Missing booking data" });
    }

    const userId = req.user && (req.user.id ?? req.user.userId);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const date = sanitizeDateToIso(rawDate);
    const startTime = moment(rawStart, ["HH:mm:ss", "HH:mm"], true).isValid()
      ? moment(rawStart, ["HH:mm:ss", "HH:mm"]).format("HH:mm:ss")
      : moment(rawStart).format("HH:mm:ss");
    const endTime = moment(rawEnd, ["HH:mm:ss", "HH:mm"], true).isValid()
      ? moment(rawEnd, ["HH:mm:ss", "HH:mm"]).format("HH:mm:ss")
      : moment(rawEnd).format("HH:mm:ss");

    // fetch all slots for the professional on that date and resolve in JS
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
      return res.status(400).json({ message: "No availability slot covers the requested time" });
    }

    // pass the Sequelize instance to the updater so it can split correctly
    const remaining = await availabilityService.updateProfessionalAvailabilityOnBooking({
      slot,
      professionalId,
      date,
      startTime,
      endTime,
      userId,
    });

    // create appointment record
    const appointment = await Appointment.create({
      user_id: userId,
      professional_id: professionalId,
      date,
      startTime,
      endTime,
      appointmentStatus: "BOOKED",
    });

    return res.status(201).json({
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
    });
  } catch (err) {
    console.error("bookAppointment error:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
}

// Cancel appointment
export async function cancelAppointment(req, res) {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [User, Professional],
    });

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    appointment.appointmentStatus = "CANCELLED";
    await appointment.save();

    // Restore professional availability after cancellation
    await updateProfessionalAvailabilityOnCancellation(appointment);

    res.json({
      appointmentId: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      message: "The appointment has been cancelled",
      appointmentStatus: appointment.appointmentStatus,
      professionalId: appointment.professional.id,
      professionalName: `${appointment.professional.firstName} ${appointment.professional.lastName}`,
      userId: appointment.user.id,
      userName: appointment.user.username,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Get my appointments
export async function getMyAppointments(req, res) {
  try {
    const userId = req.user && (req.user.id ?? req.user.userId ?? req.user.user_id);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // build where clause depending on role
    const where = {};
    if (user.role === "PROFESSIONAL") {
      const professional = await Professional.findOne({ where: { user_id: userId } });
      if (!professional) return res.json([]);
      where.professional_id = professional.id;
    } else {
      where.user_id = userId;
    }

    // IMPORTANT: use the association aliases defined on the models (commonly 'user' and 'professional')
    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: User, as: "user" },
        { model: Professional, as: "professional" }
      ],
      order: [["date", "DESC"], ["startTime", "ASC"]],
    });

    const response = appointments.map((a) => {
      const plain = a.get ? a.get({ plain: true }) : a;
      return {
        appointmentId: plain.id,
        date: plain.date,
        startTime: plain.startTime,
        endTime: plain.endTime,
        appointmentStatus: plain.appointmentStatus,
        professionalId: plain.professional ? plain.professional.id : plain.professional_id,
        professionalName: plain.professional ? `${plain.professional.firstName ?? ""} ${plain.professional.lastName ?? ""}`.trim() : null,
        userId: plain.user ? plain.user.id : plain.user_id,
        userName: plain.user ? (plain.user.username ?? `${plain.user.firstName ?? ""} ${plain.user.lastName ?? ""}`.trim()) : null,
      };
    });

    return res.json(response);
  } catch (err) {
    console.error("getMyAppointments error:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
}

// Get appointment by ID
export async function getAppointmentById(req, res) {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.findByPk(appointmentId, { include: [User, Professional] });
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    res.json({
      appointmentId: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      message: "",
      appointmentStatus: appointment.appointmentStatus,
      professionalId: appointment.professional.id,
      professionalName: `${appointment.professional.firstName} ${appointment.professional.lastName}`,
      userId: appointment.user.id,
      userName: appointment.user.username,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
