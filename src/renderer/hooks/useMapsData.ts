import { useState, useEffect, useCallback } from 'react';
import { ActiveSession, MapData, MapUpdateMessage } from '../../shared/consts';

const STORAGE_KEYS = {
    mapsPlayed: 'maps-played',
    topMaps: 'top-maps',
    recentMaps: 'recent-maps',
} as const;

/**
 * Format milliseconds into a human-readable time string
 */
const formatTimeMs = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m`;
    }
    return '< 1m';
};

export const useMapsData = () => {
    const [mapsPlayed, setMapsPlayed] = useState<MapData[]>([]);
    const [topMaps, setTopMaps] = useState<MapData[]>([]);
    const [recentMaps, setRecentMaps] = useState<MapData[]>([]);
    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

    useEffect(() => {
        const loadFromStorage = (key: string) => {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        };

        setMapsPlayed(loadFromStorage(STORAGE_KEYS.mapsPlayed));
        setTopMaps(loadFromStorage(STORAGE_KEYS.topMaps));
        setRecentMaps(loadFromStorage(STORAGE_KEYS.recentMaps));
    }, []);

    const handleMapUpdate = useCallback((message: MapUpdateMessage) => {
        // Update active session (stored in memory only - no localStorage!)
        setActiveSession(message.activeSession);

            // If a session just ended, update the time for that map (store ms)
            if (message.sessionEnded) {
                const { map_id, totalTimeMs } = message.sessionEnded;

                const updateTimeForMap = (key: string, setter: React.Dispatch<React.SetStateAction<MapData[]>>) => {
                    const existing = localStorage.getItem(key);
                    const list: MapData[] = existing ? JSON.parse(existing) : [];

                    const updatedList = list.map((item) => {
                        if (item.map_id === map_id) {
                            return { ...item, timePlayedMs: totalTimeMs } as MapData;
                        }
                        return item;
                    });

                    setter(updatedList);
                    localStorage.setItem(key, JSON.stringify(updatedList));
                };

                updateTimeForMap(STORAGE_KEYS.recentMaps, setRecentMaps);
                updateTimeForMap(STORAGE_KEYS.mapsPlayed, setMapsPlayed);
                updateTimeForMap(STORAGE_KEYS.topMaps, setTopMaps);
            }

        // Only update lists if we have map data (entering a new map)
        if (!message.map) return;

        const mapPayload = message.map;
        const now = new Date().toISOString();

        const updateList = (key: string, setter: React.Dispatch<React.SetStateAction<MapData[]>>) => {
            const existing = localStorage.getItem(key);
            const list: MapData[] = existing ? JSON.parse(existing) : [];
            
            const existingIndex = list.findIndex((item: MapData) => item.map_id === mapPayload.map_id);
            
            if (existingIndex >= 0) {
                // Update existing map - preserve timePlayedMs if present, update lastPlayed
                list[existingIndex] = {
                    ...list[existingIndex],
                    title: mapPayload.title || list[existingIndex].title,
                    lastPlayed: now,
                };
            } else {
                // Add new map
                const newMap: MapData = {
                    map_id: mapPayload.map_id,
                    title: mapPayload.title,
                    timePlayedMs: 0,
                    lastPlayed: now,
                } as MapData;
                list.push(newMap);
            }
            
            setter([...list]);
            localStorage.setItem(key, JSON.stringify(list));
        };

        updateList(STORAGE_KEYS.mapsPlayed, setMapsPlayed);
        updateList(STORAGE_KEYS.topMaps, setTopMaps);
        updateList(STORAGE_KEYS.recentMaps, setRecentMaps);
    }, []);

    return { mapsPlayed, topMaps, recentMaps, activeSession, handleMapUpdate };
};