/**
 * Dashboard utility exports
 * Note: Mock data has been removed - using real data from DashboardContext
 */

export { formatTime } from './formatTime';

// Color configuration for charts (still used for styling)
export const categoryColors = {
  colors: [
    'rgba(52, 211, 153, 0.8)',   // Green
    'rgba(99, 102, 241, 0.8)',   // Indigo
    'rgba(251, 191, 36, 0.8)',   // Amber
    'rgba(239, 68, 68, 0.8)',    // Red
    'rgba(168, 85, 247, 0.8)',   // Purple
    'rgba(59, 130, 246, 0.8)',   // Blue
  ],
  borderColors: [
    'rgba(52, 211, 153, 1)',
    'rgba(99, 102, 241, 1)',
    'rgba(251, 191, 36, 1)',
    'rgba(239, 68, 68, 1)',
    'rgba(168, 85, 247, 1)',
    'rgba(59, 130, 246, 1)',
  ],
};
