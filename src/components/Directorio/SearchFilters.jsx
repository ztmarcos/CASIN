import React, { useState } from 'react';
import './SearchFilters.css';

const SearchFilters = ({ searchTerm, filters, onSearch, onFilterChange }) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(localSearchTerm);
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = {
      ...filters,
      [filterName]: value
    };
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setLocalSearchTerm('');
    onSearch('');
    onFilterChange({
      status: '',
      origen: '',
      genero: ''
    });
  };

  return (
    <div className="search-filters">
      <div className="search-section">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Buscar por nombre, empresa, email o teléfono..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">
              🔍 Buscar
            </button>
          </div>
        </form>
      </div>

      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="status-filter">Estado:</label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="cliente">Cliente</option>
              <option value="prospecto">Prospecto</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="origen-filter">Origen:</label>
            <select
              id="origen-filter"
              value={filters.origen}
              onChange={(e) => handleFilterChange('origen', e.target.value)}
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="MZD">MZD</option>
              <option value="LORENA">LORENA</option>
              <option value="MICH">MICH</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="genero-filter">Género:</label>
            <select
              id="genero-filter"
              value={filters.genero}
              onChange={(e) => handleFilterChange('genero', e.target.value)}
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div className="filter-actions">
            <button
              type="button"
              onClick={clearFilters}
              className="clear-filters-btn"
            >
              🗑️ Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="active-filters">
        {(searchTerm || filters.status || filters.origen || filters.genero) && (
          <div className="active-filters-list">
            <span className="active-filters-label">Filtros activos:</span>
            
            {searchTerm && (
              <span className="filter-tag">
                Búsqueda: "{searchTerm}"
                <button onClick={() => onSearch('')}>×</button>
              </span>
            )}
            
            {filters.status && (
              <span className="filter-tag">
                Estado: {filters.status}
                <button onClick={() => handleFilterChange('status', '')}>×</button>
              </span>
            )}
            
            {filters.origen && (
              <span className="filter-tag">
                Origen: {filters.origen}
                <button onClick={() => handleFilterChange('origen', '')}>×</button>
              </span>
            )}
            
            {filters.genero && (
              <span className="filter-tag">
                Género: {filters.genero}
                <button onClick={() => handleFilterChange('genero', '')}>×</button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilters; 