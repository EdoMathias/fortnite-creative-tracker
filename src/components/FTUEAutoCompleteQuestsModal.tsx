import React, { useState, useMemo, useEffect } from 'react';
import { useFTUE } from '../contexts/FTUEContext';
import { Button } from './Button';
import { getTrackableItems } from '../tracker/utils';

const STORAGE_KEY = 'recycleme_autocomplete_selected_labels';

interface FTUEAutoCompleteQuestsModalProps {
  onAutoFill: (selectedLabels: string[]) => void;
  /**
   * Optional external control to show the modal even after FTUE is finished.
   */
  isOpen?: boolean;
  /**
   * Optional callback when the modal flow finishes (confirm or dismiss).
   */
  onClose?: () => void;
  /**
   * Start directly on the selection step instead of the intro.
   */
  startAtSelection?: boolean;
}

interface StationUpgrade {
  stationName: string;
  levels: {
    label: string;
    level: number;
    roman: string;
  }[];
}

export const FTUEAutoCompleteQuestsModal: React.FC<FTUEAutoCompleteQuestsModalProps> = ({ 
  onAutoFill,
  isOpen,
  onClose,
  startAtSelection = false
}) => {
  const { shouldShowStep, markStepComplete } = useFTUE();
  const [step, setStep] = useState<'initial' | 'selection'>('initial');
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set<string>());

  const shouldShowFtueStep = shouldShowStep('auto_complete_quests');
  const isVisible = isOpen ?? shouldShowFtueStep;

  const loadSavedSelection = (): Set<string> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return new Set<string>(parsed);
        }
      }
    } catch {
      // Ignore errors
    }
    return new Set<string>();
  };

  const persistSelection = (labels: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(labels)));
    } catch {
      // Ignore errors
    }
  };

  const clearSavedSelection = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  };

  useEffect(() => {
    if (isVisible) {
      setStep(startAtSelection ? 'selection' : 'initial');
      setSelectedLabels(loadSavedSelection());
    }
  }, [isVisible, startAtSelection]);

  useEffect(() => {
    persistSelection(selectedLabels);
  }, [selectedLabels]);

  const { workshopStations, projectGroups, otherCategories } = useMemo(() => {
    const items = getTrackableItems();
    const workshopLabels = new Set<string>();
    const quests = new Set<string>();
    const projectLabels = new Set<string>();

    items.forEach(item => {
      item.keepForWorkshop.details.forEach(d => workshopLabels.add(d.label));
      item.keepForQuests.details.forEach(d => quests.add(d.label));
      item.keepForProjects.details.forEach(d => projectLabels.add(d.label));
    });

    // Helper to process grouped items
    const processGroupedItems = (labels: Set<string>) => {
      const groupsMap = new Map<string, StationUpgrade>();
      
      Array.from(labels).forEach(label => {
        // Regex to match "Name I", "Name II", etc.
        const match = label.match(/^(.*?)\s+([IVX]+|\d+)$/);
        
        if (match) {
          const name = match[1];
          const roman = match[2];
          let level = 0;
          
          if (roman === 'I') level = 1;
          else if (roman === 'II') level = 2;
          else if (roman === 'III') level = 3;
          else if (roman === 'IV') level = 4;
          else if (roman === 'V') level = 5;
          else if (!isNaN(parseInt(roman))) level = parseInt(roman);

          if (!groupsMap.has(name)) {
            groupsMap.set(name, { stationName: name, levels: [] });
          }
          
          groupsMap.get(name)?.levels.push({ label, level, roman });
        } else {
          // Fallback for items that don't match the pattern
          if (!groupsMap.has(label)) {
             groupsMap.set(label, { 
               stationName: label, 
               levels: [{ label, level: 1, roman: '' }] 
             });
          }
        }
      });

      // Sort levels
      groupsMap.forEach(group => {
        group.levels.sort((a, b) => a.level - b.level);
      });

      return Array.from(groupsMap.values()).sort((a, b) => a.stationName.localeCompare(b.stationName));
    };

    return {
      workshopStations: processGroupedItems(workshopLabels),
      projectGroups: processGroupedItems(projectLabels),
      otherCategories: {
        quests: Array.from(quests).sort()
      }
    };
  }, []);

  if (!isVisible) return null;

  const handleNewPlayer = () => {
    markStepComplete('auto_complete_quests');
    setSelectedLabels(new Set<string>());
    clearSavedSelection();
    onClose?.();
  };

  const handleHaveProgress = () => {
    setSelectedLabels(loadSavedSelection());
    setStep('selection');
  };

  const toggleLabel = (label: string) => {
    setSelectedLabels(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const handleStationLevelSelect = (station: StationUpgrade, selectedLevel: number) => {
    setSelectedLabels(prev => {
      const next = new Set(prev);

      const selectedLevels = station.levels
        .filter(level => next.has(level.label))
        .map(level => level.level);

      const currentHighestLevel = selectedLevels.length > 0 ? Math.max(...selectedLevels) : 0;
      const isCurrentSelection = currentHighestLevel === selectedLevel &&
        station.levels
          .filter(level => level.level <= selectedLevel)
          .every(level => next.has(level.label));

      if (isCurrentSelection) {
        station.levels.forEach(level => next.delete(level.label));
        return next;
      }

      station.levels.forEach(level => next.delete(level.label));
      station.levels.forEach(level => {
        if (level.level <= selectedLevel) {
          next.add(level.label);
        }
      });

      return next;
    });
  };
  
  const isStationLevelSelected = (label: string) => selectedLabels.has(label);

  const handleConfirm = () => {
    onAutoFill(Array.from(selectedLabels));
    markStepComplete('auto_complete_quests');
    onClose?.();
  };

  if (step === 'initial') {
    return (
      <div className="ftue-overlay">
        <div className="ftue-welcome-modal">
          <div className="ftue-welcome-header">
            <h2>Existing Progress?</h2>
            <p className="ftue-welcome-subtitle">
              Have you already completed some quests or upgrades in Arc Raiders?
            </p>
          </div>

          <div className="ftue-welcome-content">
            <p className="ftue-text-center">
              We can help you set up your tracker by automatically marking completed items.
            </p>
            <p className="ftue-welcome-subtitle" style={{textAlign: 'center'}}>
              You can always access this modal from the settings menu.
            </p>
          </div>

          <div className="ftue-welcome-footer ftue-buttons-column">
            <Button onClick={handleNewPlayer} variant="secondary" size="large">
              I'm a new player
            </Button>
            <Button onClick={handleHaveProgress} variant="primary" size="large">
              I have progress
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ftue-overlay">
      <div className="ftue-welcome-modal ftue-quests-modal">
        <div className="ftue-welcome-header">
          <h2>Select Completed Items</h2>
          <p className="ftue-welcome-subtitle">
            Check the boxes for everything you have already completed.
          </p>
        </div>

        <div className="ftue-quests-content">
          {workshopStations.length > 0 && (
            <div className="ftue-quest-category">
              <h3>Workshop Upgrades</h3>
              <div className="ftue-stations-list">
                {workshopStations.map(station => (
                  <div key={station.stationName} className="ftue-station-row">
                    <span className="ftue-station-name">{station.stationName}</span>
                    <div className="ftue-station-levels">
                      {station.levels.map(level => (
                        <button
                          key={level.label}
                          className={`ftue-level-btn ${isStationLevelSelected(level.label) ? 'selected' : ''}`}
                          onClick={() => handleStationLevelSelect(station, level.level)}
                          title={level.label}
                        >
                          {level.roman || level.level}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {otherCategories.quests.length > 0 && (
            <div className="ftue-quest-category">
              <h3>Quests</h3>
              <div className="ftue-quest-grid">
                {otherCategories.quests.map(label => (
                  <label key={label} className="ftue-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedLabels.has(label)}
                      onChange={() => toggleLabel(label)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {projectGroups.length > 0 && (
            <div className="ftue-quest-category">
              <h3>Projects</h3>
              <div className="ftue-stations-list">
                {projectGroups.map(project => (
                  <div key={project.stationName} className="ftue-station-row">
                    <span className="ftue-station-name">{project.stationName}</span>
                    <div className="ftue-station-levels">
                      {project.levels.map(level => (
                        <button
                          key={level.label}
                          className={`ftue-level-btn ${isStationLevelSelected(level.label) ? 'selected' : ''}`}
                          onClick={() => handleStationLevelSelect(project, level.level)}
                          title={level.label}
                        >
                          {level.roman || level.level}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ftue-welcome-footer">
          <Button onClick={handleConfirm} variant="primary" size="large">
            Confirm & Continue
          </Button>
        </div>
      </div>
    </div>
  );
};
