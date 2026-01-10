import { useState } from "react";
import { ViewMode } from "../widgets/types";
import { createLogger } from "../../shared/services/Logger";

const logger = createLogger('useViewMode');

export const useViewMode = () => {
    const VIEW_MODE_STORAGE_KEY = 'fortnite_tracker_view_mode';
    const VIEW_MODE_TABS: { mode: ViewMode; label: string; icon: string }[] = [
        { mode: 'overview', label: 'Overview', icon: '🏠' },
        { mode: 'top-maps', label: 'Top Maps', icon: '🗺️' },
        { mode: 'dashboards', label: 'Dashboards', icon: '📊' },
        { mode: 'recommendations', label: 'Recommendations', icon: '💡' },
        { mode: 'widgets', label: 'Widgets', icon: '🧩' },
    ];

    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        try {
            const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
            if (stored && VIEW_MODE_TABS.some(tab => tab.mode === stored)) {
                return stored as ViewMode;
            }
        } catch (error) {
            logger.error('Error loading view mode:', error);
        }
        return 'overview';
    });

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        try {
            localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
        } catch (error) {
            logger.error('Error saving view mode:', error);
        }
    };
    return { viewMode, handleViewModeChange, VIEW_MODE_TABS };
};

export default useViewMode;