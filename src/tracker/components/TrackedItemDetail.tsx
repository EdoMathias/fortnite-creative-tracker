import React from 'react';
import { Item } from '../../shared/types';
import { getRarityColor } from '../../shared/utils';
import { getTotalCountNeeded, getKeepReasons, KeepReason } from '../utils';
import { QuantityControls, Button } from '../../components';
import { useItemImage } from '../../hooks/useItemImage';

interface TrackedItemDetailProps {
  item: Item;
  ownedCount: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onBack: () => void;
}

export const TrackedItemDetail: React.FC<TrackedItemDetailProps> = ({ 
  item, 
  ownedCount, 
  onIncrement, 
  onDecrement, 
  onBack 
}) => {
  const rarityColor = getRarityColor(item.rarity);
  const totalCount = getTotalCountNeeded(item);
  const reasons: KeepReason[] = getKeepReasons(item);
  const remaining = Math.max(0, totalCount - ownedCount);
  // Only mark as complete if item needs to be kept (totalCount > 0) and is actually complete
  const isComplete = totalCount > 0 && ownedCount >= totalCount;
  const { imageUrl } = useItemImage(item.imageFilename);

  return (
    <div style={{ 
      backgroundColor: '#2a2a2a', 
      padding: '20px', 
      borderRadius: '8px',
      marginTop: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {imageUrl && (
            <div style={{
              width: '64px',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              flexShrink: 0
            }}>
              <img 
                src={imageUrl} 
                alt={item.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
          )}
          <h2 style={{ 
            margin: 0, 
            color: rarityColor,
            fontSize: '24px'
          }}>
            {item.name}
          </h2>
        </div>
        <Button
          variant="secondary"
          onClick={onBack}
        >
          Back
        </Button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
        <div>
          <strong style={{ color: '#888' }}>Rarity:</strong>
          <span style={{ 
            color: rarityColor,
            marginLeft: '10px',
            fontWeight: 'bold'
          }}>
            {item.rarity}
          </span>
        </div>
        <div>
          <strong style={{ color: '#888' }}>Category:</strong>
          <span style={{ color: '#fff', marginLeft: '10px' }}>{item.category}</span>
        </div>
        <div>
          <strong style={{ color: '#888' }}>Sell Price:</strong>
          <span style={{ color: '#fff', marginLeft: '10px' }}>{item.sellPrice}</span>
        </div>
        <div>
          <strong style={{ color: '#888' }}>Total to Keep:</strong>
          <span style={{ color: '#1eff00', marginLeft: '10px', fontWeight: 'bold', fontSize: '18px' }}>
            {totalCount}x
          </span>
        </div>
        <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <strong style={{ color: '#888' }}>Owned:</strong>
            <QuantityControls
              value={ownedCount}
              maxValue={totalCount}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              showMaxValue={false}
              variant="default"
              size="large"
            />
            {isComplete ? (
              <span style={{ 
                color: '#1eff00', 
                fontSize: '16px', 
                fontWeight: 'bold',
                padding: '4px 12px',
                backgroundColor: '#1eff0020',
                borderRadius: '4px'
              }}>
                ✓ Complete
              </span>
            ) : (
              <span style={{ color: '#ffaa00', fontSize: '16px', fontWeight: 'bold' }}>
                Still need: {remaining}x
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <strong style={{ color: '#888', fontSize: '18px' }}>Keep For:</strong>
        {reasons.map((reason, idx) => (
          <div key={idx} style={{ marginTop: '15px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '6px' }}>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span>{reason.category} - {reason.count}x needed</span>
              {reason.categoryKey === 'events' && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: reason.meta?.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: reason.meta?.active ? '#10b981' : '#f87171',
                }}>
                  {reason.meta?.active ? 'Active Event' : 'Inactive Event'}
                </span>
              )}
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#fff' }}>
              {reason.details.map((detail, detailIdx) => (
                <li key={detailIdx} style={{ marginBottom: '5px' }}>
                  {detail.label} ({detail.count}x)
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {item.recycles.canRecycle && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '6px' }}>
          <strong style={{ color: '#888' }}>Note:</strong>
          <span style={{ color: '#fff', marginLeft: '10px' }}>
            This item can be recycled. Make sure to keep the required amount before recycling!
          </span>
        </div>
      )}
    </div>
  );
};

