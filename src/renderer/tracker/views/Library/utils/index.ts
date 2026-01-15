/**
 * Library utility functions
 * Note: Mock data has been removed - using real data from useLibraryData hook
 */

/**
 * Format milliseconds to human-readable time string with seconds
 * Re-export from shared utils for consistency
 */
export { formatPlayTime } from '../../../../../shared/utils/timeFormat';

/**
 * Format timestamp to relative time string (e.g., "2 hours ago", "3 days ago")
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
};

/**
 * Format timestamp to date string
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
