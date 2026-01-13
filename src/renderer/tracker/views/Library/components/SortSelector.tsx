import React from 'react';
import { SortOption, SORT_OPTIONS } from '../types';

interface SortSelectorProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
}

const SortSelector: React.FC<SortSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="library-sort-selector">
      <label className="library-sort-label">Sort by</label>
      <select
        className="library-sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.icon} {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SortSelector;
