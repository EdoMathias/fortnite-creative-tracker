import React from 'react';

interface QuantityControlsProps {
  value: number;
  maxValue?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  showMaxValue?: boolean;
  variant?: 'default' | 'inline';
}

export const QuantityControls: React.FC<QuantityControlsProps> = ({
  value,
  maxValue,
  onIncrement,
  onDecrement,
  disabled = false,
  size = 'medium',
  showMaxValue = false,
  variant = 'default'
}) => {
  const isComplete = maxValue !== undefined && value >= maxValue;
  const canDecrement = value > 0 && !disabled;
  const canIncrement = !isComplete && !disabled;

  const sizeClasses = {
    small: 'quantity-controls-small',
    medium: 'quantity-controls-medium',
    large: 'quantity-controls-large'
  };

  const variantClass = variant === 'inline' ? 'tracker-quantity-controls' : 'quantity-controls-default';
  const buttonClass = variant === 'inline' ? 'tracker-quantity-btn' : 'quantity-btn';
  const valueClass = variant === 'inline' ? 'tracker-quantity-value' : 'quantity-value';
  const completeClass = variant === 'inline' ? 'complete' : 'quantity-value-complete';

  return (
    <div 
      className={`${variantClass} ${sizeClasses[size]}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onDecrement}
        disabled={!canDecrement}
        className={buttonClass}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <div className={`${valueClass} ${isComplete ? completeClass : ''}`}>
        {showMaxValue && maxValue !== undefined ? `${value}/${maxValue}` : `x${value}`}
      </div>
      <button
        onClick={onIncrement}
        disabled={!canIncrement}
        className={buttonClass}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
};

