import React from 'react';

interface TrendArrowProps {
    direction: 'up' | 'down' | 'flat';
}

const TrendArrow: React.FC<TrendArrowProps> = ({ direction }) => {
    return (
        <span className={`trend-arrow ${direction}`}>
            {direction === 'up' ? '↗' : direction === 'down' ? '↘' : '→'}
        </span>
    );
};

export default TrendArrow;