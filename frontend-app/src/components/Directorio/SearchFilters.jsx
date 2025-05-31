import React, { useState, useEffect, useCallback } from 'react';
import './SearchFilters.css';

const SearchFilters = ({ searchTerm, filters, onSearch, onFilterChange }) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Debounced search for real-time search without overwhelming the server
  const debouncedSearch = useCallback(
    debounce((term) => {
      onSearch(term);
    }, 300),
    [onSearch]
  );

  useEffect(() => {
    debouncedSearch(localSearchTerm);
  }, [localSearchTerm, debouncedSearch]);

  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  const handleFilterChange = (filterName, value) => {
    onFilterChange({ ...filters, [filterName]: value });
  };

  const clearAllFilters = () => {
    setLocalSearchTerm('');
    onSearch('');
    onFilterChange({ status: '', origen: '', genero: '' });
  };

  const hasActiveFilters = searchTerm || filters.status || filters.origen || filters.genero;

  return (
    <div className="search-filters">
      <div className="search-form">
        <div className="search-section">
          <input
            type="text"
            placeholder="🔍 Buscar contactos..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filters-section">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">Estado: Todos</option>
            <option value="cliente">Cliente</option>
            <option value="prospecto">Prospecto</option>
          </select>

          <select
            value={filters.origen}
            onChange={(e) => handleFilterChange('origen', e.target.value)}
            className="filter-select"
          >
            <option value="">Origen: Todos</option>
            <option value="MZD">MZD</option>
            <option value="LORENA">LORENA</option>
            <option value="MICH">MICH</option>
          </select>

          <select
            value={filters.genero}
            onChange={(e) => handleFilterChange('genero', e.target.value)}
            className="filter-select"
          >
            <option value="">Género: Todos</option>
            <option value="MASCULINO">Masculino</option>
            <option value="FEMENINO">Femenino</option>
          </select>

          {hasActiveFilters && (
            <button type="button" onClick={clearAllFilters} className="clear-btn">
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default SearchFilters; 