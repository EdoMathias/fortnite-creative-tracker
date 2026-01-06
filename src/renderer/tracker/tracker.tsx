import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { OWHotkeys } from "@overwolf/overwolf-api-ts";
import { AppWindow } from "../AppWindow";
import { kWindowNames, kHotkeys, kGameClassIds } from "../../shared/consts";
import { Item, KeepCategoryKey } from "../../shared/types";
import { AppHeader, FTUEWelcomeModal, FTUETooltip, UnassignedHotkeyModal, FTUEAutoCompleteQuestsModal, ReleaseNotesModal } from "../components";
import { FTUEProvider, useFTUE } from "../contexts/FTUEContext";
import { SearchBar, TrackedItemList, TrackedItemDetail, AdContainer, Settings } from "./components";
import { getTrackableItems, getTotalCountNeeded, getKeepReasons } from "./utils";
import { useOwnedItems } from "./hooks/useOwnedItems";
import { MessageChannel, MessageType } from "../../main/services/MessageChannel";
import { imageCacheService } from "../services/ImageCacheService";
import { getItemsArray, shouldKeepForEvents } from "../../shared/utils";
import { createLogger } from '../../shared/services/Logger';
import { itemsDataService } from "../../shared/services/ItemsDataService";
import { releaseNotesService, ReleaseNoteEntry, RELEASE_NOTES_STORAGE_KEY } from '../services/ReleaseNotesService';
import { ViewMode } from "../widgets/types";
import { WidgetContainer } from "../widgets";
import { gameTimeService } from "../../shared/services/GameTimeService";
import "../styles/styles.css";

const logger = createLogger('Tracker');
const VIEW_MODE_KEY_DESKTOP = 'recycleme_view_mode_desktop';
const VIEW_MODE_KEY_INGAME = 'recycleme_view_mode_ingame';
const getViewModeStorageKey = (windowName?: string | null) =>
  windowName === kWindowNames.trackerIngame ? VIEW_MODE_KEY_INGAME : VIEW_MODE_KEY_DESKTOP;

