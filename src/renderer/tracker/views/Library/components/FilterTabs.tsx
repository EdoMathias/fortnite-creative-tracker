import React from 'react';
import { FilterOption } from '../types';

interface FilterTabsProps {
  value: FilterOption;
  onChange: (filter: FilterOption) => void;
  favoritesCount: number;
  totalCount: number;
}

const FilterTabs: React.FC<FilterTabsProps> = ({
  value,
  onChange,
  favoritesCount,
  totalCount,
}) => {
  return (
    <div className="library-filter-tabs" role="tablist" aria-label="Filter">
      <button
        type="button"
        className={`library-filter-tab ${value === 'all' ? 'active' : ''}`}
        onClick={() => onChange('all')}
        role="tab"
        aria-selected={value === 'all'}
      >
        All Maps
        <span className="library-filter-count">{totalCount}</span>
      </button>
      <button
        type="button"
        className={`library-filter-tab ${value === 'favorites' ? 'active' : ''}`}
        onClick={() => onChange('favorites')}
        role="tab"
        aria-selected={value === 'favorites'}
      >
        ⭐ Favorites
        <span className="library-filter-count">{favoritesCount}</span>
      </button>
    </div>
  );
};

export default FilterTabs;
