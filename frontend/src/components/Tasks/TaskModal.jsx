import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import firebaseTaskService from '../../services/firebaseTaskService';
import './TaskModal.css';

const TaskModal = ({ task, onSave, onClose, onDelete, isDark }) => {
  const { user } = useAuth();
  const { teamMembers, userRole, createTestUsers } = useTeam();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
    assignedUsers: [],
    tags: [],
    comments: []
  });

  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [creatingTestUsers, setCreatingTestUsers] = useState(false);

  // Get current user data
  const getCurrentUser = () => {
    if (user) {
      // Find current user in team members
      const currentMember = teamMembers.find(member => member.email === user.email);
      
      // Clean name - avoid technical data
      let cleanName = user.displayName || user.name || 'Usuario';
      if (cleanName.includes('@') || cleanName.includes('http')) {
        cleanName = user.email?.split('@')[0] || 'Usuario';
      }
      
      return {
        id: user.uid || 'current_user',
        name: cleanName,
        email: user.email,
        role: currentMember?.role || userRole || 'user',
        avatar: '👤', // Always use emoji, never URLs
        isCurrentUser: true
      };
    }
    return { id: 'guest', name: 'Invitado', email: '', role: 'guest', avatar: '👤' };
  };

  const currentUser = getCurrentUser();

  // Convert team members to user format for the modal
  const getTeamUsersForModal = () => {
    if (!teamMembers || teamMembers.length === 0) {
      return [];
    }
    
    return teamMembers.map(member => {
      // Get clean display name - only show proper names, not emails or IDs
      let displayName = '';
      
      if (member.email === user?.email && user?.displayName) {
        // Current user: use Google Auth display name
        displayName = user.displayName;
      } else if (member.name && 
                 member.name !== member.email && 
                 !member.name.includes('UpSvtCw') && 
                 !member.name.includes('@') &&
                 !member.name.includes('http')) {
        // Valid name that's not an email or URL
        displayName = member.name;
      } else {
        // Extract clean name from email prefix
        const emailPrefix = member.email.split('@')[0];
        if (emailPrefix.includes('.')) {
          // Handle names like "john.doe" -> "John Doe"
          displayName = emailPrefix
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
        } else {
          // Handle names like "johndoe123" -> "Johndoe123"
          displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        }
      }
      
      return {
        id: member.email,
        name: displayName,
        email: member.email,
        role: member.role || 'user',
        avatar: '👤', // Always use emoji, never URLs
        isCurrentUser: member.email === user?.email
      };
    });
  };

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        dueDate: formatDateForInput(task.dueDate) || '',
        assignedTo: task.assignedTo || '',
        assignedUsers: task.assignedUsers || [],
        tags: task.tags || [],
        comments: task.comments || []
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        dueDate: '',
        assignedTo: '',
        assignedUsers: [],
        tags: [],
        comments: []
      });
    }
  }, [task]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-select-container')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);



  const formatDateForInput = (date) => {
    if (!date) return '';
    
    try {
      let dateObj;
      
      if (date.toDate && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        return '';
      }
      
      if (isNaN(dateObj.getTime())) return '';
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date for input:', error);
      return '';
    }
  };

  const formatDateForDisplay = (date) => {
    if (!date) return 'Sin fecha';
    
    try {
      let dateObj;
      
      if (date.toDate && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        return 'Sin fecha';
      }
      
      if (isNaN(dateObj.getTime())) return 'Sin fecha';
      
      return dateObj.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return 'Sin fecha';
    }
  };

  const isOverdue = (date) => {
    if (!date) return false;
    
    try {
      let dateObj;
      
      if (date.toDate && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        return false;
      }
      
      if (isNaN(dateObj.getTime())) return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateObj.setHours(0, 0, 0, 0);
      
      return dateObj < today && formData.status !== 'completed';
    } catch (error) {
      console.error('Error checking if date is overdue:', error);
      return false;
    }
  };

  const handleFieldEdit = (field) => {
    setEditingField(field);
    if (field === 'dueDate') {
      setTempValue(formatDateForInput(formData[field]));
    } else {
      setTempValue(formData[field] || '');
    }
  };

  const handleFieldSave = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: tempValue
    }));
    setEditingField(null);
    setTempValue('');
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleFieldCancel = () => {
    setEditingField(null);
    setTempValue('');
  };

  const handleUserSelect = (user) => {
    setFormData(prev => {
      const currentAssigned = prev.assignedTo ? prev.assignedTo.split(', ') : [];
      const currentUsers = prev.assignedUsers || [];
      
      // Check if user is already assigned
      if (currentAssigned.includes(user.name)) {
        // Remove user if already assigned
        const newAssigned = currentAssigned.filter(name => name !== user.name);
        const newUsers = currentUsers.filter(u => u.email !== user.email);
        
        return {
          ...prev,
          assignedTo: newAssigned.join(', '),
          assignedUsers: newUsers
        };
      } else {
        // Add user to assignment
        const newAssigned = [...currentAssigned, user.name];
        const newUsers = [...currentUsers, user];
        
        return {
          ...prev,
          assignedTo: newAssigned.join(', '),
          assignedUsers: newUsers
        };
      }
    });
    // Don't close dropdown to allow multiple selections
  };

  const handleCommentChange = (e) => {
    setCommentInput(e.target.value);
  };

  const handleAddTag = async () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };



  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddComment = () => {
    if (commentInput.trim()) {
      // Clean author name - no emails or technical data
      let cleanAuthorName = currentUser.name;
      if (cleanAuthorName.includes('@') || cleanAuthorName.includes('http')) {
        cleanAuthorName = user?.displayName || user?.email?.split('@')[0] || 'Usuario';
      }
      
      const newComment = {
        id: Date.now().toString(),
        text: commentInput.trim(),
        author: cleanAuthorName,
        authorAvatar: '👤', // Always use emoji
        authorRole: currentUser.role,
        timestamp: new Date()
      };
      
      setFormData(prev => ({
        ...prev,
        comments: [...prev.comments, newComment]
      }));
      setCommentInput('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    }

    if (formData.dueDate) {
      const dateObj = new Date(formData.dueDate);
      if (isNaN(dateObj.getTime())) {
        newErrors.dueDate = 'Fecha inválida';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const taskData = {
      ...formData,
      id: task?.id,
      updatedAt: new Date(),
      createdAt: task?.createdAt || new Date(),
      createdBy: task?.createdBy || currentUser.name,
      createdByUser: task?.createdByUser || currentUser
    };

    onSave(taskData);
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      action();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return 'Pendiente';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'low': return 'Baja';
      case 'medium': return 'Media';
      case 'high': return 'Alta';
      default: return 'Media';
    }
  };

  const getUserRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'member': return 'Usuario';
      case 'user': return 'Usuario';
      case 'guest': return 'Invitado';
      case 'invited': return 'Invitado';
      default: return 'Usuario';
    }
  };

  const getUserRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👑';
      case 'member': return '👤';
      case 'user': return '👤';
      case 'guest': return '👥';
      case 'invited': return '👥';
      default: return '👤';
    }
  };

  const renderEditableField = (field, label, value, type = 'text', options = null) => {
    const isEditing = editingField === field;
    
    return (
      <div className="editable-field">
        <label>{label}</label>
        {isEditing ? (
          <div className="edit-container">
            {type === 'select' ? (
              <select
                value={tempValue} 
                onChange={(e) => setTempValue(e.target.value)}
                autoFocus
              >
                {options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : type === 'textarea' ? (
              <textarea
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                autoFocus
                rows="3"
                placeholder={`Ingrese ${label.toLowerCase()}...`}
              />
            ) : type === 'date' ? (
              <input
                type="date"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                autoFocus
              />
            ) : (
              <input
                type={type}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                autoFocus
                placeholder={`Ingrese ${label.toLowerCase()}...`}
              />
            )}
            <div className="edit-actions">
              <button 
                className="save-btn-small"
                onClick={() => handleFieldSave(field)}
              >
                ✓
              </button>
              <button 
                className="cancel-btn-small"
                onClick={handleFieldCancel}
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="field-display clickable"
            onClick={() => handleFieldEdit(field)}
          >
            {field === 'dueDate' ? (
              <div className={`date-display ${isOverdue(value) ? 'overdue' : ''}`}>
                📅 {formatDateForDisplay(value)}
                {isOverdue(value) && <span className="overdue-badge">VENCIDA</span>}
              </div>
            ) : field === 'status' ? (
              <span 
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(value) }}
              >
                {getStatusText(value)}
              </span>
            ) : field === 'priority' ? (
              <span 
                className="priority-indicator"
                style={{ backgroundColor: getPriorityColor(value) }}
              >
                {getPriorityText(value)}
              </span>
            ) : field === 'assignedTo' ? (
              <div className="assigned-user-display">
                {formData.assignedUser ? (
                  <span className="user-chip">
                    <span className="user-avatar">{formData.assignedUser.avatar}</span>
                    <span className="user-name">{formData.assignedUser.name}</span>
                    <span className="user-role">{getUserRoleText(formData.assignedUser.role)}</span>
                  </span>
                ) : (
                  <span className="field-text">Haz click para asignar usuario</span>
                )}
              </div>
            ) : (
              <span className="field-text">
                {value || `Haz click para agregar ${label.toLowerCase()}`}
              </span>
            )}
          </div>
        )}
        {errors[field] && <span className="error-text">{errors[field]}</span>}
      </div>
    );
  };

  // Get team users for the modal
  const teamUsersForModal = getTeamUsersForModal();

  const handleCreateTestUsers = async () => {
    if (!createTestUsers) return;
    
    setCreatingTestUsers(true);
    try {
      await createTestUsers();
      alert('Usuarios de prueba creados exitosamente!');
    } catch (error) {
      console.error('Error creating test users:', error);
      alert('Error al crear usuarios de prueba');
    } finally {
      setCreatingTestUsers(false);
    }
  };

  return (
    <>
      <div className="task-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="task-modal-container">
          {/* Header */}
          <div className="task-modal-header">
            <h2>{task ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
            <div className="header-buttons">
              {task && onDelete && currentUser.role === 'admin' && (
                <button 
                  className="delete-button"
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
                      onDelete(task.id);
                      onClose();
                    }
                  }}
                >
                  🗑️ Eliminar
                </button>
              )}
              <button className="close-button" onClick={onClose}>✕</button>
            </div>
          </div>

          {/* Content */}
          <div className="task-modal-content">
            <div className="single-column-layout">
              {/* Task Details Section */}
              <div className="task-details-section">
                <h3>Información de la Tarea</h3>
                
                {/* Title */}
                {renderEditableField('title', 'Título', formData.title)}
                
                {/* Status, Priority, Date in a row */}
                <div className="status-priority-date-row">
                  {renderEditableField('status', 'Estado', formData.status, 'select', [
                    { value: 'pending', label: 'Pendiente' },
                    { value: 'in_progress', label: 'En Progreso' },
                    { value: 'completed', label: 'Completada' },
                    { value: 'cancelled', label: 'Cancelada' }
                  ])}
                  
                  {renderEditableField('priority', 'Prioridad', formData.priority, 'select', [
                    { value: 'low', label: 'Baja' },
                    { value: 'medium', label: 'Media' },
                    { value: 'high', label: 'Alta' }
                  ])}
                  
                  {renderEditableField('dueDate', 'Fecha límite', formData.dueDate, 'date')}
                </div>

                {/* Description */}
                {renderEditableField('description', 'Descripción', formData.description, 'textarea')}
                
                {/* Assigned To */}
                <div className="editable-field">
                  <label>Asignado a</label>
                  <div className="user-select-container" style={{ position: 'relative' }}>
                    <div 
                      className="user-select-field"
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                    >
                      {formData.assignedTo ? (
                        <div className="selected-users">
                          {formData.assignedUsers?.length > 0 ? (
                            <div className="assigned-users-display">
                              <span className="users-count">👥 {formData.assignedUsers.length}</span>
                              <span className="users-names">{formData.assignedTo}</span>
                            </div>
                          ) : (
                            <span>{formData.assignedTo}</span>
                          )}
                        </div>
                      ) : (
                        <span className="placeholder">Haz click para asignar usuarios</span>
                      )}
                      <span className="dropdown-arrow">▼</span>
                    </div>
                    
                    {showUserDropdown && (
                      <div className="user-dropdown-menu">
                        {getTeamUsersForModal().length > 0 ? (
                          getTeamUsersForModal().map(user => {
                            const isSelected = formData.assignedTo && formData.assignedTo.split(', ').includes(user.name);
                            return (
                              <div 
                                key={user.id} 
                                className={`user-dropdown-option ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleUserSelect(user)}
                              >
                                <span className={`checkbox ${isSelected ? 'checked' : ''}`}>
                                  {isSelected ? '✓' : '○'}
                                </span>
                                <span className="user-avatar-mini">{user.avatar}</span>
                                <div className="user-option-info">
                                  <div className="user-option-name">
                                    {user.name} {user.isCurrentUser && '(Tú)'}
                                  </div>
                                  <div className="user-option-email">{user.email}</div>
                                </div>
                                <span className={`role-mini ${user.role}`}>
                                  {getUserRoleIcon(user.role)}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="no-users-option">
                            <p>No hay usuarios disponibles</p>
                            {currentUser.role === 'admin' && createTestUsers && (
                              <button 
                                className="create-users-mini-btn"
                                onClick={handleCreateTestUsers}
                                disabled={creatingTestUsers}
                              >
                                {creatingTestUsers ? '⏳ Creando...' : '+ Crear Usuarios'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="editable-field">
                  <label>Etiquetas</label>
                  <div className="tags-section">
                    {formData.tags.length > 0 && (
                      <div className="tags-list">
                        {formData.tags.map((tag, index) => (
                          <span key={index} className="tag">
                            {tag}
                            <button type="button" onClick={() => handleRemoveTag(tag)}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Escribe una etiqueta y presiona Enter..."
                      className="tag-input-simple"
                    />
                  </div>
                </div>

                {/* Creation Info */}
                {task && (
                  <div className="creation-info">
                    <div className="info-row">
                      <span className="info-label">Creado por:</span>
                      <span>{task.createdBy || 'Sistema'}</span>
                    </div>
                    {task.createdAt && (
                      <div className="info-row">
                        <span className="info-label">Fecha de creación:</span>
                        <span>{formatDateForDisplay(task.createdAt)}</span>
                      </div>
                    )}
                    {task.updatedAt && (
                      <div className="info-row">
                        <span className="info-label">Última actualización:</span>
                        <span>{formatDateForDisplay(task.updatedAt)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="comments-section">
                <h3>Comentarios</h3>
                <div className="comments-container">
                  {formData.comments.length > 0 ? (
                    formData.comments.map((comment, index) => (
                      <div key={comment.id || index} className="comment">
                        <div className="comment-header">
                          <div className="comment-author-info">
                            <span className="comment-avatar">{comment.authorAvatar || '👤'}</span>
                            <strong>{comment.author}</strong>
                            <span className={`role-badge ${comment.authorRole}`}>
                              {getUserRoleIcon(comment.authorRole)} {getUserRoleText(comment.authorRole)}
                            </span>
                          </div>
                          <span className="comment-time">
                            {new Date(comment.timestamp).toLocaleString('es-ES')}
                  </span>
                        </div>
                        <div className="comment-text">{comment.text}</div>
                      </div>
                    ))
                  ) : (
                    <div className="no-comments">No hay comentarios aún</div>
                  )}
                </div>
                <div className="add-comment">
                  <div className="current-user-info">
                    <span className="user-avatar">👤</span>
                    <span>Comentando como <strong>{currentUser.name}</strong> ({getUserRoleText(currentUser.role)})</span>
                  </div>
                  <textarea
                    value={commentInput}
                    onChange={handleCommentChange}
                    onKeyPress={(e) => handleKeyPress(e, handleAddComment)}
                    placeholder="Escribe un comentario... (Usa @ para mencionar usuarios)"
                    rows="3"
                  />
                  <button 
                    onClick={handleAddComment} 
                    disabled={!commentInput.trim()}
                  >
                    💬 Comentar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="task-modal-footer">
            <button className="cancel-btn" onClick={onClose}>
              Cancelar
            </button>
            <button className="save-btn" onClick={handleSave}>
              {task ? 'Guardar Cambios' : 'Crear Tarea'}
            </button>
          </div>
        </div>
      </div>




    </>
  );
};

export default TaskModal; 