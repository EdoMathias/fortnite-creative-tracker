import React, { useState, useEffect, useCallback } from 'react';
import { kFortniteBRdeeplink, MapData } from '../../../../../shared/consts';
import { formatPlayTime } from '../../../../../shared/utils/timeFormat';

/** Time range categories for the gallery */
type HeroCategory = 'today' | 'week' | 'allTime';

interface HeroMapGalleryProps {
    topMaps: {
        today: MapData | null;
        week: MapData | null;
        allTime: MapData | null;
    };
    onLaunch: (mapId: string) => void;
    /** Auto-rotate interval in milliseconds (default: 8000) */
    rotateInterval?: number;
}

const categoryConfig: Record<HeroCategory, { label: string; emoji: string; headerTitle: string }> = {
    today: {
        label: 'Most Played Today',
        emoji: '📅',
        headerTitle: 'Top Played Map Today',
    },
    week: {
        label: 'Most Played This Week',
        emoji: '🏆',
        headerTitle: 'Top Played Map This Week',
    },
    allTime: {
        label: 'Most Played All Time',
        emoji: '👑',
        headerTitle: 'Top Played Map Overall',
    },
};

const emptyStateMap = {
    map_id: 'br_main',
    title: 'Battle Royale — Island',
    plays: 0,
    thumbnail: '/assets/br_main_thumb.jpg', // ensure asset exists
    description: 'Default Battle Royale island — featured until you play maps',
    isFallback: true,
};

const HeroMapEmptyState: React.FC = () => {

    const onDefaultBrLaunch = () => {
        // Launch the default Battle Royale map via deep link
        window.open(kFortniteBRdeeplink, '_blank');
    };

    return (
        <div
            className="overview-hero-map"
            style={{
                backgroundImage: emptyStateMap.thumbnail ? `url(${emptyStateMap.thumbnail})` : 'none',
            }}
        >
            <div className="overview-hero-content">
                <h2 className="overview-hero-title">{emptyStateMap.title || emptyStateMap.map_id}</h2>
                <div className="overview-hero-meta">
                    <span className="overview-hero-code">{emptyStateMap.map_id}</span>
                    {/* <span className="overview-hero-time">{emptyStateMap.timePlayed}</span> */}
                    <span className="overview-hero-label">• {emptyStateMap.description}</span>
                </div>
                <button
                    className="overview-hero-launch"
                    onClick={() => onDefaultBrLaunch()}
                >
                    ▶ LAUNCH MAP
                </button>
            </div>
        </div>
    )
};

/**
 * Rotating gallery component that displays top played maps for different time ranges.
 * Auto-rotates between Today, This Week, and All Time top maps.
 */
const HeroMapGallery: React.FC<HeroMapGalleryProps> = ({
    topMaps,
    onLaunch,
    rotateInterval = 8000
}) => {
    // Get available categories (ones with actual map data)
    const getAvailableCategories = useCallback((): HeroCategory[] => {
        const categories: HeroCategory[] = [];
        if (topMaps.today) categories.push('today');
        if (topMaps.week) categories.push('week');
        if (topMaps.allTime) categories.push('allTime');
        return categories.length > 0 ? categories : ['week']; // Default to week if none
    }, [topMaps]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [availableCategories, setAvailableCategories] = useState<HeroCategory[]>(getAvailableCategories());

    // Update available categories when topMaps changes
    useEffect(() => {
        const newCategories = getAvailableCategories();
        setAvailableCategories(newCategories);
        // Reset index if current is out of bounds
        setCurrentIndex(prev => prev >= newCategories.length ? 0 : prev);
    }, [topMaps, getAvailableCategories]);

    // Auto-rotate effect
    useEffect(() => {
        if (availableCategories.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % availableCategories.length);
        }, rotateInterval);

        return () => clearInterval(timer);
    }, [availableCategories.length, rotateInterval]);

    const currentCategory = availableCategories[currentIndex] || 'week';
    const currentMap = topMaps[currentCategory];
    const config = categoryConfig[currentCategory];

    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

    const handlePrev = () => {
        setCurrentIndex(prev =>
            prev === 0 ? availableCategories.length - 1 : prev - 1
        );
    };

    const handleNext = () => {
        setCurrentIndex(prev => (prev + 1) % availableCategories.length);
    };

    // Check if we have any maps at all
    const hasAnyMaps = topMaps.today || topMaps.week || topMaps.allTime;

    return (
        <div className="overview-tile overview-tile-wide overview-hero-tile">
            <div className="overview-tile-header">
                <h3>{config.emoji} {config.headerTitle}</h3>
                {availableCategories.length > 1 && (
                    <div className="hero-gallery-controls">
                        <button
                            className="hero-gallery-arrow hero-gallery-prev"
                            onClick={handlePrev}
                            aria-label="Previous"
                        >
                            ‹
                        </button>
                        <div className="hero-gallery-dots">
                            {availableCategories.map((cat, idx) => (
                                <button
                                    key={cat}
                                    className={`hero-gallery-dot ${idx === currentIndex ? 'active' : ''}`}
                                    onClick={() => handleDotClick(idx)}
                                    aria-label={categoryConfig[cat].label}
                                    title={categoryConfig[cat].label}
                                />
                            ))}
                        </div>
                        <button
                            className="hero-gallery-arrow hero-gallery-next"
                            onClick={handleNext}
                            aria-label="Next"
                        >
                            ›
                        </button>
                    </div>
                )}
            </div>
            {hasAnyMaps && currentMap ? (
                <div
                    className="overview-hero-map"
                    style={{
                        backgroundImage: currentMap.thumbnail ? `url(${currentMap.thumbnail})` : 'none',
                    }}
                >
                    <div className="overview-hero-content">
                        <h2 className="overview-hero-title">{currentMap.title || currentMap.map_id}</h2>
                        <div className="overview-hero-meta">
                            <span className="overview-hero-code">{currentMap.map_id}</span>
                            <span className="overview-hero-time">{formatPlayTime(currentMap.timePlayedMs)}</span>
                            <span className="overview-hero-label">• {config.label}</span>
                        </div>
                        <button
                            className="overview-hero-launch"
                            onClick={() => onLaunch(currentMap.map_id)}
                        >
                            ▶ LAUNCH MAP
                        </button>
                    </div>
                </div>
            ) : (
                <HeroMapEmptyState />
            )}
        </div>
    );
};

export default HeroMapGallery;
