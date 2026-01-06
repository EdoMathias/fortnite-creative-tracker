import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

export type FTUEStep = 
  | 'welcome'
  | 'auto_complete_quests'
  | 'trackme_search'
  | 'trackme_quantity'
  | 'trackme_filters'
  | 'trackme_station_check'
  | 'trackme_track_button'
  | 'trackme_custom_amount'
  | 'trackme_settings'
  | 'widgets_intro';

export type FTUEScreen = 'trackme';

interface FTUEContextType {
  isFTUEComplete: boolean;
  isTrackMeComplete: boolean;
  completedSteps: Set<FTUEStep>;
  markStepComplete: (step: FTUEStep) => void;
  resetFTUE: () => void;
  resetStep: (step: FTUEStep) => void;
  shouldShowStep: (step: FTUEStep) => boolean;
  isScreenComplete: (screen: FTUEScreen) => boolean;
}

const FTUEContext = createContext<FTUEContextType | undefined>(undefined);

const STORAGE_KEY = 'recycleme_ftue_completed';
const STEPS_STORAGE_KEY = 'recycleme_ftue_steps';
const TRACKME_COMPLETE_KEY = 'recycleme_ftue_trackme_complete';

export const FTUEProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isFTUEComplete, setIsFTUEComplete] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isTrackMeComplete, setIsTrackMeComplete] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TRACKME_COMPLETE_KEY) === 'true';
    } catch {
      return false;
    }
  });


  const [completedSteps, setCompletedSteps] = useState<Set<FTUEStep>>(() => {
    try {
      const stored = localStorage.getItem(STEPS_STORAGE_KEY);
      if (stored) {
        const steps = JSON.parse(stored) as FTUEStep[];
        return new Set(steps);
      }
    } catch {
      // Ignore errors
    }
    return new Set<FTUEStep>();
  });

  const markStepComplete = (step: FTUEStep) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(step);
      
      try {
        localStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify(Array.from(newSet)));
      } catch {
        // Ignore errors
      }
      
      return newSet;
    });
  };

  // One-time migration to re-open FTUE for the new widgets step for existing users
  const hasRunWidgetsMigration = useRef<boolean>(false);
  useEffect(() => {
    if (hasRunWidgetsMigration.current) return;
    hasRunWidgetsMigration.current = true;

    const widgetsStepMissing = !completedSteps.has('widgets_intro');

    // If older users had FTUE marked complete but never saw widgets_intro, reopen FTUE
    if (widgetsStepMissing && (isTrackMeComplete || isFTUEComplete)) {
      setIsTrackMeComplete(false);
      setIsFTUEComplete(false);
      try {
        localStorage.removeItem(TRACKME_COMPLETE_KEY);
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
  }, [completedSteps, isTrackMeComplete, isFTUEComplete]);

  const resetFTUE = () => {
    setIsFTUEComplete(false);
    setIsTrackMeComplete(false);
    setCompletedSteps(new Set());
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STEPS_STORAGE_KEY);
      localStorage.removeItem(TRACKME_COMPLETE_KEY);
    } catch {
      // Ignore errors
    }
  };

  const resetStep = (step: FTUEStep) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.delete(step);
      
      try {
        localStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify(Array.from(newSet)));
      } catch {
        // Ignore errors
      }
      
      return newSet;
    });

    // If we're resetting a TrackMe step, we might need to un-complete TrackMe
    const trackMeSteps: FTUEStep[] = [
      'welcome',
      'auto_complete_quests',
      'trackme_search',
      'trackme_filters',
      'trackme_quantity',
      'trackme_station_check',
      'trackme_track_button',
      'trackme_custom_amount',
      'widgets_intro'
    ];

    if (trackMeSteps.includes(step)) {
      setIsTrackMeComplete(false);
      setIsFTUEComplete(false);
      try {
        localStorage.removeItem(TRACKME_COMPLETE_KEY);
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore errors
      }
    }
  };

  const completeFTUE = () => {
    setIsFTUEComplete(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignore errors
    }
  };

  // Get the next step that should be shown in sequence
  const getNextStep = (): FTUEStep | null => {
    if (isFTUEComplete) return null;
    
    // Define the order of steps
    const trackMeSteps: FTUEStep[] = [
      'welcome',
      'auto_complete_quests',
      'trackme_search',
      'trackme_filters',
      'trackme_quantity',
      'trackme_station_check',
      'trackme_track_button',
      'trackme_custom_amount',
      'widgets_intro'
    ];
    
    // Check TrackMe steps
    if (!isTrackMeComplete) {
      for (const step of trackMeSteps) {
        if (!completedSteps.has(step)) {
          return step;
        }
      }
    }
    
    return null;
  };

  const shouldShowStep = (step: FTUEStep): boolean => {
    if (isFTUEComplete) return false;
    
    // Check if step is already completed
    if (completedSteps.has(step)) return false;
    
    // Only show the next step in sequence
    const nextStep = getNextStep();
    return nextStep === step;
  };

  const isScreenComplete = (screen: FTUEScreen): boolean => {
    if (screen === 'trackme') {
      return isTrackMeComplete;
    }
    return false;
  };

  // Auto-complete TrackMe FTUE when all TrackMe steps are done
  useEffect(() => {
    const trackMeSteps: FTUEStep[] = [
      'welcome',
      'auto_complete_quests',
      'trackme_search',
      'trackme_filters',
      'trackme_quantity',
      'trackme_station_check',
      'trackme_track_button',
      'trackme_custom_amount',
      'widgets_intro'
    ];
    
    const allTrackMeComplete = trackMeSteps.every(step => completedSteps.has(step));
    if (allTrackMeComplete && !isTrackMeComplete) {
      setIsTrackMeComplete(true);
      try {
        localStorage.setItem(TRACKME_COMPLETE_KEY, 'true');
      } catch {
        // Ignore errors
      }
    }
  }, [completedSteps, isTrackMeComplete]);

  // Auto-complete overall FTUE when TrackMe is complete
  useEffect(() => {
    if (isTrackMeComplete && !isFTUEComplete) {
      completeFTUE();
    }
  }, [isTrackMeComplete, isFTUEComplete]);

  return (
    <FTUEContext.Provider
      value={{
        isFTUEComplete,
        isTrackMeComplete,
        completedSteps,
        markStepComplete,
        resetFTUE,
        resetStep,
        shouldShowStep,
        isScreenComplete
      }}
    >
      {children}
    </FTUEContext.Provider>
  );
};

export const useFTUE = (): FTUEContextType => {
  const context = useContext(FTUEContext);
  if (!context) {
    throw new Error('useFTUE must be used within FTUEProvider');
  }
  return context;
};

