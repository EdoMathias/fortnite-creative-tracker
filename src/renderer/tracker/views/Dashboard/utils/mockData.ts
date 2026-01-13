import { TimeRange } from '../../../../../shared/consts';

/** Toggle this to switch between mock data and empty states for testing */
export const USE_MOCK_DATA = false;

// Empty data variants for testing empty states
export const emptyPlaytimeData: Record<
  TimeRange,
  { labels: string[]; data: number[] }
> = {
  today: { labels: ['6am', '9am', '12pm', '3pm', '6pm', '9pm'], data: [] },
  '7d': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [] },
  '30d': { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], data: [] },
  all: { labels: ['Oct', 'Nov', 'Dec', 'Jan'], data: [] },
};

export const emptyCategoryData: Record<
  TimeRange,
  { labels: string[]; data: number[] }
> = {
  today: { labels: [], data: [] },
  '7d': { labels: [], data: [] },
  '30d': { labels: [], data: [] },
  all: { labels: [], data: [] },
};

export const emptyTop5Maps: Record<
  TimeRange,
  { name: string; code: string; minutes: number }[]
> = {
  today: [],
  '7d': [],
  '30d': [],
  all: [],
};

export const emptyComparison: Record<
  TimeRange,
  {
    current: { total: number; sessions: number; avgSession: number };
    previous: { total: number; sessions: number; avgSession: number };
    currentLabel: string;
    previousLabel: string;
  }
> = {
  today: {
    current: { total: 0, sessions: 0, avgSession: 0 },
    previous: { total: 0, sessions: 0, avgSession: 0 },
    currentLabel: 'Today',
    previousLabel: 'Yesterday',
  },
  '7d': {
    current: { total: 0, sessions: 0, avgSession: 0 },
    previous: { total: 0, sessions: 0, avgSession: 0 },
    currentLabel: 'This Week',
    previousLabel: 'Last Week',
  },
  '30d': {
    current: { total: 0, sessions: 0, avgSession: 0 },
    previous: { total: 0, sessions: 0, avgSession: 0 },
    currentLabel: 'This Month',
    previousLabel: 'Last Month',
  },
  all: {
    current: { total: 0, sessions: 0, avgSession: 0 },
    previous: { total: 0, sessions: 0, avgSession: 0 },
    currentLabel: 'All Time',
    previousLabel: 'N/A',
  },
};

export const emptyRecentSessions: Record<
  TimeRange,
  { map: string; code: string; duration: number; timeAgo: string }[]
> = {
  today: [],
  '7d': [],
  '30d': [],
  all: [],
};

// Mock playtime data by time range
export const mockPlaytimeDataByRange: Record<
  TimeRange,
  { labels: string[]; data: number[] }
> = {
  today: {
    labels: ['6am', '9am', '12pm', '3pm', '6pm', '9pm'],
    data: [0, 15, 45, 30, 60, 45],
  },
  '7d': {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [45, 120, 30, 90, 180, 240, 150],
  },
  '30d': {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    data: [420, 580, 390, 855],
  },
  all: {
    labels: ['Oct', 'Nov', 'Dec', 'Jan'],
    data: [1200, 980, 1450, 855],
  },
};

// Mock category data by time range
export const mockCategoryDataByRange: Record<
  TimeRange,
  { labels: string[]; data: number[] }
> = {
  today: {
    labels: ['Box Fights', 'Zone Wars', 'Creative', 'Aim Training', 'Other'],
    data: [75, 45, 30, 25, 20],
  },
  '7d': {
    labels: ['Box Fights', 'Zone Wars', 'Creative', 'Aim Training', 'Other'],
    data: [320, 180, 145, 90, 120],
  },
  '30d': {
    labels: ['Box Fights', 'Zone Wars', 'Creative', 'Aim Training', 'Other'],
    data: [980, 620, 450, 340, 355],
  },
  all: {
    labels: ['Box Fights', 'Zone Wars', 'Creative', 'Aim Training', 'Other'],
    data: [2800, 1850, 1200, 980, 655],
  },
};

