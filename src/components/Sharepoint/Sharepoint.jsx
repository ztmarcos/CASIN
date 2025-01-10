import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Sharepoint.css';
import { sharepointService } from '../../services/sharepointService';

const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(31, 41, 55, 0.5);
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(79, 70, 229, 0.3);
    border-radius: 4px;
    min-height: 40px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(79, 70, 229, 0.5);
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(79, 70, 229, 0.3) rgba(31, 41, 55, 0.5);
  }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = customScrollbarStyles;
document.head.appendChild(styleSheet);

const Sharepoint = ({ currentUser = 'default_user' }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [newTask, setNewTask] = useState({
    title: "",
    priority: "Media",
    status: "Pendiente",
    assigned_to: "",
    due_date: "",
    description: "",
    created_by: currentUser
  });

  const [tasks, setTasks] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tasksData = await sharepointService.getTasks(currentUser);
        setTasks(tasksData);

        const tagsData = await sharepointService.getTags();
        setTags(tagsData);

        const notificationsData = await sharepointService.getNotifications(currentUser);
        setNotifications(notificationsData);

        const collaboratorsData = await sharepointService.getCollaborators();
        setCollaborators(collaboratorsData);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Error loading data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  const handleTaskClick = (task) => {
    setSelectedTask({ ...task });
    setEditingTask({ ...task });
    setIsEditing(true);
  };

  const handleCreateTask = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate required fields
      if (!newTask.title) {
        throw new Error('Title is required');
      }

      const taskData = {
        ...newTask,
        tags: selectedTags
      };
      
      const createdTask = await sharepointService.createTask(taskData);
      setTasks(prev => [...prev, createdTask]);
      setIsCreating(false);
      
      // Reset form
      setNewTask({
        title: "",
        priority: "Media",
        status: "Pendiente",
        assigned_to: "",
        due_date: "",
        description: "",
        created_by: currentUser
      });
      setSelectedTags([]);
    } catch (error) {
      console.error('Error creating task:', error);
      setError(error.message || 'Error creating task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskToDelete) => {
    try {
      const confirmed = window.confirm('¿Estás seguro de que quieres eliminar esta tarea?\nEsta acción no se puede deshacer.');
      if (confirmed) {
        setIsLoading(true);
        await sharepointService.deleteTask(taskToDelete.id);
        setTasks(prev => prev.filter(task => task.id !== taskToDelete.id));
        setSelectedTask(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('Error deleting task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    try {
      await sharepointService.updateTask(editingTask.id, editingTask);
      setTasks(prev => prev.map(task => 
        task.id === editingTask.id ? editingTask : task
      ));
      setIsEditing(false);
      setEditingTask(null);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const updatedTask = {
        ...task,
        status: newStatus
      };
      await sharepointService.updateTask(task.id, updatedTask);
      setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const filteredTasks = tasks?.filter(task => 
    task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleAddTag = () => {
    if (newTagName.trim()) {
      const newTag = {
        id: tags.length + 1,
        name: newTagName.trim().toLowerCase(),
        color: 'accent'
      };
      setTags([...tags, newTag]);
      setNewTagName('');
    }
  };

  const handleEditClick = (task) => {
    setSelectedTask(task);
    setEditingTask({ ...task });
    setIsEditing(true);
  };

  return (
    <div className={`sharepoint-container ${isExpanded ? 'expanded' : ''}`}>
      {isLoading ? (
        <div className="loading-spinner">Loading...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div className="sharepoint-header">
            <div className="header-main">
              <div className="header-left">
                <h2>Sharepoint</h2>
                <button onClick={() => setIsExpanded(!isExpanded)} className="expand-button">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              {isExpanded && (
                <div className="header-actions">
                  <div className="view-toggles">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`view-toggle ${viewMode === 'cards' ? 'active' : ''}`}
                      title="Card View"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                      <span className="tooltip">Card View</span>
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`view-toggle ${viewMode === 'table' ? 'active' : ''}`}
                      title="Table View"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                      </svg>
                      <span className="tooltip">Table View</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="create-task-button"
                    title="Create New Task"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Nueva Tarea</span>
                    <span className="tooltip">Create New Task</span>
                  </button>
                  <div className="notifications-container">
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="notifications-button"
                      title="Notifications"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                      {notifications.some(n => !n.read) && (
                        <span className="notification-badge"></span>
                      )}
                      <span className="tooltip">Notifications</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            {isExpanded && (
              <div className="search-section">
                <div className="search-container">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar tareas..."
                    className="search-input"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <div className="tags-container">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setSelectedTags(prev => 
                          prev.includes(tag.name) 
                            ? prev.filter(t => t !== tag.name)
                            : [...prev, tag.name]
                        );
                      }}
                      className={`tag ${selectedTags.includes(tag.name) ? 'selected' : ''}`}
                    >
                      #{tag.name}
                    </button>
                  ))}
                  <button onClick={handleAddTag} className="add-tag-button">
                    + Nueva etiqueta
                  </button>
                </div>
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="tasks-container custom-scrollbar">
              {viewMode === 'cards' ? (
                <div className="tasks-grid">
                  {filteredTasks.map((task, index) => (
                    <div 
                      key={index} 
                      className="task-card"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="task-card-header">
                        <h3>{task.title}</h3>
                        <div className="task-card-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(task);
                            }}
                            className="edit-button"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task);
                            }}
                            className="delete-button"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="task-card-content">
                        <div className="task-labels">
                          <span className="priority-label">{task.priority}</span>
                          <select
                            value={task.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChange(task, e.target.value);
                            }}
                            className="status-select"
                            onClick={e => e.stopPropagation()}
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="En Progreso">En Progreso</option>
                            <option value="Completado">Completado</option>
                          </select>
                        </div>
                        <div className="task-details">
                          {task.description && (
                            <div className="task-description">
                              <span className="detail-label">Description:</span>
                              <span className="detail-value">{task.description}</span>
                            </div>
                          )}
                          {task.assigned_to && (
                            <div className="task-assignee">
                              <span className="detail-label">Assigned to:</span>
                              <span className="detail-value">{task.assigned_to}</span>
                            </div>
                          )}
                          {task.due_date && (
                            <div className="task-due-date">
                              <span className="detail-label">Due date:</span>
                              <span className="detail-value">{task.due_date}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tasks-table-container">
                  <table className="tasks-table">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Prioridad</th>
                        <th>Estado</th>
                        <th>Asignado a</th>
                        <th>Fecha límite</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map((task, index) => (
                        <tr 
                          key={index}
                          onClick={() => handleTaskClick(task)}
                        >
                          <td>{task.title}</td>
                          <td>
                            <span className="priority-label">{task.priority}</span>
                          </td>
                          <td>
                            <select
                              value={task.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStatusChange(task, e.target.value);
                              }}
                              className="status-select"
                              onClick={e => e.stopPropagation()}
                            >
                              <option value="Pendiente">Pendiente</option>
                              <option value="En Progreso">En Progreso</option>
                              <option value="Completado">Completado</option>
                            </select>
                          </td>
                          <td>{task.assigned_to}</td>
                          <td>{task.due_date}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task);
                                }}
                                className="delete-button"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Task Creation Modal */}
          {isCreating && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Nueva Tarea</h3>
                  <button onClick={() => setIsCreating(false)} className="close-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div className="modal-content">
                  <div className="form-group">
                    <label>Título <span className="required">*</span></label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="form-input"
                      placeholder="Enter task title"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Prioridad</label>
                      <select
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                        className="form-select"
                      >
                        <option value="Baja">Baja</option>
                        <option value="Media">Media</option>
                        <option value="Alta">Alta</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Estado</label>
                      <select
                        value={newTask.status}
                        onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                        className="form-select"
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="En Progreso">En Progreso</option>
                        <option value="Completado">Completado</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Asignado a</label>
                    <input
                      type="text"
                      value={newTask.assigned_to}
                      onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                      className="form-input"
                      placeholder="Enter assignee name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha límite</label>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="form-textarea"
                      placeholder="Enter task description"
                      rows={4}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tags</label>
                    <div className="tags-input">
                      {tags.map(tag => (
                        <label key={tag.id} className="tag-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag.name)}
                            onChange={() => {
                              setSelectedTags(prev => 
                                prev.includes(tag.name)
                                  ? prev.filter(t => t !== tag.name)
                                  : [...prev, tag.name]
                              );
                            }}
                          />
                          <span className="tag-label">{tag.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    onClick={() => setIsCreating(false)} 
                    className="cancel-button"
                    disabled={isLoading}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreateTask} 
                    className="create-button"
                    disabled={isLoading || !newTask.title}
                  >
                    {isLoading ? 'Creating...' : 'Crear Tarea'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Task Edit Modal */}
          {isEditing && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="edit-title-input"
                  />
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditingTask(null);
                      setSelectedTask(null);
                    }}
                    className="close-button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div className="modal-content">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Prioridad</label>
                      <select
                        value={editingTask.priority}
                        onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                        className="form-select"
                      >
                        <option value="Baja">Baja</option>
                        <option value="Media">Media</option>
                        <option value="Alta">Alta</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Estado</label>
                      <select
                        value={editingTask.status}
                        onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                        className="form-select"
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="En Progreso">En Progreso</option>
                        <option value="Completado">Completado</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Asignado a</label>
                    <input
                      type="text"
                      value={editingTask.assigned_to || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, assigned_to: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha límite</label>
                    <input
                      type="date"
                      value={editingTask.due_date || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                      value={editingTask.description || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                      className="form-textarea"
                      rows={4}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditingTask(null);
                      setSelectedTask(null);
                    }}
                    className="cancel-button"
                  >
                    Cancelar
                  </button>
                  <button onClick={handleUpdateTask} className="save-button">
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

Sharepoint.propTypes = {
  currentUser: PropTypes.string
};

export default Sharepoint; 