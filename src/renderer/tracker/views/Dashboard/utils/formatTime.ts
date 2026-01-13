/**
 * Format minutes to a readable string (e.g., "2h 30m" or "45m")
 */
export const formatTime = (mins: number): string => {
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return hours > 0 ? `${hours}h ${remainingMins}m` : `${mins}m`;
};
