import React, { useState, useMemo, useCallback } from 'react';
import { LibraryMapData, SortOption, FilterOption } from './types';
import { SortSelector, FilterTabs, LibraryRow, SearchBox } from './components';
import { useLaunching } from '../../../contexts/LaunchingContext';
import { createLogger } from '../../../../shared/services';
import { MessageChannel } from '../../../../main/services/MessageChannel';
import { useLibraryData } from '../../../hooks/useLibraryData';

const logger = createLogger('Library');

/** Storage key for favorites */
const FAVORITES_STORAGE_KEY = 'fortnite_tracker_favorites';

/**
 * Load favorites from localStorage
 */
const loadFavorites = (): Set<string> => {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    logger.error('Error loading favorites:', error);
  }
  return new Set();
};

/**
 * Save favorites to localStorage
 */
const saveFavorites = (favorites: Set<string>): void => {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
  } catch (error) {
    logger.error('Error saving favorites:', error);
  }
};

/**
 * Sort maps based on selected sort option
 */
/**
 * Get the display name for a map (title if available, otherwise map_id)
 */
const getMapDisplayName = (map: LibraryMapData): string => {
  return map.title || map.map_id || '';
};

const sortMaps = (maps: LibraryMapData[], sortBy: SortOption): LibraryMapData[] => {
  const sorted = [...maps];

  switch (sortBy) {
    case 'total-time':
      return sorted.sort((a, b) => (b.totalPlayTime || 0) - (a.totalPlayTime || 0));
    case 'last-played':
      return sorted.sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
    case 'first-played':
      return sorted.sort((a, b) => (a.firstPlayed || 0) - (b.firstPlayed || 0));
    case 'session-count':
      return sorted.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    case 'a-z':
      return sorted.sort((a, b) =>
        getMapDisplayName(a).localeCompare(getMapDisplayName(b))
      );
    case 'z-a':
      return sorted.sort((a, b) =>
        getMapDisplayName(b).localeCompare(getMapDisplayName(a))
      );
    default:
      return sorted;
  }
};

interface LibraryProps {
  messageChannel: MessageChannel;
}

const Library: React.FC<LibraryProps> = ({ messageChannel }) => {
  const [sortBy, setSortBy] = useState<SortOption>('last-played');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const { launchMap } = useLaunching();
  
  // Use real data from the backend
  const { maps: libraryMaps } = useLibraryData(messageChannel);

  // Merge real data with favorites state
  const mapsWithFavorites = useMemo((): LibraryMapData[] => {
    return libraryMaps.map((map) => ({
      ...map,
      isFavorite: favorites.has(map.map_id),
    }));
  }, [libraryMaps, favorites]);

  // Apply search, filter and sort
  const displayedMaps = useMemo(() => {
    let filtered = mapsWithFavorites;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (map) =>
          (map.title?.toLowerCase().includes(query) ?? false) ||
          map.map_id.toLowerCase().includes(query)
      );
    }

    // Apply favorites filter
    if (filter === 'favorites') {
      filtered = filtered.filter((map) => map.isFavorite);
    }

    return sortMaps(filtered, sortBy);
  }, [mapsWithFavorites, filter, sortBy, searchQuery]);

  const favoritesCount = useMemo(
    () => mapsWithFavorites.filter((m) => m.isFavorite).length,
    [mapsWithFavorites]
  );

  const handleToggleFavorite = useCallback((mapId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(mapId)) {
        next.delete(mapId);
      } else {
        next.add(mapId);
      }
      saveFavorites(next);
      return next;
    });
  }, []);

  const handlePlayMap = useCallback(
    (mapId: string) => {
      logger.log('Launching map:', mapId);
      launchMap(mapId);
    },
    [launchMap]
  );

  return (
    <div className="library-container">
      <div className="library-header">
        <div className="library-header-left">
          <h2 className="library-title">Library</h2>
          <p className="library-subtitle">
            Your personal collection of Creative maps
          </p>
        </div>
        <div className="library-header-right">
          <SearchBox value={searchQuery} onChange={setSearchQuery} />
          <SortSelector value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      <FilterTabs
        value={filter}
        onChange={setFilter}
        favoritesCount={favoritesCount}
        totalCount={mapsWithFavorites.length}
      />

      <div className="library-list">
        {displayedMaps.length === 0 ? (
          <div className="library-empty">
            {searchQuery.trim() ? (
              <>
                <span className="library-empty-icon">🔍</span>
                <span className="library-empty-text">No maps found</span>
                <span className="library-empty-hint">
                  Try a different search term or clear the search
                </span>
              </>
            ) : filter === 'favorites' ? (
              <>
                <span className="library-empty-icon">⭐</span>
                <span className="library-empty-text">No favorites yet</span>
                <span className="library-empty-hint">
                  Click the star icon on any map to add it to your favorites
                </span>
              </>
            ) : (
              <>
                <span className="library-empty-icon">🎮</span>
                <span className="library-empty-text">No maps played yet</span>
                <span className="library-empty-hint">
                  Play some Creative maps and they'll show up here!
                </span>
              </>
            )}
          </div>
        ) : (
          displayedMaps.map((map) => (
            <LibraryRow
              key={map.map_id}
              map={map}
              onToggleFavorite={handleToggleFavorite}
              onPlay={handlePlayMap}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Library;
