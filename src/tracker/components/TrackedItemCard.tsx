import React from 'react';
import { Item, KeepCategoryKey } from '../../shared/types';
import { getRarityColor } from '../../shared/utils';
import { getTotalCountNeeded, getKeepReasons, KeepReason } from '../utils';
import { QuantityControls } from '../../components';
import { useItemImage } from '../../hooks/useItemImage';
import { createLogger } from '../../services/Logger';

const logger = createLogger('TrackedItemCard');

interface TrackedItemCardProps {
  item: Item;
  ownedCount: number;
  onIncrement: (limit?: number) => void;
  onDecrement: () => void;
  onClick?: () => void;
  onDetailCheck: (itemName: string, category: KeepCategoryKey, detailLabel: string, detailCount: number, checked: boolean) => void;
  getDetailChecked: (itemName: string, category: KeepCategoryKey, detailLabel: string) => boolean;
  onTrackItem: (customAmount?: number) => void;
  onUntrackItem: () => void;
  onUpdateTrackedAmount: (itemName: string, amount: number) => void;
  isTracked: boolean;
  getTrackedAmount: (itemName: string) => number;
  onReset: () => void;
  onSetCount: (count: number) => void;
  onUndoCompletion: () => void;
}

export const TrackedItemCard: React.FC<TrackedItemCardProps> = ({ 
  item, 
  ownedCount, 
  onIncrement, 
  onDecrement, 
  onClick,
  onDetailCheck,
  getDetailChecked,
  onTrackItem,
  onUntrackItem,
  onUpdateTrackedAmount,
  isTracked,
  getTrackedAmount,
  onReset,
  onSetCount,
  onUndoCompletion
}) => {
  const [showAmountInput, setShowAmountInput] = React.useState(false);
  const [amountInput, setAmountInput] = React.useState<string>('');
  
  // Load pendingAmount from localStorage on mount
  const [pendingAmount, setPendingAmount] = React.useState<number | null>(() => {
    try {
      const stored = localStorage.getItem('recycleme_pending_amounts');
      if (stored) {
        const pendingAmounts = JSON.parse(stored) as Record<string, number>;
        return pendingAmounts[item.name] || null;
      }
    } catch (error) {
      logger.error('Error loading pending amount:', error);
    }
    return null;
  });
  
  const amountInputRef = React.useRef<HTMLInputElement>(null);
  
  // Save pendingAmount to localStorage whenever it changes
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('recycleme_pending_amounts');
      const pendingAmounts = stored ? JSON.parse(stored) as Record<string, number> : {};
      
      if (pendingAmount !== null) {
        pendingAmounts[item.name] = pendingAmount;
      } else {
        delete pendingAmounts[item.name];
      }
      
      localStorage.setItem('recycleme_pending_amounts', JSON.stringify(pendingAmounts));
      // Dispatch event so other windows can react to changes
      window.dispatchEvent(new Event('localStorageChange'));
    } catch (error) {
      logger.error('Error saving pending amount:', error);
    }
  }, [pendingAmount, item.name]);
  
  // Listen for changes to pending amounts from other windows
  React.useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem('recycleme_pending_amounts');
        if (stored) {
          const pendingAmounts = JSON.parse(stored) as Record<string, number>;
          const newPendingAmount = pendingAmounts[item.name] || null;
          if (newPendingAmount !== pendingAmount) {
            setPendingAmount(newPendingAmount);
          }
        }
      } catch (error) {
        logger.error('Error loading pending amount:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleStorageChange);
    };
  }, [item.name, pendingAmount]);
  const rarityColor = getRarityColor(item.rarity);
  const totalCount = getTotalCountNeeded(item);
  const reasons: KeepReason[] = getKeepReasons(item);
  const { imageUrl, isLoading, elementRef } = useItemImage(item.imageFilename);
  const trackedAmount = isTracked ? getTrackedAmount(item.name) : 0;
  
  // Check if all checkboxes are checked for items that are required to keep
  const areAllCheckboxesChecked = React.useMemo(() => {
    if (totalCount === 0) return true; // Not required to keep, so "all checked" (trivially true)
    
    // For items required to keep, check if all checkboxes are checked
    for (const reason of reasons) {
      const categoryKey = reason.categoryKey;
      for (const detail of reason.details) {
        if (!getDetailChecked(item.name, categoryKey, detail.label)) {
          return false;
        }
      }
    }
    return true;
  }, [reasons, item.name, getDetailChecked, totalCount]);

  // Determine if custom amount feature should be available
  // Available if: item is NOT required to keep, OR all checkboxes are checked
  const isCustomAmountAvailable = totalCount === 0 || areAllCheckboxesChecked;

  // Use custom tracked amount for counter only if it's explicitly set via custom amount feature
  // Otherwise, use totalCount (the overall amount needed)
  // trackedAmount === 0 means "tracked but no custom amount, use totalCount"
  const hasCustomAmount = isTracked && trackedAmount > 0;
  
  // Counter max value logic:
  // - For items NOT required to keep (totalCount === 0): use pendingAmount if available, otherwise no limit (undefined)
  // - For items required to keep (totalCount > 0):
  //   - If all checkboxes checked AND (pendingAmount exists OR hasCustomAmount): use custom amount
  //   - Otherwise: use totalCount
  let counterMaxValue: number | undefined;
  if (totalCount === 0) {
    // Not required to keep - use custom amount if available, otherwise no limit
    counterMaxValue = pendingAmount !== null ? pendingAmount : (hasCustomAmount ? trackedAmount : undefined);
  } else {
    // Required to keep - only use custom amount if all checkboxes are checked
    if (areAllCheckboxesChecked && (pendingAmount !== null || hasCustomAmount)) {
      counterMaxValue = pendingAmount !== null ? pendingAmount : trackedAmount;
    } else {
      counterMaxValue = totalCount;
    }
  }
  
  const remaining = counterMaxValue !== undefined ? Math.max(0, counterMaxValue - ownedCount) : 0;
  // Only mark as complete if item needs to be kept (counterMaxValue > 0) and is actually complete
  const isComplete = counterMaxValue !== undefined && counterMaxValue > 0 && ownedCount >= counterMaxValue;

  const handleAddCustomAmountClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAmountInput('');
    setShowAmountInput(true);
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 0);
  };

  const handleAmountInputBlur = () => {
    const amount = parseInt(amountInput, 10);
    if (!isNaN(amount) && amount > 0) {
      setPendingAmount(amount);
      setShowAmountInput(false);
      setAmountInput('');
      logger.log('Pending amount updated from input', { itemName: item.name, amount });
      
      // If item is required for a station and all checkboxes are checked, reset the counter
      // so the user can start tracking the new custom amount from 0
      if (totalCount > 0 && areAllCheckboxesChecked) {
        onReset();
      }

      // Automatically track with the custom amount
      // onTrackItem(amount); // User requested to NOT automatically track
      
      // If item is already tracked, update the tracked amount immediately
      if (isTracked) {
        onUpdateTrackedAmount(item.name, amount);
      }

    } else {
      setShowAmountInput(false);
      setAmountInput('');
    }
  };

  // If item is tracked with a custom amount but pendingAmount is null, set it to the tracked amount
  React.useEffect(() => {
    if (isTracked && trackedAmount > 0 && pendingAmount === null) {
      setPendingAmount(trackedAmount);
      logger.log('Synced pending amount from tracked value', { itemName: item.name, trackedAmount });
    }
    // Don't clear pendingAmount when untracked - keep it so user can track again with same custom amount
  }, [isTracked, trackedAmount]);

  const handleResetCustomAmount = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingAmount(null);
    // If it was tracked with a custom amount, update it to 0 (tracked but no custom limit)
    if (isTracked && trackedAmount > 0) {
      onUpdateTrackedAmount(item.name, 0);
    }
    
    // Always reset the count to 0 when resetting the goal
    onReset();
  };


  return (
    <div
      onClick={onClick}
      className={`tracker-item-card ${isComplete ? 'complete' : ''}`}
    >
      <div className="tracker-item-header">
        <div className="tracker-item-header-top" ref={elementRef}>
          {imageUrl && (
            <div className="tracker-item-image-container">
              <img 
                src={imageUrl} 
                alt={item.name}
                className="tracker-item-image"
                loading="lazy"
              />
            </div>
          )}
          <div 
            className="tracker-item-name"
            style={{ color: rarityColor }}
          >
            {item.name}
          </div>
        </div>
        <div className="tracker-item-meta">
          {item.sellPrice} credits
        </div>
        {(counterMaxValue !== undefined && counterMaxValue > 0) && (
          <div className="tracker-item-need">
            {isComplete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <span className="tracker-item-complete-badge">
                  ✓ Complete
                </span>
                {(pendingAmount !== null || (isTracked && trackedAmount > 0)) && (
                  <button
                    className="tracker-reset-custom-amount-button"
                    onClick={handleResetCustomAmount}
                    title="Reset custom amount"
                  >
                    Reset Goal
                  </button>
                )}
              </div>
            ) : (
              <span>
                Need: {counterMaxValue}x
                {pendingAmount !== null && !isTracked && isCustomAmountAvailable && (
                  <span style={{ color: 'rgba(6, 182, 212, 0.8)', fontSize: '11px', marginLeft: '6px' }}>
                    (Custom: {pendingAmount}x)
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="tracker-item-remaining" style={{ visibility: remaining > 0 ? 'visible' : 'hidden' }}>
        Still need: {remaining}x
      </div>
      
      <div className="tracker-item-details">
        {/* Show checkboxes only if not all are checked (for items required to keep) */}
        {!(totalCount > 0 && areAllCheckboxesChecked) && reasons.map((reason, idx) => {
          const categoryKey = reason.categoryKey;
          
          return (
            <div key={idx} style={{ marginBottom: '8px' }}>
              <div className="tracker-detail-category">
                {reason.category} ({reason.count}x):
              </div>
              <ul className="tracker-detail-list">
                {reason.details.map((detail, detailIdx) => {
                  const isChecked = getDetailChecked(item.name, categoryKey, detail.label);
                  
                  return (
                    <li key={detailIdx} className="tracker-detail-item">
                      <label 
                        className="tracker-detail-label"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="tracker-detail-checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            onDetailCheck(item.name, categoryKey, detail.label, detail.count, e.target.checked);
                          }}
                        />
                        <span>
                          {detail.label} ({detail.count}x)
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        
        {/* Show undo completion button when all checkboxes are checked */}
        {totalCount > 0 && areAllCheckboxesChecked && (
          <div style={{ marginBottom: '8px' }}>
            <button
              className="tracker-undo-completion-button"
              onClick={(e) => {
                e.stopPropagation();
                onUndoCompletion();
              }}
              title="Undo completion - uncheck all boxes and reset count"
              style={{ width: '100%', marginTop: '8px' }}
            >
              Undo Completion
            </button>
          </div>
        )}
        
        {/* Custom Amount Tracking - Show if available OR if all checkboxes are checked (for required items) */}
        {isCustomAmountAvailable && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            {showAmountInput ? (
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  ref={amountInputRef}
                  type="number"
                  min="1"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  onBlur={handleAmountInputBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      setShowAmountInput(false);
                      setAmountInput('');
                    }
                  }}
                  className="tracker-custom-amount-input"
                  placeholder="Enter amount"
                  autoFocus
                />
              </div>
            ) : (
              <button
                className="tracker-add-custom-amount-button"
                onClick={handleAddCustomAmountClick}
                title={pendingAmount !== null || (isTracked && trackedAmount > 0) 
                  ? `Edit custom amount (${pendingAmount !== null ? pendingAmount : trackedAmount}x)`
                  : "Add custom tracking amount"}
              >
                {pendingAmount !== null || (isTracked && trackedAmount > 0) 
                  ? `Custom: ${pendingAmount !== null ? pendingAmount : trackedAmount}x`
                  : "+ Add Custom Amount"}
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="tracker-item-actions">
        <QuantityControls
          value={ownedCount}
          maxValue={counterMaxValue}
          onIncrement={() => onIncrement(counterMaxValue)}
          onDecrement={onDecrement}
          showMaxValue={false}
          variant="inline"
          size="medium"
          disabled={
            counterMaxValue === undefined || 
            (totalCount > 0 && counterMaxValue === totalCount && ownedCount >= totalCount)
          }
        />
        <button
          className={`tracker-track-button ${isTracked ? 'tracked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isTracked) {
              onUntrackItem();
              // Don't clear pendingAmount - keep it so user can track again with same custom amount
            } else {
              // Track with custom amount if available, otherwise use totalCount (0)
              onTrackItem(pendingAmount !== null ? pendingAmount : undefined);
            }
          }}
          title={isTracked ? 'Untrack item' : 'Track item'}
        >
          {isTracked ? '✅' : '👁️'}
        </button>
      </div>
    </div>
  );
};

