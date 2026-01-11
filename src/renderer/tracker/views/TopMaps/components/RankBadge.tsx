import React from 'react';

interface RankBadgeProps {
    rank: number;
}

const RankBadge: React.FC<RankBadgeProps> = ({ rank }) => {
    return <span className={`rank-badge rank-${rank}`}>#{rank}</span>;
};

export default RankBadge;