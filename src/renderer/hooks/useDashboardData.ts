/**
 * @fileoverview Hook for fetching real-time dashboard data via MessageChannel.
 * Provides playtime trends, category breakdowns, comparisons, and recent sessions.
 */

import { useEffect, useState, useCallback } from 'react';
import { MessageChannel, MessageType, MessagePayload } from '../../main/services/MessageChannel';
import { kWindowNames, TimeRange } from '../../shared/consts';

// ============================================================================
// Types (matching dashboard-data.facade.ts)
// ============================================================================

export interface PlaytimeTrendData {
    labels: string[];
    data: number[];
}

export interface CategoryData {
    labels: string[];
    data: number[];
}

export interface ComparisonData {
    current: {
        total: number;
        sessions: number;
        avgSession: number;
    };
    previous: {
        total: number;
        sessions: number;
        avgSession: number;
    };
    currentLabel: string;
    previousLabel: string;
}

export interface RecentSession {
    map: string;
    code: string;
    duration: number;
    timeAgo: string;
}

export interface Top5MapEntry {
    name: string;
    code: string;
    minutes: number;
}

export interface DashboardData {
    playtimeTrend: PlaytimeTrendData;
    categoryData: CategoryData;
    comparison: ComparisonData;
    recentSessions: RecentSession[];
    top5Maps: Top5MapEntry[];
}

/** Data fetch status */
type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

// ============================================================================
// Default/Empty Data
// ============================================================================

const emptyPlaytimeTrend: PlaytimeTrendData = { labels: [], data: [] };
const emptyCategory: CategoryData = { labels: [], data: [] };
const emptyComparison: ComparisonData = {
    current: { total: 0, sessions: 0, avgSession: 0 },
    previous: { total: 0, sessions: 0, avgSession: 0 },
    currentLabel: '',
    previousLabel: '',
};

const emptyDashboardData: DashboardData = {
    playtimeTrend: emptyPlaytimeTrend,
    categoryData: emptyCategory,
    comparison: emptyComparison,
    recentSessions: [],
    top5Maps: [],
};

// ============================================================================
// Hook
// ============================================================================

interface UseDashboardDataResult {
    data: DashboardData;
    status: FetchStatus;
    error: string | null;
    refresh: () => void;
}

/**
 * Hook to fetch dashboard data for a given time range.
 * Automatically subscribes to updates and requests data on mount and range change.
 * 
 * @param messageChannel - The MessageChannel instance for communication
 * @param timeRange - The time range to fetch data for
 * @returns Dashboard data, status, error, and refresh function
 */
export function useDashboardData(
    messageChannel: MessageChannel,
    timeRange: TimeRange
): UseDashboardDataResult {
    const [data, setData] = useState<DashboardData>(emptyDashboardData);
    const [status, setStatus] = useState<FetchStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    // Request data from background
    const requestData = useCallback(() => {
        setStatus('loading');
        setError(null);
        
        messageChannel.sendMessage(
            kWindowNames.background,
            MessageType.DASHBOARD_REQUEST,
            { range: timeRange }
        );
    }, [messageChannel, timeRange]);

    // Subscribe to dashboard updates
    useEffect(() => {
        const unsubscribe = messageChannel.onMessage(
            MessageType.DASHBOARD_UPDATED,
            (payload: MessagePayload) => {
                const responseRange = payload.data?.range as TimeRange | undefined;
                
                // Ignore responses for different time ranges
                if (responseRange && responseRange !== timeRange) {
                    return;
                }

                const {
                    playtimeTrend,
                    categoryData,
                    comparison,
                    recentSessions,
                    top5Maps,
                } = payload.data ?? {};

                if (!playtimeTrend) {
                    setStatus('error');
                    setError('Invalid data received');
                    return;
                }

                setData({
                    playtimeTrend: playtimeTrend ?? emptyPlaytimeTrend,
                    categoryData: categoryData ?? emptyCategory,
                    comparison: comparison ?? emptyComparison,
                    recentSessions: recentSessions ?? [],
                    top5Maps: top5Maps ?? [],
                });
                setStatus('success');
                setError(null);
            }
        );

        return () => unsubscribe();
    }, [messageChannel, timeRange]);

    // Request data on mount and when range changes
    useEffect(() => {
        requestData();

        // Timeout fallback: if no response after 3s, show empty state
        const timeout = setTimeout(() => {
            setStatus(current => {
                if (current === 'loading') {
                    return 'success'; // Show empty state instead of spinner
                }
                return current;
            });
        }, 3000);

        return () => clearTimeout(timeout);
    }, [requestData]);

    return {
        data,
        status,
        error,
        refresh: requestData,
    };
}