const Tracker: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [windowName, setWindowName] = useState<string | null>(null);
  const [hotkeyText, setHotkeyText] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'items-to-keep' | 'tracked' | 'completed'>('all');
  const [keepSubFilter, setKeepSubFilter] = useState<'all' | 'workshop' | 'quests' | 'projects' | 'events'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'hotkeys' | 'data' | 'about'>('general');
  // Load checkedDetails from localStorage on mount
  const [checkedDetails, setCheckedDetails] = useState<{
    [key: string]: boolean; // key format: `${itemName}-${category}-${detailLabel}`
  }>(() => {
    try {
      const stored = localStorage.getItem('recycleme_checked_details');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      logger.error('Error loading checked details:', error);
    }
    return {};
  });
  // Load tracked items from localStorage on mount
  // Format: Record<string, number> where key is item name and value is custom amount to track
  const [trackedItems, setTrackedItems] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('recycleme_tracked_items');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Backward compatibility: if it's an array of strings, convert to Record
        if (Array.isArray(parsed)) {
          const record: Record<string, number> = {};
          parsed.forEach((itemName: string) => {
            record[itemName] = 1; // Default to 1 for existing tracked items
          });
          return record;
        }
        return parsed as Record<string, number>;
      }
    } catch (error) {
      logger.error('Error loading tracked items:', error);
    }
    return {};
  });
  const [isIngameWindow, setIsIngameWindow] = useState<boolean>(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [releaseNotesEntry, setReleaseNotesEntry] = useState<ReleaseNoteEntry | null>(null);
  const [isReleaseNotesModalOpen, setIsReleaseNotesModalOpen] = useState<boolean>(false);
  const [releaseNotesViewed, setReleaseNotesViewed] = useState<boolean>(false);
  const [isMassCompleteOpen, setIsMassCompleteOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { getOwnedCount, incrementOwned, decrementOwned, setOwnedCount, resetOwned } = useOwnedItems();
  const { markStepComplete, shouldShowStep, isFTUEComplete } = useFTUE();
  const [showHotkeyWarning, setShowHotkeyWarning] = useState<boolean>(false);
  const [unassignedHotkeys, setUnassignedHotkeys] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('items');
  const viewModeStorageKey = useMemo(() => getViewModeStorageKey(windowName), [windowName]);
  // Load view mode per window (desktop vs in-game) with migration from legacy key
  useEffect(() => {
    try {
      const stored = localStorage.getItem(viewModeStorageKey);
      if (stored === 'widgets' || stored === 'items') {
        setViewMode(stored as ViewMode);
        return;
      }
      const legacy = localStorage.getItem('recycleme_view_mode');
      if (legacy === 'widgets' || legacy === 'items') {
        setViewMode(legacy as ViewMode);
        localStorage.setItem(viewModeStorageKey, legacy);
      }
    } catch (error) {
      logger.error('Error loading view mode:', error);
    }
  }, [viewModeStorageKey]);
  
  // Ref to track the last synced value to prevent infinite loops
  const lastSyncedTrackedItemsRef = useRef<string>('');
  const isSyncingRef = useRef<boolean>(false);

  // Initialize the ref with current trackedItems
  useEffect(() => {
    lastSyncedTrackedItemsRef.current = JSON.stringify(trackedItems);
  }, []);

  // Listen for view mode switch messages and game time updates
  useEffect(() => {
    const messageChannel = new MessageChannel();
    
    const unregisterViewMode = messageChannel.onMessage(MessageType.SWITCH_VIEW_MODE, (payload) => {
      if (payload.data && (payload.data.viewMode === 'items' || payload.data.viewMode === 'widgets')) {
        setViewMode(payload.data.viewMode);
        // Save to localStorage
        try {
          localStorage.setItem(viewModeStorageKey, payload.data.viewMode);
        } catch (error) {
          logger.error('Error saving view mode:', error);
        }
      }
    });

    // Listen for game time updates from background
    const unregisterGameTime = messageChannel.onMessage(MessageType.GAME_TIME_UPDATED, (payload) => {
      logger.debug('Received GAME_TIME_UPDATED message:', payload);
      // Reload GameTimeService data from localStorage to get latest session info
      gameTimeService.reloadData();
      // Trigger custom event to update widgets
      window.dispatchEvent(new Event('gameTimeChanged'));
    });

    logger.debug('Registered message handlers for SWITCH_VIEW_MODE and GAME_TIME_UPDATED');

    return () => {
      unregisterViewMode();
      unregisterGameTime();
    };
  }, [viewModeStorageKey]);

  // Keep trackedItems in sync with changes from other windows (e.g., ingame tracked list)
  useEffect(() => {
    const loadTrackedItems = () => {
      try {
        const stored = localStorage.getItem('recycleme_tracked_items');
        let newTrackedItems: Record<string, number> = {};
        
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // Backward compatibility: if it's an array of strings, convert to Record
            parsed.forEach((itemName: string) => {
              newTrackedItems[itemName] = 1;
            });
          } else {
            newTrackedItems = parsed as Record<string, number>;
          }
        }
        
        // Only update state if the values actually changed (prevent infinite loop)
        const newJson = JSON.stringify(newTrackedItems);
        if (lastSyncedTrackedItemsRef.current !== newJson) {
          isSyncingRef.current = true;
          lastSyncedTrackedItemsRef.current = newJson;
          setTrackedItems(newTrackedItems);
          // Reset sync flag after state update
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 0);
        }
      } catch (error) {
        logger.error('Error reloading tracked items from storage:', error);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'recycleme_tracked_items') {
        loadTrackedItems();
      }
    };

    const handleCustomStorageChange = () => {
      loadTrackedItems();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
    };
  }, []);

  // Check for unassigned hotkeys after FTUE is complete
  useEffect(() => {
    logger.log('Checking hotkeys. isFTUEComplete:', isFTUEComplete);
    if (!isFTUEComplete) return;

    const checkHotkeys = () => {
      overwolf.settings.hotkeys.get((result) => {
        logger.log('Hotkeys result:', result);
        if (result.success && result.games && result.games[kGameClassIds[0]]) {
          const gameHotkeys = result.games[kGameClassIds[0]];
          const unassigned = gameHotkeys
            .filter((hotkey: any) => {
                logger.log(`Hotkey ${hotkey.name} unassigned?`, hotkey.IsUnassigned);
                return hotkey.IsUnassigned;
            })
            .map((hotkey: any) => hotkey.title);

          logger.log('Unassigned hotkeys:', unassigned);

          if (unassigned.length > 0) {
            setUnassignedHotkeys(unassigned);
            setShowHotkeyWarning(true);
          }
        }
      });
    };

    checkHotkeys();
  }, [isFTUEComplete]);

  const allItems = useMemo(() => getItemsArray(), []);
  const allTrackableItems = useMemo(() => getTrackableItems(), []);

  const itemsToKeepCount = useMemo(() => {
    return allTrackableItems.filter(item => {
      const totalNeeded = getTotalCountNeeded(item);
      const owned = getOwnedCount(item.name);
      return owned < totalNeeded;
    }).length;
  }, [allTrackableItems, getOwnedCount]);

  const workshopCount = useMemo(() => {
    return allTrackableItems.filter(item => {
      if (!item.keepForWorkshop.shouldKeep) return false;
      const totalNeeded = getTotalCountNeeded(item);
      const owned = getOwnedCount(item.name);
      return owned < totalNeeded;
    }).length;
  }, [allTrackableItems, getOwnedCount]);

  const questsCount = useMemo(() => {
    return allTrackableItems.filter(item => {
      if (!item.keepForQuests.shouldKeep) return false;
      const totalNeeded = getTotalCountNeeded(item);
      const owned = getOwnedCount(item.name);
      return owned < totalNeeded;
    }).length;
  }, [allTrackableItems, getOwnedCount]);

  const projectsCount = useMemo(() => {
    return allTrackableItems.filter(item => {
      if (!item.keepForProjects.shouldKeep) return false;
      const totalNeeded = getTotalCountNeeded(item);
      const owned = getOwnedCount(item.name);
      return owned < totalNeeded;
    }).length;
  }, [allTrackableItems, getOwnedCount]);

  const eventsCount = useMemo(() => {
    return allTrackableItems.filter(item => {
      if (!shouldKeepForEvents(item)) return false;
      const totalNeeded = getTotalCountNeeded(item);
      const owned = getOwnedCount(item.name);
      return owned < totalNeeded;
    }).length;
  }, [allTrackableItems, getOwnedCount]);

  const filteredItems = useMemo(() => {
    let itemsToFilter: Item[] = [];
    
    // Determine which items to show based on main filter
    if (filter === 'all') {
      // Show ALL items from JSON
      itemsToFilter = allItems;
    } else if (filter === 'items-to-keep') {
      // Show only items that need to be kept
      itemsToFilter = allTrackableItems;
    } else if (filter === 'tracked') {
      // Show only tracked items
      itemsToFilter = allItems.filter(item => item.name in trackedItems);
    } else if (filter === 'completed') {
      // Show only completed items that need to be kept
      itemsToFilter = allTrackableItems.filter(item => {
        const totalNeeded = getTotalCountNeeded(item);
        if (totalNeeded === 0) return false; // Items with no requirements can't be "completed"
        const owned = getOwnedCount(item.name);
        return owned >= totalNeeded;
      });
    }

    // Map items with their original index to preserve order
    let itemsWithIndex = itemsToFilter.map((item, index) => ({ item, originalIndex: index }));

    // Apply sub-filter for "items-to-keep" category
    if (filter === 'items-to-keep' && keepSubFilter !== 'all') {
      itemsWithIndex = itemsWithIndex.filter(({ item }) => {
        if (keepSubFilter === 'workshop') return item.keepForWorkshop.shouldKeep;
        if (keepSubFilter === 'quests') return item.keepForQuests.shouldKeep;
        if (keepSubFilter === 'projects') return item.keepForProjects.shouldKeep;
        if (keepSubFilter === 'events') return shouldKeepForEvents(item);
        return true;
      });
    }

    // For "all" and "completed" filters, exclude completed items if they don't have keep requirements
    // (Completed items should only appear in All or Completed categories)
    if (filter === 'all') {
      // In "all", show everything including completed items
      // No filtering needed
    } else if (filter === 'tracked') {
      // For "tracked" filter, show all tracked items regardless of completion status
      // No filtering needed
    } else if (filter !== 'completed') {
      // For other filters (items-to-keep), exclude completed items
      itemsWithIndex = itemsWithIndex.filter(({ item }) => {
        const totalNeeded = getTotalCountNeeded(item);
        if (totalNeeded === 0) return true; // Items with no requirements are always shown
        const owned = getOwnedCount(item.name);
        return owned < totalNeeded; // Only show if not completed
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      itemsWithIndex = itemsWithIndex.filter(({ item }) => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const categoryMatch = item.category.toLowerCase().includes(query);
        const rarityMatch = item.rarity.toLowerCase().includes(query);
        return nameMatch || categoryMatch || rarityMatch;
      });
    }

    // Sort by original index to maintain position regardless of completion status
    itemsWithIndex.sort((a, b) => a.originalIndex - b.originalIndex);

    // Return just the items
    return itemsWithIndex.map(({ item }) => item);
  }, [allItems, allTrackableItems, filter, keepSubFilter, searchQuery, getOwnedCount, trackedItems]);

  // Apply dark theme to body
  useEffect(() => {
    document.body.classList.add('dark');
    return () => {
      document.body.classList.remove('dark');
    };
  }, []);

  // Get manifest information for displaying the app version
  useEffect(() => {
    try {
      overwolf.extensions.current.getManifest((manifest: overwolf.extensions.Manifest | undefined) => {
        const version = manifest?.meta?.version;
        if (version) {
          setAppVersion(version);
        } else {
          logger.warn('Manifest did not include a version value');
        }
      });
    } catch (error) {
      logger.error('Failed to load manifest version', error);
    }
  }, []);

  // Fetch release notes for the current version and show them only after FTUE is complete
  useEffect(() => {
    if (!appVersion) {
      return;
    }

    let isDisposed = false;

    const loadReleaseNotes = async () => {
      const entry = await releaseNotesService.getReleaseNoteForVersion(appVersion);
      if (isDisposed) {
        return;
      }

      if (!entry) {
        setReleaseNotesEntry(null);
        setReleaseNotesViewed(true);
        setIsReleaseNotesModalOpen(false);
        return;
      }

      const alreadyViewed = releaseNotesService.hasViewedReleaseNote(entry);
      setReleaseNotesEntry(entry);
      setReleaseNotesViewed(alreadyViewed);
      // For new users, defer showing release notes until FTUE is finished
      setIsReleaseNotesModalOpen(!alreadyViewed && isFTUEComplete);
    };

    loadReleaseNotes();

    return () => {
      isDisposed = true;
    };
  }, [appVersion, isFTUEComplete]);

  // Sync release notes viewed state across multiple windows
  useEffect(() => {
    if (!releaseNotesEntry) {
      return;
    }

    const syncViewedState = () => {
      const viewed = releaseNotesService.hasViewedReleaseNote(releaseNotesEntry);
      setReleaseNotesViewed(viewed);
      if (viewed) {
        setIsReleaseNotesModalOpen(false);
      }
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key && event.key !== RELEASE_NOTES_STORAGE_KEY) {
        return;
      }
      syncViewedState();
    };

    const handleCustomStorageChange = () => {
      syncViewedState();
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('localStorageChange', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
    };
  }, [releaseNotesEntry]);

  // Initialize AppWindow - detect which window we're running in
  useEffect(() => {
    const detectWindowName = async () => {
      return new Promise<string>((resolve) => {
        overwolf.windows.getCurrentWindow((result) => {
          if (result.success && result.window) {
            const windowName = result.window.name;
            // Check if it's desktop or in-game version
            if (windowName === kWindowNames.trackerDesktop || windowName === kWindowNames.trackerIngame) {
              resolve(windowName);
            } else {
              // Fallback to desktop if detection fails
              resolve(kWindowNames.trackerDesktop);
            }
          } else {
            // Fallback to desktop if detection fails
            resolve(kWindowNames.trackerDesktop);
          }
        });
      });
    };

    detectWindowName().then((windowName) => {
      logger.log('Detected tracker window', windowName);
      const appWindow = new AppWindow(windowName);
      // Set whether this is the in-game window
      setWindowName(windowName);
      setIsIngameWindow(windowName === kWindowNames.trackerIngame);
    });
  }, []);

  // Set up hotkey text
  useEffect(() => {
    const setToggleHotkeyText = async () => {
      try {
        const text = await OWHotkeys.getHotkeyText(kHotkeys.toggleTrackerIngameWindow, kGameClassIds[0]);
        setHotkeyText(text);
      } catch (error) {
        logger.error('Error getting hotkey text:', error);
      }
    };

    overwolf.settings.hotkeys.onChanged.addListener((event: overwolf.settings.hotkeys.OnChangedEvent) => {
      if (event.name === kHotkeys.toggleTrackerIngameWindow) {
        setHotkeyText(event.binding);
      }
    });
    setToggleHotkeyText();
  }, []);

  // Handle Ctrl+K to focus search bar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+K (or Cmd+K on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        // Only focus if search bar is visible (not in detail view)
        if (!selectedItem && searchInputRef.current) {
          event.preventDefault();
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItem]);

  // Track initial owned counts to detect user interaction
  const initialOwnedCountsRef = useRef<Map<string, number>>(new Map());
  const hasInitializedRef = useRef<boolean>(false);
  
  // Initialize tracked counts when the step becomes available
  useEffect(() => {
    if (shouldShowStep('trackme_quantity') && !hasInitializedRef.current) {
      allTrackableItems.forEach(item => {
        initialOwnedCountsRef.current.set(item.name, getOwnedCount(item.name));
      });
      hasInitializedRef.current = true;
    }
  }, [shouldShowStep, allTrackableItems, getOwnedCount]);

  // Mark quantity step complete when user actually interacts with quantity controls
  useEffect(() => {
    if (!shouldShowStep('trackme_quantity') || !hasInitializedRef.current) return;
    
    // Check if any item's count has changed from initial state (user interaction)
    const hasUserInteraction = allTrackableItems.some(item => {
      const initialCount = initialOwnedCountsRef.current.get(item.name) || 0;
      const currentCount = getOwnedCount(item.name);
      return currentCount !== initialCount;
    });
    
    if (hasUserInteraction) {
      markStepComplete('trackme_quantity');
    }
  }, [allTrackableItems, getOwnedCount, shouldShowStep, markStepComplete]);

  // Mark search step complete when user searches
  useEffect(() => {
    if (searchQuery.trim() && shouldShowStep('trackme_search')) {
      markStepComplete('trackme_search');
    }
  }, [searchQuery, shouldShowStep, markStepComplete]);

  // Mark filters step complete when user uses filters
  useEffect(() => {
    if (filter !== 'all' && shouldShowStep('trackme_filters')) {
      markStepComplete('trackme_filters');
    }
  }, [filter, shouldShowStep, markStepComplete]);

  // Reset sub-filter when switching away from items-to-keep
  useEffect(() => {
    if (filter !== 'items-to-keep') {
      setKeepSubFilter('all');
    }
  }, [filter]);

  // Mark station check step complete when user checks a station checkbox
  useEffect(() => {
    if (!shouldShowStep('trackme_station_check')) return;
    
    // Check if any checkbox has been checked
    const hasCheckedStations = Object.values(checkedDetails).some(checked => checked === true);
    if (hasCheckedStations) {
      markStepComplete('trackme_station_check');
    }
  }, [checkedDetails, shouldShowStep, markStepComplete]);

  // Mark track button step complete when user tracks an item
  useEffect(() => {
    if (Object.keys(trackedItems).length > 0 && shouldShowStep('trackme_track_button')) {
      markStepComplete('trackme_track_button');
    }
  }, [trackedItems, shouldShowStep, markStepComplete]);

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
  };

  const handleBack = () => {
    setSelectedItem(null);
  };

  // Save checkedDetails to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('recycleme_checked_details', JSON.stringify(checkedDetails));
      window.dispatchEvent(new Event('localStorageChange'));
    } catch (error) {
      logger.error('Error saving checked details:', error);
    }
  }, [checkedDetails]);

  // Save trackedItems to localStorage whenever it changes
  useEffect(() => {
    // Don't save if we're currently syncing from external changes
    if (isSyncingRef.current) {
      return;
    }
    
    const currentJson = JSON.stringify(trackedItems);
    // Only save if this change came from this window (not from sync)
    if (lastSyncedTrackedItemsRef.current !== currentJson) {
      try {
        localStorage.setItem('recycleme_tracked_items', currentJson);
        lastSyncedTrackedItemsRef.current = currentJson;
        // Dispatch event for in-game window
        window.dispatchEvent(new Event('localStorageChange'));
      } catch (error) {
        logger.error('Error saving tracked items:', error);
      }
    }
  }, [trackedItems]);

  const handleDetailCheck = (itemName: string, category: KeepCategoryKey, detailLabel: string, detailCount: number, checked: boolean) => {
    const key = `${itemName}-${category}-${detailLabel}`;
    setCheckedDetails(prev => ({
      ...prev,
      [key]: checked
    }));

    const currentOwned = getOwnedCount(itemName);
    const totalNeeded = getTotalCountNeeded(allTrackableItems.find(i => i.name === itemName)!);

    if (checked) {
      // Increment by detail count, but don't exceed total needed
      const newValue = Math.min(currentOwned + detailCount, totalNeeded);
      setOwnedCount(itemName, newValue);
    } else {
      // Decrement by detail count, but don't go below 0
      const newValue = Math.max(currentOwned - detailCount, 0);
      setOwnedCount(itemName, newValue);
    }
  };

  const getDetailChecked = (itemName: string, category: KeepCategoryKey, detailLabel: string): boolean => {
    const key = `${itemName}-${category}-${detailLabel}`;
    return checkedDetails[key] || false;
  };

  const handleTrackItem = (itemName: string, customAmount?: number) => {
    logger.log('Tracking item requested', { itemName, customAmount });
    setTrackedItems(prev => {
      const newItems = { ...prev };
      // Only set custom amount if provided, otherwise just mark as tracked (will use totalCount)
      if (customAmount !== undefined && customAmount > 0) {
        newItems[itemName] = customAmount;
      } else {
        // Track without custom amount - use 0 to indicate "tracked but use totalCount for counter"
        newItems[itemName] = 0; // 0 means "use totalCount"
      }
      
      logger.log('Tracked items updated', { totalTracked: Object.keys(newItems).length, trackedItem: itemName });
      
      return newItems;
    });
  };

  const handleUntrackItem = (itemName: string) => {
    logger.log('Untracking item requested', { itemName });
    setTrackedItems(prev => {
      const newItems = { ...prev };
      delete newItems[itemName];
      
      logger.log('Tracked items updated after removal', { remainingTracked: Object.keys(newItems).length, removedItem: itemName });
      
      return newItems;
    });
  };

  const handleUpdateTrackedAmount = (itemName: string, amount: number) => {
    logger.log('Updating tracked amount', { itemName, amount });
    if (amount < 0) {
      handleUntrackItem(itemName);
    } else {
      setTrackedItems(prev => ({ ...prev, [itemName]: amount }));
    }
  };

  const isItemTracked = (itemName: string): boolean => {
    return itemName in trackedItems;
  };

  const getTrackedAmount = (itemName: string): number => {
    return trackedItems[itemName] || 0;
  };

  const handleUndoCompletion = (itemName: string) => {
    logger.log('Undoing completion for item', { itemName });
    
    // Find the item to get its reasons
    const item = allTrackableItems.find(i => i.name === itemName);
    if (!item) {
      logger.error('Item not found for undo completion', { itemName });
      return;
    }
    
    const reasons = getKeepReasons(item);
    
    // Uncheck all checkboxes for this item
    setCheckedDetails(prev => {
      const newCheckedDetails = { ...prev };
      for (const reason of reasons) {
        const categoryKey = reason.categoryKey;
        for (const detail of reason.details) {
          const key = `${itemName}-${categoryKey}-${detail.label}`;
          delete newCheckedDetails[key];
        }
      }
      return newCheckedDetails;
    });

    // Clear any custom target for this item so all UIs use the default needed amount again
    // 1) Reset tracked custom amount (keep item tracked, but with default goal)
    setTrackedItems(prev => {
      const updated = { ...prev };
      if (itemName in updated) {
        updated[itemName] = 0; // 0 means "use totalCount" in counter logic
      }
      return updated;
    });

    // 2) Clear pending custom amount from localStorage
    try {
      const storedPending = localStorage.getItem('recycleme_pending_amounts');
      if (storedPending) {
        const pending = JSON.parse(storedPending) as Record<string, number>;
        if (pending[itemName] !== undefined) {
          delete pending[itemName];
          localStorage.setItem('recycleme_pending_amounts', JSON.stringify(pending));
          // Notify any listeners (other tracker windows)
          window.dispatchEvent(new Event('localStorageChange'));
        }
      }
    } catch (error) {
      logger.error('Error clearing pending amount on undo completion', { itemName, error });
    }
    
    // Reset owned count to 0
    setOwnedCount(itemName, 0);
    
    logger.log('Completion undone', { itemName });
  };

  const handleReleaseNotesOpen = useCallback(() => {
    if (releaseNotesEntry && isFTUEComplete) {
      setIsReleaseNotesModalOpen(true);
    }
  }, [releaseNotesEntry, isFTUEComplete]);

  const handleReleaseNotesClose = useCallback(() => {
    setIsReleaseNotesModalOpen(false);
    if (releaseNotesEntry && !releaseNotesService.hasViewedReleaseNote(releaseNotesEntry)) {
      releaseNotesService.markReleaseNotesViewed(releaseNotesEntry);
      setReleaseNotesViewed(true);
    }
  }, [releaseNotesEntry]);

  const handleSettingsClick = () => {
    setSettingsInitialTab('general');
    setShowSettings(true);
  };

  const handleSubmissionFormClick = () => {
    overwolf.utils.openUrlInDefaultBrowser('https://forms.gle/SJdNDZWE5cbNiXLL8');
  };

  const handleResetProgression = () => {
    logger.log('Resetting progression state');
    // Clear owned items - reset each item individually
    allTrackableItems.forEach(item => {
      resetOwned(item.name);
    });
    
    // Also clear localStorage directly to ensure it's cleared
    localStorage.removeItem('recycleme_owned_items');
    
    // Clear checked details
    setCheckedDetails({});
    localStorage.removeItem('recycleme_checked_details');
    
    // Dispatch events to notify other windows
    window.dispatchEvent(new Event('localStorageChange'));
    
    logger.log('Progression reset complete');
  };

  const handleResetGameTimeStats = () => {
    logger.log('Resetting game time stats');
    try {
      gameTimeService.resetGameTime();
      logger.log('Game time stats reset complete');
    } catch (error) {
      logger.error('Error resetting game time stats:', error);
    }
  };

  const handleAutoFillQuests = (selectedLabels: string[]) => {
    logger.log('Auto-filling quests:', selectedLabels);
    
    const newCheckedDetails = { ...checkedDetails };
    const itemsToUpdate = new Map<string, number>();

    allTrackableItems.forEach(item => {
      let addedCount = 0;

      // Check Workshop
      item.keepForWorkshop.details.forEach(detail => {
        if (selectedLabels.includes(detail.label)) {
          const key = `${item.name}-workshop-${detail.label}`;
          if (!newCheckedDetails[key]) {
            newCheckedDetails[key] = true;
            addedCount += detail.count;
          }
        }
      });

      // Check Quests
      item.keepForQuests.details.forEach(detail => {
        if (selectedLabels.includes(detail.label)) {
          const key = `${item.name}-quests-${detail.label}`;
          if (!newCheckedDetails[key]) {
            newCheckedDetails[key] = true;
            addedCount += detail.count;
          }
        }
      });

      // Check Projects
      item.keepForProjects.details.forEach(detail => {
        if (selectedLabels.includes(detail.label)) {
          const key = `${item.name}-projects-${detail.label}`;
          if (!newCheckedDetails[key]) {
            newCheckedDetails[key] = true;
            addedCount += detail.count;
          }
        }
      });

      // Check Events (only active ones)
      item.keepForEvents.forEach(event => {
        if (event.active === false) {
          return;
        }
        event.stages.forEach(stage => {
          const detailLabel = `Event · ${event.eventName} - ${stage.label}`;
          if (selectedLabels.includes(detailLabel)) {
            const key = `${item.name}-events-${detailLabel}`;
            if (!newCheckedDetails[key]) {
              newCheckedDetails[key] = true;
              addedCount += stage.count;
            }
          }
        });
      });

      if (addedCount > 0) {
        const currentOwned = getOwnedCount(item.name);
        const totalNeeded = getTotalCountNeeded(item);
        const newValue = Math.min(currentOwned + addedCount, totalNeeded);
        itemsToUpdate.set(item.name, newValue);
      }
    });

    setCheckedDetails(newCheckedDetails);
    itemsToUpdate.forEach((count, itemName) => {
      setOwnedCount(itemName, count);
    });
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(viewModeStorageKey, mode);
    } catch (error) {
      logger.error('Error saving view mode:', error);
    }
  };

  const headerActionButtons: Array<{ icon: string; title: string; onClick: () => void }> = [
    ...(releaseNotesEntry && isFTUEComplete
      ? [
          {
            icon: releaseNotesViewed ? '📰' : '✨',
            title: releaseNotesViewed ? 'View Release Notes' : 'New Release Notes Available',
            onClick: handleReleaseNotesOpen
          }
        ]
      : []),
    {
      icon: '📝',
      title: 'Submit Feedback',
      onClick: handleSubmissionFormClick
    },
    {
      icon: '⚙️',
      title: 'Settings',
      onClick: handleSettingsClick
    }
  ];

  return (
    <>
      <FTUEWelcomeModal />
      <FTUEAutoCompleteQuestsModal 
        onAutoFill={handleAutoFillQuests} 
        isOpen={isMassCompleteOpen ? true : undefined}
        onClose={() => setIsMassCompleteOpen(false)}
        startAtSelection={isMassCompleteOpen}
      />
      <AppHeader 
        title={isIngameWindow ? 'ArcTerminal • In-Game' : 'ArcTerminal • Desktop'}
        appVersion={appVersion ?? undefined}
        hotkeyText={hotkeyText} 
        itemCount={Object.keys(trackedItems).length} 
        showHotkey={isIngameWindow}
        actionButtons={headerActionButtons}
      />

      <main className="tracker-main">
        {viewMode === 'widgets' ? (
          <div className="tracker-main-content-wrapper">
            <div className="widgets-view-container">
              {showSettings ? (
                <div className="settings-wrapper">
                <Settings 
                  initialTab={settingsInitialTab}
                  onResetProgression={handleResetProgression}
                  onResetGameTimeStats={handleResetGameTimeStats}
                  onClose={() => setShowSettings(false)}
                />
                </div>
              ) : (
                <>
                  <div className="view-mode-tabs">
                    <button
                      onClick={() => handleViewModeChange('items')}
                      className="view-mode-tab"
                    >
                      📦 Items
                    </button>
                    <button
                      onClick={() => handleViewModeChange('widgets')}
                      className="view-mode-tab widgets-tab-button active"
                    >
                      📊 Widgets
                    </button>
                  </div>
                  <FTUETooltip
                    step="widgets_intro"
                    title="Meet the Widgets View"
                    message="Open Widgets to see live timers, recent scans, and your session stats at a glance."
                    position="bottom"
                    targetSelector=".widgets-tab-button"
                    onDismiss={() => handleViewModeChange('widgets')}
                  />
                  <WidgetContainer />
                </>
              )}
              <ReleaseNotesModal 
                isOpen={isReleaseNotesModalOpen}
                note={releaseNotesEntry}
                onClose={handleReleaseNotesClose}
                scope="content"
              />
            </div>
            <div className="tracker-ad-sidebar">
              <AdContainer width={400} height={60} className="tracker-ad-container-small" />
              <AdContainer width={400} height={600} className="tracker-ad-container" />
            </div>
          </div>
        ) : (
          <div className="tracker-main-content-wrapper">
            <div className="tracker-main-content">
              {showSettings ? (
              <div className="settings-wrapper">
                <Settings 
                  initialTab={settingsInitialTab}
                  onResetProgression={handleResetProgression}
                  onResetGameTimeStats={handleResetGameTimeStats}
                  onClose={() => setShowSettings(false)}
                />
              </div>
            ) : (
              <>
                <div className="tracker-controls-section">
                <div className="view-mode-tabs">
                  <button
                    onClick={() => handleViewModeChange('items')}
                    className="view-mode-tab active"
                  >
                    📦 Items
                  </button>
                  <button
                    onClick={() => handleViewModeChange('widgets')}
                    className="view-mode-tab widgets-tab-button"
                  >
                    📊 Widgets
                  </button>
                </div>
                <FTUETooltip
                  step="widgets_intro"
                  title="Try the Widgets Dashboard"
                  message="Switch to Widgets for a dashboard of live timers, scans, and playtime stats."
                  position="bottom"
                  targetSelector=".widgets-tab-button"
                  onDismiss={() => handleViewModeChange('widgets')}
                />
                <div className="ftue-search-wrapper">
                  <SearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    inputRef={searchInputRef}
                  />
                  <FTUETooltip
                    step="trackme_search"
                    title="Search Items"
                    message="Use the search bar to quickly find items by name, category, or rarity."
                    position="bottom"
                    targetSelector=".tracker-search-bar"
                  />
                </div>
                <div className="tracker-filter-tabs">
                  <button
                    onClick={() => setFilter('all')}
                    className={`tracker-filter-tab ${filter === 'all' ? 'active' : ''}`}
                  >
                    All ({allItems.length})
                  </button>
                  <button
                    onClick={() => setFilter('items-to-keep')}
                    className={`tracker-filter-tab ${filter === 'items-to-keep' ? 'active' : ''}`}
                  >
                    Items to Keep ({itemsToKeepCount})
                  </button>
                  <button
                    onClick={() => setFilter('tracked')}
                    className={`tracker-filter-tab ${filter === 'tracked' ? 'active' : ''}`}
                  >
                    Tracked ({Object.keys(trackedItems).length})
                  </button>
                  <button
                    onClick={() => setFilter('completed')}
                    className={`tracker-filter-tab ${filter === 'completed' ? 'active' : ''}`}
                  >
                    Completed ({allTrackableItems.filter(item => {
                      const totalNeeded = getTotalCountNeeded(item);
                      if (totalNeeded === 0) return false;
                      const owned = getOwnedCount(item.name);
                      return owned >= totalNeeded;
                    }).length})
                  </button>
                  <button
                    onClick={() => setIsMassCompleteOpen(true)}
                    className="tracker-filter-tab"
                    title="Open the Select Completed Items modal"
                  >
                    Mass Complete
                  </button>
                </div>
                {filter === 'items-to-keep' && (
                  <div className="tracker-sub-filter-tabs">
                    <button
                      onClick={() => setKeepSubFilter('all')}
                      className={`tracker-sub-filter-tab ${keepSubFilter === 'all' ? 'active' : ''}`}
                    >
                      All ({itemsToKeepCount})
                    </button>
                    <button
                      onClick={() => setKeepSubFilter('workshop')}
                      className={`tracker-sub-filter-tab ${keepSubFilter === 'workshop' ? 'active' : ''}`}
                    >
                      Workshop ({workshopCount})
                    </button>
                    <button
                      onClick={() => setKeepSubFilter('quests')}
                      className={`tracker-sub-filter-tab ${keepSubFilter === 'quests' ? 'active' : ''}`}
                    >
                      Quests ({questsCount})
                    </button>
                    <button
                      onClick={() => setKeepSubFilter('projects')}
                      className={`tracker-sub-filter-tab ${keepSubFilter === 'projects' ? 'active' : ''}`}
                    >
                      Projects ({projectsCount})
                    </button>
                    <button
                      onClick={() => setKeepSubFilter('events')}
                      className={`tracker-sub-filter-tab ${keepSubFilter === 'events' ? 'active' : ''}`}
                    >
                      Events ({eventsCount})
                    </button>
                  </div>
                )}
                <FTUETooltip
                  step="trackme_filters"
                  title="Filter Items"
                  message="Use the tabs above to filter items by Items you should keep, personal tracking, or completed items."
                  position="bottom"
                  targetSelector=".tracker-filter-tabs"
                />
                {/* <div className="tracker-items-count">
                  Showing {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
                </div> */}
              </div>
              <div className="tracker-content-section">
                <TrackedItemList
                  items={filteredItems}
                  getOwnedCount={getOwnedCount}
                  getTotalCountNeeded={getTotalCountNeeded}
                  onIncrement={(itemName, maxValue) => incrementOwned(itemName, maxValue)}
                  onDecrement={decrementOwned}
                  onItemSelect={handleItemSelect}
                  onDetailCheck={handleDetailCheck}
                  getDetailChecked={getDetailChecked}
                  onTrackItem={(itemName, customAmount) => handleTrackItem(itemName, customAmount)}
                  onUntrackItem={handleUntrackItem}
                  onUpdateTrackedAmount={handleUpdateTrackedAmount}
                  isItemTracked={isItemTracked}
                  getTrackedAmount={getTrackedAmount}
                  onReset={resetOwned}
                  onSetCount={setOwnedCount}
                  onUndoCompletion={handleUndoCompletion}
                />
                {filteredItems.length > 0 && (
                  <>
                    <FTUETooltip
                      step="trackme_quantity"
                      title="Track Your Items"
                      message="Use the + and - buttons to track how many items you own. The app will tell you when you have enough."
                      position="right"
                      targetSelector=".tracker-quantity-controls"
                    />
                    {filteredItems.some(item => 
                      item.keepForWorkshop.details.length > 0 || 
                      item.keepForQuests.details.length > 0 || 
                      item.keepForProjects.details.length > 0 ||
                      item.keepForEvents.some(event => event.active !== false && event.stages.length > 0)
                    ) && (
                      <FTUETooltip
                        step="trackme_station_check"
                        title="Mark Stations Complete"
                        message="Check the boxes next to stations when you've completed them. This helps track your progress and automatically updates item counts."
                        position="right"
                        targetSelector=".tracker-detail-label"
                      />
                    )}
                    <FTUETooltip
                      step="trackme_track_button"
                      title="Track Items"
                      message="Click the '👁️' button on any item to add it to your personal tracking list. Tracked items will appear in the 'Tracked' category and in the in-game tracker window."
                      position="right"
                      targetSelector=".tracker-track-button"
                    />
                    {filteredItems.some(item => getTotalCountNeeded(item) === 0) && (
                      <FTUETooltip
                        step="trackme_custom_amount"
                        title="Set Custom Goals"
                        message="Use the + Add Custom Amount button to set your own goal for items without required counts."
                        position="right"
                        targetSelector=".tracker-add-custom-amount-button"
                      />
                    )}
                  </>
                )}
              </div>
            </>
          )}
              <ReleaseNotesModal 
                isOpen={isReleaseNotesModalOpen}
                note={releaseNotesEntry}
                onClose={handleReleaseNotesClose}
                scope="content"
              />
            </div>
            <div className="tracker-ad-sidebar">
              <AdContainer width={400} height={60} className="tracker-ad-container-small" />
              <AdContainer width={400} height={600} className="tracker-ad-container" />
            </div>
          </div>
        )}
      </main>
      
      {showHotkeyWarning && (
        <UnassignedHotkeyModal 
          unassignedHotkeys={unassignedHotkeys}
          onOpenSettings={() => {
            setShowHotkeyWarning(false);
            setSettingsInitialTab('hotkeys');
            setShowSettings(true);
          }}
          onDismiss={() => setShowHotkeyWarning(false)}
        />
      )}
    </>
  );
};

const mountTracker = () => {
  const container = document.getElementById('root');
  if (!container) {
    logger.error('Tracker root element not found');
    return;
  }

  const root = createRoot(container);
  root.render(
    <FTUEProvider>
      <Tracker />
    </FTUEProvider>
  );
};

const bootstrap = async () => {
  try {
    await itemsDataService.init();
  } catch (error) {
    logger.error('Failed to initialize items data service before mounting tracker', error);
  }

  mountTracker();
};

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap tracker window', error);
});
