import React, { useState, useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableColumnItem from './SortableColumnItem';
import EditColumnForm from './EditColumnForm';

const ITEMS_PER_PAGE = 10;

const ColumnsList = ({ 
  columns, 
  editingColumn,
  onEdit,
  onEditSave,
  onEditCancel,
  onDelete,
  onCapture 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredColumns = useMemo(() => {
    return columns.filter(column => 
      column.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      column.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [columns, searchTerm]);

  const totalPages = Math.ceil(filteredColumns.length / ITEMS_PER_PAGE);
  const pageColumns = filteredColumns.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="columns-container">
      <div className="columns-header">
        <div className="search-box">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search columns..."
            className="search-input"
          />
        </div>
        <div className="columns-count">
          Showing {pageColumns.length} of {filteredColumns.length} columns
        </div>
      </div>

      <div className="columns-list">
        <SortableContext
          items={columns.map(col => col.name)}
          strategy={verticalListSortingStrategy}
        >
          {pageColumns.map((column, index) => (
            editingColumn === column.name ? (
              <EditColumnForm
                key={column.name}
                column={column}
                onSave={onEditSave}
                onCancel={onEditCancel}
              />
            ) : (
              <SortableColumnItem
                key={column.name}
                column={column}
                index={index}
                onEdit={() => onEdit(column.name)}
                onDelete={onDelete}
                onCapture={onCapture}
              />
            )
          ))}
        </SortableContext>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary"
          >
            Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ColumnsList; 