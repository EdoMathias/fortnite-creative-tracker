import { useEffect, useState, useCallback } from "react";
import { MessageChannel, MessageType, MessagePayload } from "../../main/services/MessageChannel";
import { MapUpdateMessage } from "../../shared/consts";

interface ActiveSession {
    map_id: string | null;
    startedAt: number | null;
    elapsedSeconds: number;
}

/**
 * Hook to track the currently active map session.
 * Subscribes to MAP_UPDATED messages to receive session state changes.
 * 
 * @param messageChannel - Optional MessageChannel instance. If not provided, 
 *                         the hook will rely on manual updates via handleMapUpdate.
 * @returns Active session data with elapsed time counter
 */
export const useActiveSession = (messageChannel?: MessageChannel): {
    session: ActiveSession;
    handleMapUpdate: (message: MapUpdateMessage) => void;
} => {
    const [session, setSession] = useState<{
        map_id: string | null;
        startedAt: number | null;
    }>({
        map_id: null,
        startedAt: null,
    });

    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

    // Handle incoming map update messages
    const handleMapUpdate = useCallback((message: MapUpdateMessage) => {
        if (message.activeSession) {
            setSession({
                map_id: message.activeSession.map_id,
                startedAt: message.activeSession.startedAt,
            });
        } else {
            // No active session - player left the map
            setSession({
                map_id: null,
                startedAt: null,
            });
        }
    }, []);

    // Subscribe to MAP_UPDATED messages if messageChannel is provided
    useEffect(() => {
        if (!messageChannel) return;

        const unsubscribe = messageChannel.onMessage(
            MessageType.MAP_UPDATED,
            (payload: MessagePayload) => {
                const message = payload.data as MapUpdateMessage;
                if (message) {
                    handleMapUpdate(message);
                }
            }
        );

        return () => unsubscribe();
    }, [messageChannel, handleMapUpdate]);

    // Calculate elapsed time
    useEffect(() => {
        if (!session.startedAt) {
            setElapsedSeconds(0);
            return;
        }

        // Calculate initial elapsed time
        const now = Date.now();
        const initialElapsed = Math.floor((now - session.startedAt) / 1000);
        setElapsedSeconds(initialElapsed);

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - session.startedAt!) / 1000);
            setElapsedSeconds(elapsed);
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [session.startedAt]);

    return {
        session: {
            map_id: session.map_id,
            startedAt: session.startedAt,
            elapsedSeconds,
        },
        handleMapUpdate,
    };
}