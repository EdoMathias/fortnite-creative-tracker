/**
 * @fileoverview Hook for fetching library data (all played maps) via MessageChannel.
 * Provides a list of all maps the user has played with their statistics.
 */

import { useEffect, useState, useCallback } from 'react';
import { MessageChannel, MessageType, MessagePayload } from '../../main/services/MessageChannel';
import { kWindowNames } from '../../shared/consts';

// ============================================================================
// Types
// ============================================================================

export interface LibraryMapData {
    map_id: string;
    title?: string;
    thumbnail?: string;
    /** Total play time in milliseconds */
    totalPlayTime: number;
    /** Number of play sessions */
    playCount: number;
    /** Last played timestamp */
    lastPlayed: number;
    /** First played timestamp */
    firstPlayed: number;
    /** Whether the map is favorited (managed locally) */
    isFavorite?: boolean;
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

// ============================================================================
// Hook
// ============================================================================

interface UseLibraryDataResult {
    maps: LibraryMapData[];
    status: FetchStatus;
    error: string | null;
    refresh: () => void;
}

/**
 * Hook to fetch library data (all maps ever played).
 * Automatically subscribes to updates and requests data on mount.
 * 
 * @param messageChannel - The MessageChannel instance for communication
 * @returns Library maps data, status, error, and refresh function
 */
export function useLibraryData(messageChannel: MessageChannel): UseLibraryDataResult {
    const [maps, setMaps] = useState<LibraryMapData[]>([]);
    const [status, setStatus] = useState<FetchStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    // Request data from background
    const requestData = useCallback(() => {
        setStatus('loading');
        setError(null);
        
        messageChannel.sendMessage(
            kWindowNames.background,
            MessageType.LIBRARY_REQUEST,
            {}
        );
    }, [messageChannel]);

    // Subscribe to library updates
    useEffect(() => {
        const unsubscribe = messageChannel.onMessage(
            MessageType.LIBRARY_UPDATED,
            (payload: MessagePayload) => {
                const incomingMaps = payload.data?.maps as LibraryMapData[] | undefined;

                if (!Array.isArray(incomingMaps)) {
                    setStatus('error');
                    setError('Invalid data received');
                    return;
                }

                setMaps(incomingMaps);
                setStatus('success');
                setError(null);
            }
        );

        return () => unsubscribe();
    }, [messageChannel]);

    // Also listen to MAP_UPDATED to refresh library when new maps are played
    useEffect(() => {
        const unsubscribe = messageChannel.onMessage(
            MessageType.MAP_UPDATED,
            () => {
                // Debounce refresh requests
                const timeout = setTimeout(() => {
                    requestData();
                }, 1000);
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
        maps,
        status,
        error,
        refresh: requestData,
    };
}
