export const mapAvailabilityResponseDto = (availability) => ({
  id: availability.id,
  title: availability.title,
  date: availability.date, // assumed as JS Date
  startTime: availability.startTime,
  endTime: availability.endTime,
});
