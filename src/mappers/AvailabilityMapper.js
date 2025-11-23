export const toAvailabilityResponseDto = (availability) => ({
  id: availability.id,
  title: availability.title,
  date: availability.date,
  startTime: availability.startTime,
  endTime: availability.endTime,
});

export const toAvailabilityEntityForUser = (availabilityRequestDto, user) => ({
  userId: user.id,
  title: availabilityRequestDto.title,
  date: availabilityRequestDto.date,
  startTime: availabilityRequestDto.startTime,
  endTime: availabilityRequestDto.endTime,
});

export const toAvailabilityEntityForProfessional = (availabilityRequestDto, professional) => ({
  professionalId: professional.id,
  title: availabilityRequestDto.title,
  date: availabilityRequestDto.date,
  startTime: availabilityRequestDto.startTime,
  endTime: availabilityRequestDto.endTime,
});
