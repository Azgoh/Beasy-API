export const mapAppointmentResponseDto = (appointment) => {
  return {
    appointmentId: appointment.id,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    message: appointment.message || null,
    appointmentStatus: appointment.appointmentStatus,
    professionalId: appointment.professionalId,
    professionalName: appointment.professional ? `${appointment.professional.firstName} ${appointment.professional.lastName}` : null,
    userId: appointment.userId,
    userName: appointment.user ? appointment.user.username : null,
  };
};
