import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { OWHotkeys } from '@overwolf/overwolf-api-ts';
import { kHotkeys, kGameClassIds } from '../../shared/consts';
import {
  AppHeader,
  FTUEWelcomeModal,
  UnassignedHotkeyModal,
  ReleaseNotesModal,
  LaunchingOverlay,
} from '../components';
import { FTUEProvider, useFTUE } from '../contexts/FTUEContext';
import { LaunchingProvider } from '../contexts/LaunchingContext';
import { AdContainer, Settings } from './components';
import {
  MessageChannel,
  MessageType,
} from '../../main/services/MessageChannel';
import { createLogger } from '../../shared/services/Logger';
import {
  releaseNotesService,
  ReleaseNoteEntry,
  RELEASE_NOTES_STORAGE_KEY,
} from '../services/ReleaseNotesService';
import { WidgetContainer } from '../widgets';
import { gameTimeService } from '../../shared/services/GameTimeService';
import '../styles/index.css';
import { useAppVersion } from '../hooks/useAppVersion';
import { useWindowInfo } from '../hooks/useWindowInfo';
import Overview from './views/Overview/Overview';
import { useMapsData } from '../hooks/useMapsData';
import TopMapsPage from './views/TopMaps/TopMaps';
import useViewMode from '../hooks/useViewMode';
import Dashboards from './views/Dashboard/Dashboards';
import Library from './views/Library';

const logger = createLogger('Tracker');

const trackerMessageChannel = new MessageChannel();

