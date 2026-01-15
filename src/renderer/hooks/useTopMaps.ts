/**
 * @fileoverview Hook for fetching top played maps across multiple time ranges.
 * Used by the Overview page for the rotating hero gallery.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { MessageChannel, MessageType, MessagePayload } from '../../main/services/MessageChannel';
import { kWindowNames, MapData, TimeRange } from '../../shared/consts';

export interface TopMapsData {
    /** Top map played today */
    today: MapData | null;
    /** Top map played this week (7 days) */
    week: MapData | null;
    /** Top map played all time */
    allTime: MapData | null;
}

interface UseTopMapsResult {
    topMaps: TopMapsData;
    isLoading: boolean;
    refresh: () => void;
}

/**
 * Hook to fetch the top played maps for multiple time ranges.
 * 
 * @param messageChannel - The MessageChannel instance for communication
 * @returns The top maps data for each time range, loading state, and refresh function
 */
export function useTopMaps(messageChannel: MessageChannel): UseTopMapsResult {
    const [topMaps, setTopMaps] = useState<TopMapsData>({
        today: null,
        week: null,
        allTime: null,
    });
    const [isLoading, setIsLoading] = useState(true);
    const pendingRequests = useRef(new Set<TimeRange>());

    // Request data from background for all time ranges
    const requestData = useCallback(() => {
        setIsLoading(true);
        pendingRequests.current = new Set(['today', '7d', 'all']);
        
        // Request each time range
        const ranges: TimeRange[] = ['today', '7d', 'all'];
        ranges.forEach(range => {
            messageChannel.sendMessage(
                kWindowNames.background,
                MessageType.TOP_MAPS_REQUEST,
                { range }
            );
        });
    }, [messageChannel]);

    // Subscribe to top maps updates
    useEffect(() => {
        const unsubscribe = messageChannel.onMessage(
            MessageType.TOP_MAPS_UPDATED,
            (payload: MessagePayload) => {
                const range = payload.data?.range as TimeRange;
                const maps = payload.data?.maps as MapData[] | undefined;
                const topMap = Array.isArray(maps) && maps.length > 0 ? maps[0] : null;

                setTopMaps(prev => {
                    switch (range) {
                        case 'today':
                            return { ...prev, today: topMap };
                        case '7d':
                            return { ...prev, week: topMap };
                        case 'all':
                            return { ...prev, allTime: topMap };
                        default:
                            return prev;
                    }
                });

                // Track completed requests
                pendingRequests.current.delete(range);
                if (pendingRequests.current.size === 0) {
                    setIsLoading(false);
                }
            }
        );

        return () => unsubscribe();
    }, [messageChannel]);

    // Also listen to MAP_UPDATED to refresh when sessions end
    useEffect(() => {
        const unsubscribe = messageChannel.onMessage(
            MessageType.MAP_UPDATED,
            (payload: MessagePayload) => {
                // If a session ended, refresh all data
                if (payload.data?.sessionEnded) {
                    setTimeout(() => requestData(), 500);
                }
            }
        );

        return () => unsubscribe();
    }, [messageChannel, requestData]);

    // Request data on mount
    useEffect(() => {
        requestData();

        // Timeout fallback
        const timeout = setTimeout(() => {
            setIsLoading(false);
        }, 5000);

        return () => clearTimeout(timeout);
    }, [requestData]);

    return {
        topMaps,
        isLoading,
        refresh: requestData,
    };
}
