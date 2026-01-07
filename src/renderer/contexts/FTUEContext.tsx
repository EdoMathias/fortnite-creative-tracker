import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type FTUEStep = 
  | 'welcome'
  | 'widgets_intro';

export type FTUEScreen = 'main';

interface FTUEContextType {
  isFTUEComplete: boolean;
  completedSteps: Set<FTUEStep>;
  markStepComplete: (step: FTUEStep) => void;
  resetFTUE: () => void;
  shouldShowStep: (step: FTUEStep) => boolean;
}

const FTUEContext = createContext<FTUEContextType | undefined>(undefined);

const STORAGE_KEY = 'fortnite_tracker_ftue_completed';
const STEPS_STORAGE_KEY = 'fortnite_tracker_ftue_steps';

export const FTUEProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isFTUEComplete, setIsFTUEComplete] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
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

  const resetFTUE = () => {
    setIsFTUEComplete(false);
    setCompletedSteps(new Set());
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STEPS_STORAGE_KEY);
    } catch {
      // Ignore errors
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
    const steps: FTUEStep[] = [
      'welcome',
      'widgets_intro'
    ];
    
    for (const step of steps) {
      if (!completedSteps.has(step)) {
        return step;
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

  // Auto-complete FTUE when all steps are done
  useEffect(() => {
    const allSteps: FTUEStep[] = ['welcome', 'widgets_intro'];
    
    const allComplete = allSteps.every(step => completedSteps.has(step));
    if (allComplete && !isFTUEComplete) {
      completeFTUE();
    }
  }, [completedSteps, isFTUEComplete]);

  return (
    <FTUEContext.Provider
      value={{
        isFTUEComplete,
        completedSteps,
        markStepComplete,
        resetFTUE,
        shouldShowStep
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

