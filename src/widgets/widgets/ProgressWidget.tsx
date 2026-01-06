import React, { useState, useEffect } from 'react';
import { progressService } from '../services/ProgressService';
import { ProgressStats } from '../types';
import { itemsDataService } from '../../services/ItemsDataService';

export const ProgressWidget: React.FC = () => {
  const [stats, setStats] = useState<ProgressStats>({
    workshop: { completed: 0, total: 0, percentage: 0, fastestUnlockable: undefined },
    quests: { completed: 0, total: 0, percentage: 0, fastestUnlockable: undefined },
    projects: { completed: 0, total: 0, percentage: 0, fastestUnlockable: undefined }
  });

  useEffect(() => {
    const updateStats = () => {
      const allItems = itemsDataService.getItemsArray();
      setStats(progressService.getProgressStats(allItems));
    };

    // Load initial data
    updateStats();

    // Listen for changes
    const handleStorageChange = () => updateStats();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleStorageChange);

    // Poll as fallback
    const interval = setInterval(updateStats, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const renderProgressBar = (
    label: string, 
    completed: number, 
    total: number, 
    percentage: number,
    fastestUnlockable?: { itemName: string; upgradeLabel: string; remaining: number }
  ) => {
    return (
      <div className="progress-item">
        <div className="progress-item-header">
          <div className="progress-item-label">{label}</div>
          <div className="progress-item-count">
            {completed} / {total}
          </div>
        </div>
        <div className="progress-item-bar">
          <div 
            className="progress-item-fill" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="progress-item-percentage">{percentage}%</div>
      </div>
    );
  };

  return (
    <div className="widget progress-widget">
      <div className="widget-header">
        <h3>Progress</h3>
      </div>
      <div className="widget-content">
        <div className="progress-list">
          {renderProgressBar(
            'Workshop',
            stats.workshop.completed,
            stats.workshop.total,
            stats.workshop.percentage,
            stats.workshop.fastestUnlockable
          )}
          {renderProgressBar(
            'Quests',
            stats.quests.completed,
            stats.quests.total,
            stats.quests.percentage,
            stats.quests.fastestUnlockable
          )}
          {renderProgressBar(
            'Projects',
            stats.projects.completed,
            stats.projects.total,
            stats.projects.percentage,
            stats.projects.fastestUnlockable
          )}
        </div>
      </div>
    </div>
  );
};

