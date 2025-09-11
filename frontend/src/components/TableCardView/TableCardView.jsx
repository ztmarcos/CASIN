import React, { useState } from 'react';
import firebaseTableService from '../../services/firebaseTableService';
import TableMail from '../DataDisplay/TableMail';
import DriveManager from '../Drive/DriveManager';
import { toast } from 'react-hot-toast';
import { notifyDataEdit, notifyDataDelete } from '../../utils/dataUpdateNotifier';
import './TableCardView.css';

const TableCardView = ({ data, onCardClick, tableName, onRefresh }) => {
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedRowForActions, setSelectedRowForActions] = useState(null);
  const [mailModal, setMailModal] = useState({ isOpen: false, rowData: null });
  const [driveModal, setDriveModal] = useState({ isOpen: false, clientData: null });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const toggleCard = (cardId, event) => {
    event.stopPropagation();
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const formatTableName = (tableName) => {
    if (!tableName) return 'General';
    return tableName.charAt(0).toUpperCase() + tableName.slice(1);
  };

  const getDisplayTitle = (item) => {
    // Priorizar el nombre del contratante
    if (item.nombre_contratante) {
      return item.nombre_contratante;
    }
    
    const titleFields = [
      'nombre',
      'contratante',
      'name'
    ];
    
    for (const field of titleFields) {
      if (item[field] && typeof item[field] === 'string') {
        return item[field];
      }
    }
    
    return 'Sin título';
  };

  const getDisplaySubtitle = (item) => {
    // Priorizar el número de póliza
    if (item.numero_de_poliza) {
      return `Póliza: ${item.numero_de_poliza}`;
    }
    
    const subtitleFields = [
      'poliza',
      'numero_poliza'
    ];
    
    for (const field of subtitleFields) {
      if (item[field] && typeof item[field] === 'string') {
        return `Póliza: ${item[field]}`;
      }
    }
    
    return '';
  };

  const formatDate = (value) => {
    if (!value) return value;
    if (value.includes('/')) return value; // Ya está formateado
    const date = new Date(value);
    return !isNaN(date.getTime()) ? 
      date.toLocaleDateString('es-MX') : 
      value;
  };

  const formatValue = (key, value) => {
    if (!value) return '-';
    
    // Formatear forma de pago
    if (key === 'forma_de_pago' || key === 'forma_pago') {
      const formaDePago = value.toString().trim().toLowerCase();
      if (!formaDePago || formaDePago === 'null' || formaDePago === 'undefined') {
        return 'No especificada';
      }
      // Capitalizar primera letra
      return formaDePago.charAt(0).toUpperCase() + formaDePago.slice(1);
    }
    
    // Formatear fechas
    if (key.includes('fecha') || key.includes('vigencia')) {
      return formatDate(value);
    }
    
    // Formatear valores monetarios
    if (key.includes('prima') || key.includes('pago') || key.includes('precio') || key.includes('costo')) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) return '-';
      return `$${numValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    }

    // Formatear direcciones
    if (key.includes('direccion') || key.includes('domicilio')) {
      return value.toString().split(',').map(part => part.trim()).join(',\n');
    }

    // Formatear descripciones largas
    if (key.includes('descripcion') || (typeof value === 'string' && value.length > 50)) {
      return value.toString().split(' ').reduce((acc, word) => {
        if (acc.length > 0 && acc[acc.length - 1].length + word.length < 40) {
          acc[acc.length - 1] = `${acc[acc.length - 1]} ${word}`;
        } else {
          acc.push(word);
        }
        return acc;
      }, []).join('\n');
    }
    
    return value.toString();
  };

  const formatFieldName = (field) => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Action handlers
  const handleEmailClick = (rowData) => {
    setMailModal({ isOpen: true, rowData });
  };

  const handleCloseMailModal = () => {
    setMailModal({ isOpen: false, rowData: null });
  };

  const handleDriveClick = (rowData) => {
    console.log('DRIVE clicked for row:', rowData);
    setDriveModal({ isOpen: true, clientData: rowData });
  };

  const handleCloseDriveModal = () => {
    setDriveModal({ isOpen: false, clientData: null });
  };

  const handleDeleteClick = (row) => {
    setDeleteConfirm(row);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm || !deleteConfirm.id) return;

    try {
      await firebaseTableService.deleteRow(tableName, deleteConfirm.id);
      setDeleteConfirm(null);
      
      // Show success message
      toast.success('Row deleted successfully');
      
      // Notify other components about the deletion
      notifyDataDelete(tableName);
      
      // Refresh the data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error deleting row:', error);
      toast.error('Failed to delete row');
    }
  };

  const handlePaymentStatusToggle = async (record) => {
    try {
      const currentStatus = record.estado_pago || 'No Pagado';
      const newStatus = currentStatus === 'Pagado' ? 'No Pagado' : 'Pagado';
      
      console.log(`🔄 Updating payment status for record ${record.id} from ${currentStatus} to ${newStatus}`);
      
      await firebaseTableService.updateData(tableName, record.id, 'estado_pago', newStatus);
      
      toast.success(`Estado de pago actualizado a: ${newStatus}`);
      
      // Notify other components about the edit
      notifyDataEdit(tableName);
      
      // Refresh the data to ensure consistency
      if (onRefresh) {
        await onRefresh();
      }
      
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Error al actualizar el estado de pago');
    }
  };

  const handleCapStatusToggle = async (record) => {
    try {
      const currentStatus = record.estado_cap || 'Inactivo';
      const newStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo';
      
      console.log(`🔄 Updating CAP status for record ${record.id} from ${currentStatus} to ${newStatus}`);
      
      await firebaseTableService.updateData(tableName, record.id, 'estado_cap', newStatus);
      
      toast.success(`Estado CAP actualizado a: ${newStatus}`);
      
      // Notify other components about the edit
      notifyDataEdit(tableName);
      
      // Refresh the data to ensure consistency
      if (onRefresh) {
        await onRefresh();
      }
      
    } catch (error) {
      console.error('Error updating CAP status:', error);
      toast.error('Error al actualizar el estado CAP');
    }
  };

  const handleCfpStatusToggle = async (record) => {
    try {
      const currentStatus = record.estado_cfp || 'Inactivo';
      const newStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo';
      
      console.log(`🔄 Updating CFP status for record ${record.id} from ${currentStatus} to ${newStatus}`);
      
      await firebaseTableService.updateData(tableName, record.id, 'estado_cfp', newStatus);
      
      toast.success(`Estado CFP actualizado a: ${newStatus}`);
      
      // Notify other components about the edit
      notifyDataEdit(tableName);
      
      // Refresh the data to ensure consistency
      if (onRefresh) {
        await onRefresh();
      }
      
    } catch (error) {
      console.error('Error updating CFP status:', error);
      toast.error('Error al actualizar el estado CFP');
    }
  };

  const renderCardContent = (item, isExpanded) => {
    const title = getDisplayTitle(item);
    const subtitle = getDisplaySubtitle(item);

    // Campos que siempre se muestran
    const alwaysShowFields = ['vigencia_fin', 'forma_de_pago', 'forma_pago'];
    
    // Campos que no se deben mostrar
    const excludeFields = [
      'id', 
      '_sourceTable', 
      'nombre_contratante', 
      'numero_de_poliza',
      'aa',
      'pdf',
      'ramo'
    ];

    // Campos prioritarios cuando está expandido
    const priorityFields = [
      'aseguradora',
      'tipo_de_vehiculo',
      'vigencia_inicio',
      'duracion',
      'prima_neta',
      'pago_total_o_prima_total',
      'descripcion_del_vehiculo',
      'modelo',
      'placas'
    ];

    return (
      <>
        <h3 className="card-title">{title}</h3>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
        <div className={`card-details ${isExpanded ? 'expanded' : ''}`}>
          {/* Mostrar campos principales */}
          {alwaysShowFields.map(field => (
            <div key={field} className="card-detail-item">
              <span className="detail-label">{formatFieldName(field)}:</span>
              <span className="detail-value">{formatValue(field, item[field])}</span>
            </div>
          ))}
          
          {/* Mostrar campos cuando está expandido */}
          {isExpanded && (
            <>
              {/* Primero mostrar campos prioritarios */}
              {priorityFields.map(field => 
                item[field] && (
                  <div key={field} className="card-detail-item">
                    <span className="detail-label">{formatFieldName(field)}:</span>
                    <span className="detail-value">{formatValue(field, item[field])}</span>
                  </div>
                )
              )}
              
              {/* Luego mostrar el resto de campos */}
              {Object.entries(item)
                .filter(([key]) => 
                  !excludeFields.includes(key) && 
                  !alwaysShowFields.includes(key) &&
                  !priorityFields.includes(key) &&
                  item[key] !== null && 
                  item[key] !== undefined &&
                  item[key] !== ''
                )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <div key={key} className="card-detail-item">
                    <span className="detail-label">{formatFieldName(key)}:</span>
                    <span className="detail-value">{formatValue(key, value)}</span>
                  </div>
                ))
              }
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="table-card-view">
      {data.map((item, index) => {
        const cardId = `${item._sourceTable || 'table'}-${item.id || index}`;
        const isExpanded = expandedCards.has(cardId);

        return (
          <div 
            key={cardId}
            className="data-card"
            onClick={() => onCardClick(item)}
          >
            <div className="card-header">
              <div className="card-header-left">
                <span className="card-source-table">
                  {formatTableName(item._sourceTable)}
                </span>
                {item.id && <span className="card-id">#{item.id}</span>}
              </div>
              <div className="card-header-right">
                {item.status && (
                  <span className={`card-status status-${item.status?.toLowerCase()}`}>
                    {item.status}
                  </span>
                )}
                <button 
                  className="actions-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRowForActions(item);
                    setShowActionsModal(true);
                  }}
                  title="Abrir panel de acciones"
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '1px solid #f59e0b',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: '#fbbf24',
                    color: 'white',
                    transition: 'all 0.2s ease',
                    marginRight: '8px'
                  }}
                >
                  ⚡
                </button>
                <button 
                  className="expand-button"
                  onClick={(e) => toggleCard(cardId, e)}
                  aria-label={isExpanded ? 'Contraer' : 'Expandir'}
                >
                  {isExpanded ? '−' : '+'}
                </button>
              </div>
            </div>
            
            <div className={`card-content ${isExpanded ? 'expanded' : ''}`}>
              {renderCardContent(item, isExpanded)}
            </div>
          </div>
        );
      })}

      {/* Mail Modal */}
      <TableMail 
        isOpen={mailModal.isOpen}
        onClose={handleCloseMailModal}
        rowData={mailModal.rowData}
        tableType={tableName}
      />

      {/* Drive Manager Modal */}
      <DriveManager 
        isOpen={driveModal.isOpen}
        onClose={handleCloseDriveModal}
        clientData={driveModal.clientData}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="delete-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="delete-confirmation-dialog" style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#dc2626' }}>Eliminar Registro</h4>
            <p style={{ margin: '0 0 24px 0', color: '#6b7280' }}>
              ¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setDeleteConfirm(null)} 
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDelete} 
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: '1px solid #dc2626',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ACCIONES */}
      {showActionsModal && selectedRowForActions && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="actions-modal" style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Acciones para: {selectedRowForActions.nombre_contratante || 'Registro'}
              </h3>
              <button
                onClick={() => {
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {/* Botón Eliminar */}
              <button
                onClick={() => {
                  handleDeleteClick(selectedRowForActions);
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#fee2e2';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#fef2f2';
                }}
              >
                <span>×</span>
                Eliminar
              </button>

              {/* Botón Drive */}
              <button
                onClick={() => {
                  handleDriveClick(selectedRowForActions);
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#bfdbfe';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#dbeafe';
                }}
              >
                <span>📁</span>
                Drive
              </button>

              {/* Botón Pago */}
              <button
                onClick={() => {
                  handlePaymentStatusToggle(selectedRowForActions);
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: (selectedRowForActions.estado_pago === 'Pagado') ? '#dcfce7' : '#fef2f2',
                  color: (selectedRowForActions.estado_pago === 'Pagado') ? '#166534' : '#dc2626',
                  border: `1px solid ${(selectedRowForActions.estado_pago === 'Pagado') ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>💰</span>
                {(selectedRowForActions.estado_pago === 'Pagado') ? 'PAGADO' : 'NO PAGADO'}
              </button>

              {/* Botón CAP */}
              <button
                onClick={() => {
                  handleCapStatusToggle(selectedRowForActions);
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: (selectedRowForActions.estado_cap === 'Activo') ? '#dbeafe' : '#f3f4f6',
                  color: (selectedRowForActions.estado_cap === 'Activo') ? '#1e40af' : '#6b7280',
                  border: `1px solid ${(selectedRowForActions.estado_cap === 'Activo') ? '#bfdbfe' : '#d1d5db'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>📋</span>
                CAP
              </button>

              {/* Botón CFP */}
              <button
                onClick={() => {
                  handleCfpStatusToggle(selectedRowForActions);
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: (selectedRowForActions.estado_cfp === 'Activo') ? '#e9d5ff' : '#f3f4f6',
                  color: (selectedRowForActions.estado_cfp === 'Activo') ? '#7c3aed' : '#6b7280',
                  border: `1px solid ${(selectedRowForActions.estado_cfp === 'Activo') ? '#c4b5fd' : '#d1d5db'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>📄</span>
                CFP
              </button>

              {/* Botón Email */}
              <button
                onClick={() => {
                  handleEmailClick(selectedRowForActions);
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#bbf7d0';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#dcfce7';
                }}
              >
                <span>📧</span>
                Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableCardView; 