const Tracker: React.FC = () => {
  const { isIngameWindow } = useWindowInfo();
  const [hotkeyText, setHotkeyText] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    'general' | 'hotkeys' | 'data' | 'about'
  >('general');
  const [releaseNotesEntry, setReleaseNotesEntry] =
    useState<ReleaseNoteEntry | null>(null);
  const [isReleaseNotesModalOpen, setIsReleaseNotesModalOpen] =
    useState<boolean>(false);
  const [releaseNotesViewed, setReleaseNotesViewed] = useState<boolean>(false);
  const { isFTUEComplete } = useFTUE();
  const [showHotkeyWarning, setShowHotkeyWarning] = useState<boolean>(false);
  const [unassignedHotkeys, setUnassignedHotkeys] = useState<string[]>([]);

  const mapsData = useMapsData();
  const { viewMode, handleViewModeChange, VIEW_MODE_TABS } = useViewMode();

  // Listen for game time updates from background
  useEffect(() => {
    const unregisterGameTime = trackerMessageChannel.onMessage(
      MessageType.GAME_TIME_UPDATED,
      (payload) => {
        logger.debug('Received GAME_TIME_UPDATED message:', payload);
        // Reload GameTimeService data from localStorage to get latest session info
        gameTimeService.reloadData();
        // Trigger custom event to update widgets
        window.dispatchEvent(new Event('gameTimeChanged'));
      }
    );

    logger.debug('Registered message handler for GAME_TIME_UPDATED');

    return () => {
      unregisterGameTime();
    };
  }, []);

  // Listen for map updates from background
  useEffect(() => {
    const unregisterMapUpdate = trackerMessageChannel.onMessage(
      MessageType.MAP_UPDATED,
      (payload) => {
        logger.log('Received MAP_UPDATED message:', payload);

        mapsData.handleMapUpdate(payload.data);
      }
    );

    return () => {
      unregisterMapUpdate();
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
              logger.log(
                `Hotkey ${hotkey.name} unassigned?`,
                hotkey.IsUnassigned
              );
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

  // Apply dark theme to body
  useEffect(() => {
    document.body.classList.add('dark');
    return () => {
      document.body.classList.remove('dark');
    };
  }, []);

  const appVersion = useAppVersion() ?? 'Unknown';

  // Fetch release notes for the current version and show them only after FTUE is complete
  useEffect(() => {
    let isDisposed = false;

    const loadReleaseNotes = async () => {
      const entry = await releaseNotesService.getReleaseNoteForVersion(
        appVersion
      );
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
      const viewed =
        releaseNotesService.hasViewedReleaseNote(releaseNotesEntry);
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
      window.removeEventListener(
        'localStorageChange',
        handleCustomStorageChange
      );
    };
  }, [releaseNotesEntry]);

  // Set up hotkey text
  useEffect(() => {
    const setToggleHotkeyText = async () => {
      try {
        const text = await OWHotkeys.getHotkeyText(
          kHotkeys.toggleTrackerIngameWindow,
          kGameClassIds[0]
        );
        setHotkeyText(text);
      } catch (error) {
        logger.error('Error getting hotkey text:', error);
      }
    };

    overwolf.settings.hotkeys.onChanged.addListener(
      (event: overwolf.settings.hotkeys.OnChangedEvent) => {
        if (event.name === kHotkeys.toggleTrackerIngameWindow) {
          setHotkeyText(event.binding);
        }
      }
    );
    setToggleHotkeyText();
  }, []);

  const handleReleaseNotesOpen = useCallback(() => {
    if (releaseNotesEntry && isFTUEComplete) {
      setIsReleaseNotesModalOpen(true);
    }
  }, [releaseNotesEntry, isFTUEComplete]);

  const handleReleaseNotesClose = useCallback(() => {
    setIsReleaseNotesModalOpen(false);
    if (
      releaseNotesEntry &&
      !releaseNotesService.hasViewedReleaseNote(releaseNotesEntry)
    ) {
      releaseNotesService.markReleaseNotesViewed(releaseNotesEntry);
      setReleaseNotesViewed(true);
    }
  }, [releaseNotesEntry]);

  const handleSettingsClick = () => {
    setSettingsInitialTab('general');
    setShowSettings(true);
  };

  const handleSubmissionFormClick = () => {
    overwolf.utils.openUrlInDefaultBrowser(
      'https://forms.gle/SJdNDZWE5cbNiXLL8'
    );
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

  const headerActionButtons: Array<{
    icon: string;
    title: string;
    onClick: () => void;
  }> = [
    ...(releaseNotesEntry && isFTUEComplete
      ? [
          {
            icon: releaseNotesViewed ? '📰' : '✨',
            title: releaseNotesViewed
              ? 'View Release Notes'
              : 'New Release Notes Available',
            onClick: handleReleaseNotesOpen,
          },
        ]
      : []),
    {
      icon: '📝',
      title: 'Submit Feedback',
      onClick: handleSubmissionFormClick,
    },
    {
      icon: '⚙️',
      title: 'Settings',
      onClick: handleSettingsClick,
    },
  ];

  return (
    <>
      <FTUEWelcomeModal />
      <AppHeader
        title={
          isIngameWindow
            ? 'Fortnite Map Tracker • In-Game'
            : 'Fortnite Map Tracker • Desktop'
        }
        appVersion={appVersion ?? undefined}
        hotkeyText={hotkeyText}
        showHotkey={isIngameWindow}
        actionButtons={headerActionButtons}
      />

      <main className="tracker-main">
        <div className="tracker-main-content-wrapper">
          <div className="tracker-main-content">
            <LaunchingOverlay />
            {showSettings ? (
              <div className="settings-wrapper">
                <Settings
                  initialTab={settingsInitialTab}
                  onResetGameTimeStats={handleResetGameTimeStats}
                  onClose={() => setShowSettings(false)}
                />
              </div>
            ) : (
              <>
                <div className="view-mode-tabs">
                  {VIEW_MODE_TABS &&
                    VIEW_MODE_TABS.map((tab) => (
                      <button
                        key={tab.mode}
                        onClick={() => handleViewModeChange(tab.mode)}
                        className={`view-mode-tab ${
                          viewMode === tab.mode ? 'active' : ''
                        }`}
                      >
                        {tab.icon} {tab.label}
                      </button>
                    ))}
                </div>

                <div className="view-content">
                  {viewMode === 'overview' && <Overview />}

                  {viewMode === 'top-maps' && (
                    <TopMapsPage messageChannel={trackerMessageChannel} />
                  )}

                  {viewMode === 'dashboards' && <Dashboards />}

                  {viewMode === 'library' && <Library />}

                  {viewMode === 'widgets' && <WidgetContainer />}
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
            <AdContainer
              width={400}
              height={60}
              className="tracker-ad-container-small"
            />
            <AdContainer
              width={400}
              height={600}
              className="tracker-ad-container"
            />
          </div>
        </div>
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
      <LaunchingProvider>
        <Tracker />
      </LaunchingProvider>
    </FTUEProvider>
  );
};

const bootstrap = async () => {
  mountTracker();
};

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap tracker window', error);
});
