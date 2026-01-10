import { useState, useEffect, useCallback } from 'react';
import { MapData } from '../../shared/consts';

const STORAGE_KEYS = {
    mapsPlayed: 'maps-played',
    topMaps: 'top-maps',
    recentMaps: 'recent-maps',
} as const;

export const useMapsData = () => {
    const [mapsPlayed, setMapsPlayed] = useState<MapData[]>([]);
    const [topMaps, setTopMaps] = useState<MapData[]>([]);
    const [recentMaps, setRecentMaps] = useState<MapData[]>([]);

    useEffect(() => {
        const loadFromStorage = (key: string) => {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        };

        setMapsPlayed(loadFromStorage(STORAGE_KEYS.mapsPlayed));
        setTopMaps(loadFromStorage(STORAGE_KEYS.topMaps));
        setRecentMaps(loadFromStorage(STORAGE_KEYS.recentMaps));
    }, []);

    const handleMapUpdate = useCallback((map: MapData) => {
        const updateList = (key: string, setter: React.Dispatch<React.SetStateAction<MapData[]>>) => {
            const existing = localStorage.getItem(key);
            const list = existing ? JSON.parse(existing) : [];
            if (!list.some((item: MapData) => item.map_id === map.map_id)) {
                list.push(map);
            }
            setter(list);
            localStorage.setItem(key, JSON.stringify(list));
        };

        updateList(STORAGE_KEYS.mapsPlayed, setMapsPlayed);
        updateList(STORAGE_KEYS.topMaps, setTopMaps);
        updateList(STORAGE_KEYS.recentMaps, setRecentMaps);
    }, []);

    return { mapsPlayed, topMaps, recentMaps, handleMapUpdate };
};