// Category colors (shared)
export const categoryColors = {
  colors: [
    'rgba(52, 211, 153, 0.9)', // Green (primary)
    'rgba(96, 165, 250, 0.9)', // Blue
    'rgba(251, 191, 36, 0.9)', // Yellow
    'rgba(244, 114, 182, 0.9)', // Pink
    'rgba(148, 163, 184, 0.9)', // Gray
  ],
  borderColors: [
    'rgba(52, 211, 153, 1)',
    'rgba(96, 165, 250, 1)',
    'rgba(251, 191, 36, 1)',
    'rgba(244, 114, 182, 1)',
    'rgba(148, 163, 184, 1)',
  ],
};

// Mock Top 5 Maps by time range
export const mockTop5MapsByRange: Record<
  TimeRange,
  { name: string; code: string; minutes: number }[]
> = {
  today: [
    { name: 'GARDEN VS BRAINROTS', code: '0497-4522-9912', minutes: 75 },
    { name: 'BOX FIGHT PRACTICE', code: '1234-5678-9012', minutes: 45 },
    { name: 'ZONE WARS ELITE', code: '9876-5432-1098', minutes: 30 },
    { name: 'AIM TRAINER PRO', code: '5555-6666-7777', minutes: 25 },
    { name: 'CREATIVE BUILDING', code: '1111-2222-3333', minutes: 20 },
  ],
  '7d': [
    { name: 'GARDEN VS BRAINROTS', code: '0497-4522-9912', minutes: 320 },
    { name: 'BOX FIGHT PRACTICE', code: '1234-5678-9012', minutes: 245 },
    { name: 'ZONE WARS ELITE', code: '9876-5432-1098', minutes: 180 },
    { name: 'AIM TRAINER PRO', code: '5555-6666-7777', minutes: 120 },
    { name: 'CREATIVE BUILDING', code: '1111-2222-3333', minutes: 90 },
  ],
  '30d': [
    { name: 'GARDEN VS BRAINROTS', code: '0497-4522-9912', minutes: 980 },
    { name: 'BOX FIGHT PRACTICE', code: '1234-5678-9012', minutes: 720 },
    { name: 'ZONE WARS ELITE', code: '9876-5432-1098', minutes: 540 },
    { name: 'AIM TRAINER PRO', code: '5555-6666-7777', minutes: 340 },
    { name: 'CREATIVE BUILDING', code: '1111-2222-3333', minutes: 265 },
  ],
  all: [
    { name: 'GARDEN VS BRAINROTS', code: '0497-4522-9912', minutes: 2800 },
    { name: 'BOX FIGHT PRACTICE', code: '1234-5678-9012', minutes: 2100 },
    { name: 'ZONE WARS ELITE', code: '9876-5432-1098', minutes: 1650 },
    { name: 'AIM TRAINER PRO', code: '5555-6666-7777', minutes: 980 },
    { name: 'CREATIVE BUILDING', code: '1111-2222-3333', minutes: 755 },
  ],
};

// Mock comparison data by time range
export const mockComparisonByRange: Record<
  TimeRange,
  {
    current: { total: number; sessions: number; avgSession: number };
    previous: { total: number; sessions: number; avgSession: number };
    currentLabel: string;
    previousLabel: string;
  }
> = {
  today: {
    current: { total: 195, sessions: 4, avgSession: 49 },
    previous: { total: 160, sessions: 3, avgSession: 53 },
    currentLabel: 'Today',
    previousLabel: 'Yesterday',
  },
  '7d': {
    current: { total: 855, sessions: 12, avgSession: 71 },
    previous: { total: 720, sessions: 10, avgSession: 72 },
    currentLabel: 'This Week',
    previousLabel: 'Last Week',
  },
  '30d': {
    current: { total: 2245, sessions: 38, avgSession: 59 },
    previous: { total: 1980, sessions: 32, avgSession: 62 },
    currentLabel: 'This Month',
    previousLabel: 'Last Month',
  },
  all: {
    current: { total: 7485, sessions: 142, avgSession: 53 },
    previous: { total: 0, sessions: 0, avgSession: 0 },
    currentLabel: 'All Time',
    previousLabel: 'N/A',
  },
};

