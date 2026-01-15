/**
 * Format minutes to a readable string with seconds (e.g., "2h 30m 15s" or "45m 30s")
 * Note: This function receives minutes as input, but we'll format it to show seconds when applicable
 */
export const formatTime = (mins: number): string => {
  // Convert minutes to seconds for more accurate formatting
  const totalSeconds = Math.floor(mins * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  
  return parts.join(' ');
};
