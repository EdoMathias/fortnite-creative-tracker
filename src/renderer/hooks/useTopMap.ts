/**
 * @fileoverview Hook for fetching the top played map for the week.
 * Used by the Overview page to display the "Top Played Map This Week" hero.
 */

import { useEffect, useState, useCallback } from 'react';
import { MessageChannel, MessageType, MessagePayload } from '../../main/services/MessageChannel';
import { kWindowNames, MapData } from '../../shared/consts';

interface UseTopMapResult {
    topMap: MapData | null;
    isLoading: boolean;
    refresh: () => void;
}

/**
 * Hook to fetch the top played map for the last 7 days.
 * 
 * @param messageChannel - The MessageChannel instance for communication
 * @returns The top map data, loading state, and refresh function
 */
export function useTopMap(messageChannel: MessageChannel): UseTopMapResult {
    const [topMap, setTopMap] = useState<MapData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Request data from background
    const requestData = useCallback(() => {
        setIsLoading(true);
        
        messageChannel.sendMessage(
            kWindowNames.background,
            MessageType.TOP_MAPS_REQUEST,
            { range: '7d' }
        );
    }, [messageChannel]);

    // Subscribe to top maps updates
    useEffect(() => {
        const unsubscribe = messageChannel.onMessage(
            MessageType.TOP_MAPS_UPDATED,
            (payload: MessagePayload) => {
                const range = payload.data?.range;
                const maps = payload.data?.maps as MapData[] | undefined;

                // Only process 7d range responses for the overview
                if (range !== '7d') return;

                if (Array.isArray(maps) && maps.length > 0) {
                    setTopMap(maps[0]);
                } else {
                    setTopMap(null);
                }
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [messageChannel]);

    // Also listen to MAP_UPDATED to refresh when sessions end
    useEffect(() => {
        const unsubscribe = messageChannel.onMessage(
            MessageType.MAP_UPDATED,
            (payload: MessagePayload) => {
                // If a session ended, refresh the top map
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
        }, 3000);

        return () => clearTimeout(timeout);
    }, [requestData]);

    return {
        topMap,
        isLoading,
        refresh: requestData,
    };
}