// Mock Recent Sessions (same for all ranges, but filtered by recency)
export const mockRecentSessionsByRange: Record<
  TimeRange,
  {
    map: string;
    code: string;
    duration: number;
    timeAgo: string;
  }[]
> = {
  today: [
    {
      map: 'GARDEN VS BRAINROTS',
      code: '0497-4522-9912',
      duration: 45,
      timeAgo: '2h ago',
    },
    {
      map: 'BOX FIGHT PRACTICE',
      code: '1234-5678-9012',
      duration: 30,
      timeAgo: '5h ago',
    },
    {
      map: 'AIM TRAINER PRO',
      code: '5555-6666-7777',
      duration: 25,
      timeAgo: '8h ago',
    },
  ],
  '7d': [
    {
      map: 'GARDEN VS BRAINROTS',
      code: '0497-4522-9912',
      duration: 45,
      timeAgo: '2h ago',
    },
    {
      map: 'BOX FIGHT PRACTICE',
      code: '1234-5678-9012',
      duration: 30,
      timeAgo: '5h ago',
    },
    {
      map: 'ZONE WARS ELITE',
      code: '9876-5432-1098',
      duration: 60,
      timeAgo: 'Yesterday',
    },
    {
      map: 'GARDEN VS BRAINROTS',
      code: '0497-4522-9912',
      duration: 90,
      timeAgo: 'Yesterday',
    },
    {
      map: 'AIM TRAINER PRO',
      code: '5555-6666-7777',
      duration: 25,
      timeAgo: '2 days ago',
    },
  ],
  '30d': [
    {
      map: 'GARDEN VS BRAINROTS',
      code: '0497-4522-9912',
      duration: 45,
      timeAgo: '2h ago',
    },
    {
      map: 'BOX FIGHT PRACTICE',
      code: '1234-5678-9012',
      duration: 30,
      timeAgo: '5h ago',
    },
    {
      map: 'ZONE WARS ELITE',
      code: '9876-5432-1098',
      duration: 60,
      timeAgo: 'Yesterday',
    },
    {
      map: 'GARDEN VS BRAINROTS',
      code: '0497-4522-9912',
      duration: 90,
      timeAgo: '3 days ago',
    },
    {
      map: 'AIM TRAINER PRO',
      code: '5555-6666-7777',
      duration: 25,
      timeAgo: '1 week ago',
    },
  ],
  all: [
    {
      map: 'GARDEN VS BRAINROTS',
      code: '0497-4522-9912',
      duration: 45,
      timeAgo: '2h ago',
    },
    {
      map: 'BOX FIGHT PRACTICE',
      code: '1234-5678-9012',
      duration: 30,
      timeAgo: '5h ago',
    },
    {
      map: 'ZONE WARS ELITE',
      code: '9876-5432-1098',
      duration: 60,
      timeAgo: 'Yesterday',
    },
    {
      map: 'GARDEN VS BRAINROTS',
      code: '0497-4522-9912',
      duration: 90,
      timeAgo: '1 week ago',
    },
    {
      map: 'AIM TRAINER PRO',
      code: '5555-6666-7777',
      duration: 25,
      timeAgo: '2 weeks ago',
    },
  ],
};

// Legacy exports for backwards compatibility
export const mockPlaytimeData = mockPlaytimeDataByRange['7d'];
export const mockCategoryData = {
  ...mockCategoryDataByRange['7d'],
  ...categoryColors,
};
export const mockTop5Maps = mockTop5MapsByRange['7d'];
export const mockWeekComparison = {
  thisWeek: mockComparisonByRange['7d'].current,
  lastWeek: mockComparisonByRange['7d'].previous,
};
export const mockRecentSessions = mockRecentSessionsByRange['7d'];
