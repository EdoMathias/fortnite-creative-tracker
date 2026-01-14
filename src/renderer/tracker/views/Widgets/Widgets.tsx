import React from 'react';
import { HotkeysWidget } from './components';
import RecentMapsWidget from './components/RecentMapsWidget';
import { ActiveSession, MapData } from '../../../../shared/consts';

interface WidgetsProps {
    recentMaps: MapData[];
    activeSession: ActiveSession | null;
}

/**
 * Widgets view - displays customizable widgets for game tracking
 */
const Widgets: React.FC<WidgetsProps> = ({ recentMaps, activeSession }) => {

    return (
        <div className="widgets-page-container">
            <div className="widgets-page-header">
                <div className="widgets-page-header-left">
                    <h2 className="widgets-page-title">Widgets</h2>
                    <p className="widgets-page-subtitle">
                        Monitor your gameplay with customizable widgets
                    </p>
                </div>
            </div>

            <div className="widgets-page-grid">
                <RecentMapsWidget recentMaps={recentMaps} activeSession={activeSession} />
                <HotkeysWidget />
            </div>
        </div>
    );
};

export default Widgets;
