import React from 'react';
import { Item, KeepCategoryKey } from '../../shared/types';
import { TrackedItemCard } from './TrackedItemCard';
import { getTotalCountNeeded } from '../utils';

interface TrackedItemListProps {
  items: Item[];
  getOwnedCount: (itemName: string) => number;
  getTotalCountNeeded: (item: Item) => number;
  onIncrement: (itemName: string, maxValue?: number) => void;
  onDecrement: (itemName: string) => void;
  onItemSelect: (item: Item) => void;
  onDetailCheck: (itemName: string, category: KeepCategoryKey, detailLabel: string, detailCount: number, checked: boolean) => void;
  getDetailChecked: (itemName: string, category: KeepCategoryKey, detailLabel: string) => boolean;
  onTrackItem: (itemName: string, customAmount?: number) => void;
  onUntrackItem: (itemName: string) => void;
  onUpdateTrackedAmount: (itemName: string, amount: number) => void;
  isItemTracked: (itemName: string) => boolean;
  getTrackedAmount: (itemName: string) => number;
  onReset: (itemName: string) => void;
  onSetCount: (itemName: string, count: number) => void;
  onUndoCompletion: (itemName: string) => void;
}

export const TrackedItemList: React.FC<TrackedItemListProps> = ({ 
  items, 
  getOwnedCount,
  getTotalCountNeeded,
  onIncrement,
  onDecrement,
  onItemSelect,
  onDetailCheck,
  getDetailChecked,
  onTrackItem,
  onUntrackItem,
  onUpdateTrackedAmount,
  isItemTracked,
  getTrackedAmount,
  onReset,
  onSetCount,
  onUndoCompletion
}) => {
  if (items.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px', 
        color: '#888',
        fontSize: '18px'
      }}>
        No items to track. All items can be sold or recycled!
      </div>
    );
  }

  return (
    <div className="tracker-item-grid">
      {items.map((item) => {
        const totalNeeded = getTotalCountNeeded(item);
        return (
        <TrackedItemCard
          key={item.name}
          item={item}
          ownedCount={getOwnedCount(item.name)}
          onIncrement={(limit) => onIncrement(item.name, limit)}
          onDecrement={() => onDecrement(item.name)}
          onClick={() => onItemSelect(item)}
          onDetailCheck={onDetailCheck}
          getDetailChecked={getDetailChecked}
          onTrackItem={(customAmount) => onTrackItem(item.name, customAmount)}
          onUntrackItem={() => onUntrackItem(item.name)}
          onUpdateTrackedAmount={onUpdateTrackedAmount}
          isTracked={isItemTracked(item.name)}
          getTrackedAmount={getTrackedAmount}
          onReset={() => onReset(item.name)}
          onSetCount={(count) => onSetCount(item.name, count)}
          onUndoCompletion={() => onUndoCompletion(item.name)}
        />
        );
      })}
    </div>
  );
};

