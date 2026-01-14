/**
 * @fileoverview Dashboard Context - Provides real-time dashboard data to child components.
 * This context fetches data via MessageChannel and distributes it to all dashboard widgets.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { MessageChannel } from '../../../../main/services/MessageChannel';
import { TimeRange } from '../../../../shared/consts';
import { useDashboardData, DashboardData, PlaytimeTrendData, CategoryData, ComparisonData, RecentSession, Top5MapEntry } from '../../../hooks/useDashboardData';

// ============================================================================
// Types
// ============================================================================

export type { PlaytimeTrendData, CategoryData, ComparisonData, RecentSession, Top5MapEntry, DashboardData };

interface DashboardContextValue {
    data: DashboardData;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    timeRange: TimeRange;
    refresh: () => void;
}

// ============================================================================
// Context
// ============================================================================

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface DashboardProviderProps {
    messageChannel: MessageChannel;
    timeRange: TimeRange;
    children: ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({
    messageChannel,
    timeRange,
    children,
}) => {
    const { data, status, error, refresh } = useDashboardData(messageChannel, timeRange);

    return (
        <DashboardContext.Provider value={{ data, status, error, timeRange, refresh }}>
            {children}
        </DashboardContext.Provider>
    );
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access dashboard data from context.
 * Must be used within a DashboardProvider.
 */
export function useDashboard(): DashboardContextValue {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}

/**
 * Hook to get playtime trend data.
 * Convenience wrapper around useDashboard.
 */
export function usePlaytimeTrend(): { data: PlaytimeTrendData; isLoading: boolean } {
    const { data, status } = useDashboard();
    return {
        data: data.playtimeTrend,
        isLoading: status === 'loading',
    };
}

/**
 * Hook to get category breakdown data.
 */
export function useCategoryData(): { data: CategoryData; isLoading: boolean } {
    const { data, status } = useDashboard();
    return {
        data: data.categoryData,
        isLoading: status === 'loading',
    };
}

/**
 * Hook to get comparison data.
 */
export function useComparisonData(): { data: ComparisonData; isLoading: boolean } {
    const { data, status } = useDashboard();
    return {
        data: data.comparison,
        isLoading: status === 'loading',
    };
}

/**
 * Hook to get recent sessions.
 */
export function useRecentSessions(): { sessions: RecentSession[]; isLoading: boolean } {
    const { data, status } = useDashboard();
    return {
        sessions: data.recentSessions,
        isLoading: status === 'loading',
    };
}

/**
 * Hook to get top 5 maps.
 */
export function useTop5Maps(): { maps: Top5MapEntry[]; isLoading: boolean } {
    const { data, status } = useDashboard();
    return {
        maps: data.top5Maps,
        isLoading: status === 'loading',
    };
}
