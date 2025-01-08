import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Sharepoint.css';

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
    subtitle1: "Media",
    subtitle1Label: "Prioridad",
    subtitle2: "Pendiente",
    subtitle2Label: "Estado",
    fields: [
      { label: "Asignado a", value: "" },
      { label: "Fecha límite", value: "" },
      { label: "Descripción", value: "" }
    ]
  });

  const [tasks, setTasks] = useState([
    {
      title: "Ejemplo de Tarea",
      subtitle1: "Alta",
      subtitle1Label: "Prioridad",
      subtitle2: "En Progreso",
      subtitle2Label: "Estado",
      fields: [
        { label: "Asignado a", value: "Juan Pérez" },
        { label: "Fecha límite", value: "2024-02-01" },
        { label: "Descripción", value: "Esta es una tarea de ejemplo para mostrar el formato" }
      ]
    }
  ]);

  const [tags, setTags] = useState([
    { id: 1, name: 'urgente', color: 'red' },
    { id: 2, name: 'proyecto', color: 'blue' },
    { id: 3, name: 'reunión', color: 'green' },
    { id: 4, name: 'documentación', color: 'purple' }
  ]);

  const [selectedTags, setSelectedTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'reminder',
      title: 'Tarea próxima a vencer',
      message: 'La tarea "Ejemplo de Tarea" vence mañana',
      time: '2024-02-01',
      read: false
    },
    {
      id: 2,
      type: 'mention',
      title: '@maria te mencionó',
      message: 'Necesito que revises los últimos cambios en esta tarea',
      time: '2024-01-31',
      read: true
    }
  ]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [collaborators] = useState([
    { id: 1, name: 'Juan Pérez', avatar: 'JP', role: 'editor' },
    { id: 2, name: 'María García', avatar: 'MG', role: 'viewer' },
    { id: 3, name: 'Carlos López', avatar: 'CL', role: 'editor' }
  ]);

  useEffect(() => {
    const savedTasks = localStorage.getItem(`tasks_${currentUser}`);
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(`tasks_${currentUser}`, JSON.stringify(tasks));
  }, [tasks, currentUser]);

  const handleTaskClick = (task) => {
    setSelectedTask({ ...task });
    setEditingTask({ ...task });
    setIsEditing(true);
  };

  const handleCreateTask = () => {
    setTasks(prev => [...prev, { ...newTask }]);
    setIsCreating(false);
    setNewTask({
      title: "",
      subtitle1: "Media",
      subtitle1Label: "Prioridad",
      subtitle2: "Pendiente",
      subtitle2Label: "Estado",
      fields: [
        { label: "Asignado a", value: "" },
        { label: "Fecha límite", value: "" },
        { label: "Descripción", value: "" }
      ]
    });
  };

  const handleDeleteTask = (taskToDelete) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
      setTasks(prev => prev.filter(task => task !== taskToDelete));
      setSelectedTask(null);
    }
  };

  const handleUpdateTask = () => {
    setTasks(prev => prev.map(task => 
      task === selectedTask ? editingTask : task
    ));
    setIsEditing(false);
    setEditingTask(null);
    setSelectedTask(null);
  };

  const handleStatusChange = (task, newStatus) => {
    const updatedTask = {
      ...task,
      subtitle2: newStatus
    };
    setTasks(prev => prev.map(t => t === task ? updatedTask : t));
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.fields.some(field => field.value.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      <div className="sharepoint-header">
        <div className="header-main">
          <div className="header-left">
            <h2>Sharepoint</h2>
            <button onClick={() => setIsExpanded(!isExpanded)} className="expand-button">
              <svg
                className={`expand-icon ${isExpanded ? '' : 'collapsed'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {isExpanded && (
            <div className="header-actions">
              <div className="view-toggles">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`view-toggle ${viewMode === 'cards' ? 'active' : ''}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`view-toggle ${viewMode === 'table' ? 'active' : ''}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="create-task-button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Tarea
              </button>
              <div className="notifications-container">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="notifications-button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notifications.some(n => !n.read) && (
                    <span className="notification-badge"></span>
                  )}
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
              <svg
                className="search-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task);
                        }}
                        className="delete-button"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="task-card-content">
                    <div className="task-labels">
                      <span className="priority-label">{task.subtitle1}</span>
                      <select
                        value={task.subtitle2}
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
                    <div className="task-fields">
                      {task.fields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="task-field">
                          <span className="field-label">{field.label}:</span>
                          <span className="field-value">{field.value}</span>
                        </div>
                      ))}
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
                        <span className="priority-label">{task.subtitle1}</span>
                      </td>
                      <td>
                        <select
                          value={task.subtitle2}
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
                      <td>{task.fields.find(f => f.label === "Asignado a")?.value}</td>
                      <td>{task.fields.find(f => f.label === "Fecha límite")?.value}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task);
                            }}
                            className="delete-button"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Título</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Prioridad</label>
                  <select
                    value={newTask.subtitle1}
                    onChange={(e) => setNewTask({ ...newTask, subtitle1: e.target.value })}
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
                    value={newTask.subtitle2}
                    onChange={(e) => setNewTask({ ...newTask, subtitle2: e.target.value })}
                    className="form-select"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>
              </div>
              {newTask.fields.map((field, index) => (
                <div key={index} className="form-group">
                  <label>{field.label}</label>
                  {field.label === "Descripción" ? (
                    <textarea
                      value={field.value}
                      onChange={(e) => {
                        const newFields = [...newTask.fields];
                        newFields[index].value = e.target.value;
                        setNewTask({ ...newTask, fields: newFields });
                      }}
                      className="form-textarea"
                    />
                  ) : (
                    <input
                      type={field.label === "Fecha límite" ? "date" : "text"}
                      value={field.value}
                      onChange={(e) => {
                        const newFields = [...newTask.fields];
                        newFields[index].value = e.target.value;
                        setNewTask({ ...newTask, fields: newFields });
                      }}
                      className="form-input"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsCreating(false)} className="cancel-button">
                Cancelar
              </button>
              <button onClick={handleCreateTask} className="create-button">
                Crear Tarea
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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Prioridad</label>
                  <select
                    value={editingTask.subtitle1}
                    onChange={(e) => setEditingTask({ ...editingTask, subtitle1: e.target.value })}
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
                    value={editingTask.subtitle2}
                    onChange={(e) => setEditingTask({ ...editingTask, subtitle2: e.target.value })}
                    className="form-select"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>
              </div>
              {editingTask.fields.map((field, index) => (
                <div key={index} className="form-group">
                  <label>{field.label}</label>
                  {field.label === "Descripción" ? (
                    <textarea
                      value={field.value}
                      onChange={(e) => {
                        const newFields = [...editingTask.fields];
                        newFields[index].value = e.target.value;
                        setEditingTask({ ...editingTask, fields: newFields });
                      }}
                      className="form-textarea"
                    />
                  ) : (
                    <input
                      type={field.label === "Fecha límite" ? "date" : "text"}
                      value={field.value}
                      onChange={(e) => {
                        const newFields = [...editingTask.fields];
                        newFields[index].value = e.target.value;
                        setEditingTask({ ...editingTask, fields: newFields });
                      }}
                      className="form-input"
                    />
                  )}
                </div>
              ))}
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
    </div>
  );
};

Sharepoint.propTypes = {
  currentUser: PropTypes.string
};

export default Sharepoint; 