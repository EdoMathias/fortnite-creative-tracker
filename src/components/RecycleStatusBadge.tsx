import React from 'react';

interface RecycleStatusBadgeProps {
  isSafelySalvageable: boolean;
  variant?: 'card' | 'inline';
  className?: string;
  labelOverride?: string;
}

export const RecycleStatusBadge: React.FC<RecycleStatusBadgeProps> = ({
  isSafelySalvageable,
  variant = 'card',
  className = '',
  labelOverride
}) => {
  const recycleStatus = labelOverride ?? (isSafelySalvageable ? 'can recycle' : "don't recycle");
  const variantClass = variant === 'inline' ? 'recycle-status-inline' : 'recycle-status-card';

  return (
    <div 
      className={`recycle-status-badge ${variantClass} ${isSafelySalvageable ? 'recycle-status-can' : 'recycle-status-dont'} ${className}`}
    >
      {recycleStatus}
      {isSafelySalvageable && variant === 'card' && (
        <div className="custom-tooltip">
          can be used for various crafting
        </div>
      )}
    </div>
  );
};

