import * as appointmentService from "../services/AppointmentService.js";

export const appointmentController = {
  // POST /api/appointments/book
  async bookAppointment(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { professionalId, date, startTime, endTime } = req.body;

      if (!professionalId || !date || !startTime || !endTime) {
        return res.status(400).json({ message: "Missing booking data" });
      }

      const result = await appointmentService.bookAppointment(
        userId,
        professionalId,
        date,
        startTime,
        endTime
      );

      return res.status(201).json(result);
    } catch (err) {
      console.error("bookAppointment error:", err);
      return res.status(400).json({ message: err.message });
    }
  },

  // PUT /api/appointments/cancel/:id
  async cancelAppointment(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const appointmentId = parseInt(req.params.id);
      
      const result = await appointmentService.cancelAppointment(appointmentId, userId);
      
      return res.status(200).json(result);
    } catch (err) {
      console.error("cancelAppointment error:", err);
      if (err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message });
    }
  },

  // GET /api/appointments/my
  async getMyAppointments(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const appointments = await appointmentService.getMyAppointments(userId);
      
      return res.status(200).json(appointments);
    } catch (err) {
      console.error("getMyAppointments error:", err);
      return res.status(500).json({ message: err.message });
    }
  },

  // GET /api/appointments/:id
  async getAppointmentById(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const appointmentId = parseInt(req.params.id);
      
      const appointment = await appointmentService.getAppointmentById(appointmentId, userId);
      
      return res.status(200).json(appointment);
    } catch (err) {
      console.error("getAppointmentById error:", err);
      if (err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      return res.status(500).json({ message: err.message });
    }
  },
};
