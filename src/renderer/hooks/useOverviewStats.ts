/**
 * @fileoverview Hook for fetching overview statistics via MessageChannel.
 * Provides total playtime, maps played count, and average session duration.
 */

import { useEffect, useState, useCallback } from 'react';
import { MessageChannel, MessageType, MessagePayload } from '../../main/services/MessageChannel';
import { kWindowNames } from '../../shared/consts';
import { formatDuration } from '../../shared/utils/dateUtils';

// ============================================================================
// Types
// ============================================================================

export interface OverviewStats {
    totalPlaytimeMs: number;
    mapsPlayed: number;
    avgSessionMs: number;
}

export interface FormattedOverviewStats {
    totalPlaytime: string;
    mapsPlayed: number;
    avgSession: string;
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

// ============================================================================
// Hook
// ============================================================================

interface UseOverviewStatsResult {
    stats: FormattedOverviewStats;
    rawStats: OverviewStats;
    status: FetchStatus;
    error: string | null;
    refresh: () => void;
}

const defaultStats: OverviewStats = {
    totalPlaytimeMs: 0,
    mapsPlayed: 0,
    avgSessionMs: 0,
};

const defaultFormattedStats: FormattedOverviewStats = {
    totalPlaytime: '0m',
    mapsPlayed: 0,
    avgSession: '0m',
};

/**
 * Hook to fetch overview statistics.
 * Automatically subscribes to updates and requests data on mount.
 * 
 * @param messageChannel - The MessageChannel instance for communication
 * @returns Overview stats (formatted and raw), status, error, and refresh function
 */
export function useOverviewStats(messageChannel: MessageChannel): UseOverviewStatsResult {
    const [rawStats, setRawStats] = useState<OverviewStats>(defaultStats);
    const [stats, setStats] = useState<FormattedOverviewStats>(defaultFormattedStats);
    const [status, setStatus] = useState<FetchStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    // Request data from background
    const requestData = useCallback(() => {
        setStatus('loading');
        setError(null);
        
        messageChannel.sendMessage(
            kWindowNames.background,
            MessageType.OVERVIEW_REQUEST,
            {}
        );
    }, [messageChannel]);

    // Subscribe to overview updates
    useEffect(() => {
        const unsubscribe = messageChannel.onMessage(
            MessageType.OVERVIEW_UPDATED,
            (payload: MessagePayload) => {
                const {
                    totalPlaytimeMs,
                    mapsPlayed,
                    avgSessionMs,
                } = payload.data ?? {};

                if (typeof totalPlaytimeMs !== 'number') {
                    setStatus('error');
                    setError('Invalid data received');
                    return;
                }

                const newRawStats: OverviewStats = {
                    totalPlaytimeMs: totalPlaytimeMs ?? 0,
                    mapsPlayed: mapsPlayed ?? 0,
                    avgSessionMs: avgSessionMs ?? 0,
                };

                setRawStats(newRawStats);
                setStats({
                    totalPlaytime: formatDuration(newRawStats.totalPlaytimeMs),
                    mapsPlayed: newRawStats.mapsPlayed,
                    avgSession: formatDuration(newRawStats.avgSessionMs),
                });
                setStatus('success');
                setError(null);
            }
        );

        return () => unsubscribe();
    }, [messageChannel]);

    // Also listen to MAP_UPDATED to refresh when sessions end
    useEffect(() => {
        const unsubscribe = messageChannel.onMessage(
            MessageType.MAP_UPDATED,
            () => {
                // Debounce refresh
                const timeout = setTimeout(() => {
                    requestData();
                }, 500);
                return () => clearTimeout(timeout);
            }
        );

        return () => unsubscribe();
    }, [messageChannel, requestData]);

    // Listen to game time updates to refresh stats (current session time affects totals)
    useEffect(() => {
        const unsubscribe = messageChannel.onMessage(
            MessageType.GAME_TIME_UPDATED,
            () => {
                // Refresh stats when game time updates (debounced to avoid too frequent updates)
                const timeout = setTimeout(() => {
                    requestData();
                }, 2000);
                return () => clearTimeout(timeout);
            }
        );

        return () => unsubscribe();
    }, [messageChannel, requestData]);

    // Request data on mount
    useEffect(() => {
        requestData();

        // Timeout fallback
        const timeout = setTimeout(() => {
            setStatus(current => {
                if (current === 'loading') {
                    return 'success';
                }
                return current;
            });
        }, 3000);

        return () => clearTimeout(timeout);
    }, [requestData]);

    return {
        stats,
        rawStats,
        status,
        error,
        refresh: requestData,
    };
}
