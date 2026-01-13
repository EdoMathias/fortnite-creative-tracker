import React from 'react';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  placeholder = 'Search maps...',
}) => {
  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="library-search-box">
      <span className="library-search-icon">🔍</span>
      <input
        type="text"
        className="library-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search maps"
      />
      {value && (
        <button
          type="button"
          className="library-search-clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default SearchBox;
