import * as appointmentService from "../services/AppointmentService.js";

export const appointmentController = {
  // POST /api/appointments/book
  async bookAppointment(req, res) {
    return appointmentService.bookAppointment(req, res);
  },

  // POST /api/appointments/cancel/:id
  async cancelAppointment(req, res) {
    return appointmentService.cancelAppointment(req, res);
  },

  // GET /api/appointments/get-appointment/:id
  async getAppointmentById(req, res) {
    return appointmentService.getAppointmentById(req, res);
  },

  // GET /api/appointments/my
  async getMyAppointments(req, res) {
    return appointmentService.getMyAppointments(req, res);
  },

};
