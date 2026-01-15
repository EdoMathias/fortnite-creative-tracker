// Realtime hook removed — placeholder exports to avoid breaking references.
import { useState, useEffect, useCallback } from 'react';

type Listener = () => void;
const listeners = new Set<Listener>();

export function useRealtimeData<T>(fetchFn: () => Promise<T> | T, deps: any[] = []) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchFn();
            setData(result as T);
        } catch (e) {
            // swallow — caller may handle
            console.error('useRealtimeData fetch error', e);
        } finally {
            setLoading(false);
        }
    }, deps);

    useEffect(() => {
        refresh();
        const listener: Listener = () => refresh();
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, [refresh]);

    return { data, loading, refresh };
}

export function triggerDataUpdate() {
    listeners.forEach((l) => l());
}
