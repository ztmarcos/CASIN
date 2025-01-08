import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

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

export default function Sharepoint({ currentUser }) {
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

  // Cargar tareas del localStorage
  useEffect(() => {
    const savedTasks = localStorage.getItem(`tasks_${currentUser}`);
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, [currentUser]);

  // Guardar tareas en localStorage cuando cambien
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
    <div className={`mb-4 bg-secondary rounded-lg border border-gray-700 shadow-sm overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[85vh]' : 'max-h-[60px]'} flex flex-col`}>
      <div className="p-3 border-b border-gray-700 sticky top-0 bg-secondary z-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg text-indigo-400 font-semibold">Sharepoint</h2>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-700 rounded transition-colors text-primary"
            >
              <svg
                className={`w-5 h-5 transform transition-transform ${
                  isExpanded ? 'rotate-0' : '-rotate-90'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {isExpanded && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'cards' 
                      ? 'bg-accent/20 text-accent' 
                      : 'hover:bg-gray-700 text-primary'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'table' 
                      ? 'bg-accent/20 text-accent' 
                      : 'hover:bg-gray-700 text-primary'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="px-3 py-1.5 bg-accent text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Tarea
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors relative text-primary"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notifications.some(n => !n.read) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full"></span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        {isExpanded && (
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar tareas..."
                className="w-full pl-9 pr-3 py-1.5 bg-secondary rounded-lg border border-gray-700 text-sm text-primary"
              />
              <svg
                className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-2">
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
                    className={`text-xs px-2 py-1 rounded-full transition-colors ${
                      selectedTags.includes(tag.name)
                        ? `bg-accent/20 text-accent border border-accent/30`
                        : 'bg-secondary text-primary border border-transparent hover:border-gray-600'
                    }`}
                  >
                    #{tag.name}
                  </button>
                ))}
                <button
                  onClick={() => {
                    if (newTagName.trim()) {
                      const newTag = {
                        id: tags.length + 1,
                        name: newTagName.trim().toLowerCase(),
                        color: 'accent'
                      };
                      setTags([...tags, newTag]);
                      setNewTagName('');
                    }
                  }}
                  className="text-xs px-2 py-1 rounded-full bg-secondary text-primary border border-transparent hover:border-gray-600"
                >
                  + Nueva etiqueta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-primary">
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTasks.map((task, index) => (
                <div 
                  key={index} 
                  className="bg-secondary rounded-lg border border-gray-700 p-3 hover:bg-gray-800 transition-colors cursor-pointer group relative"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium truncate mr-4 text-primary">{task.title}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(task);
                          }}
                          className="p-1 rounded-full bg-accent/10 text-accent hover:bg-accent/20"
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
                          className="p-1 rounded-full bg-danger/10 text-danger hover:bg-danger/20"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent whitespace-nowrap">
                          {task.subtitle1}
                        </span>
                        <select
                          value={task.subtitle2}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusChange(task, e.target.value);
                          }}
                          className="text-xs px-2 py-1 rounded-full bg-secondary text-primary cursor-pointer border-none focus:ring-0 whitespace-nowrap min-w-[100px]"
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="En Progreso">En Progreso</option>
                          <option value="Completado">Completado</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {task.fields.map((field, fieldIndex) => (
                      <div key={fieldIndex} className="flex items-center text-xs">
                        <span className="font-medium text-secondary">{field.label}:</span>
                        <span className="ml-1 text-primary">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--color-text-alt)' }}>Título</th>
                    <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--color-text-alt)' }}>Prioridad</th>
                    <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--color-text-alt)' }}>Estado</th>
                    <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--color-text-alt)' }}>Asignado a</th>
                    <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--color-text-alt)' }}>Fecha límite</th>
                    <th className="text-right py-2 px-3 text-sm font-medium" style={{ color: 'var(--color-text-alt)' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task, index) => (
                    <tr 
                      key={index}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <td className="py-2 px-3" style={{ color: 'var(--color-text)' }}>{task.title}</td>
                      <td className="py-2 px-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent">
                          {task.subtitle1}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={task.subtitle2}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusChange(task, e.target.value);
                          }}
                          className="text-xs px-2 py-1 rounded-full bg-secondary text-primary cursor-pointer border-none focus:ring-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="En Progreso">En Progreso</option>
                          <option value="Completado">Completado</option>
                        </select>
                      </td>
                      <td className="py-2 px-3" style={{ color: 'var(--color-text)' }}>
                        {task.fields.find(f => f.label === "Asignado a")?.value}
                      </td>
                      <td className="py-2 px-3" style={{ color: 'var(--color-text)' }}>
                        {task.fields.find(f => f.label === "Fecha límite")?.value}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task);
                            }}
                            className="p-1 rounded-full bg-danger/10 text-danger hover:bg-danger/20"
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

      {/* Modal Unificado de Detalle/Edición */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header fijo */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
              <input
                type="text"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                className="text-xl font-semibold bg-transparent border-none focus:ring-0 w-full"
                style={{ color: 'var(--color-text)' }}
              />
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingTask(null);
                  setSelectedTask(null);
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors ml-2"
              >
                <svg className="w-6 h-6" style={{ color: 'var(--color-text-alt)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-alt)' }}>
                      Prioridad
                    </label>
                    <select
                      value={editingTask.subtitle1}
                      onChange={(e) => setEditingTask({ ...editingTask, subtitle1: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-alt)' }}>
                      Estado
                    </label>
                    <select
                      value={editingTask.subtitle2}
                      onChange={(e) => setEditingTask({ ...editingTask, subtitle2: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Progreso">En Progreso</option>
                      <option value="Completado">Completado</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  {editingTask.fields.map((field, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-alt)' }}>
                        {field.label}
                      </label>
                      {field.label === "Descripción" ? (
                        <textarea
                          value={field.value}
                          onChange={(e) => {
                            const newFields = [...editingTask.fields];
                            newFields[index].value = e.target.value;
                            setEditingTask({ ...editingTask, fields: newFields });
                          }}
                          className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm h-24"
                          style={{ color: 'var(--color-text)' }}
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
                          className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                          style={{ color: 'var(--color-text)' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-alt)' }}>
                    Etiquetas
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          const taskTags = editingTask.tags || [];
                          setEditingTask({
                            ...editingTask,
                            tags: taskTags.includes(tag.name)
                              ? taskTags.filter(t => t !== tag.name)
                              : [...taskTags, tag.name]
                          });
                        }}
                        className={`text-xs px-2 py-1 rounded-full transition-colors ${
                          (editingTask.tags || []).includes(tag.name)
                            ? `bg-${tag.color}-500/20 text-${tag.color}-300 border border-${tag.color}-500/30`
                            : 'bg-gray-700/50 text-gray-400 border border-transparent hover:border-gray-600'
                        }`}
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-6 border-t border-gray-700 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      Progreso y Colaboradores
                    </h4>
                    <button className="text-xs hover:underline" style={{ color: 'var(--color-text-alt)' }}>
                      Gestionar accesos
                    </button>
                  </div>
                  
                  {/* Barra de progreso */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm" style={{ color: 'var(--color-text-alt)' }}>
                        Progreso general
                      </label>
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>75%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                        style={{ width: '75%' }}
                      ></div>
                    </div>
                  </div>

                  {/* Lista de subtareas */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500" checked />
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>Revisar documentación</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500" checked />
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>Actualizar diseños</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>Implementar cambios</span>
                    </div>
                    <button className="text-sm hover:underline mt-2" style={{ color: 'var(--color-text-alt)' }}>
                      + Agregar subtarea
                    </button>
                  </div>

                  {/* Colaboradores */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-text-alt)' }}>
                      Colaboradores
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {collaborators.map(collaborator => (
                        <div
                          key={collaborator.id}
                          className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-700/50 border border-gray-600"
                        >
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-300">{collaborator.avatar}</span>
                          </div>
                          <span className="text-sm" style={{ color: 'var(--color-text)' }}>{collaborator.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-600" style={{ color: 'var(--color-text-alt)' }}>
                            {collaborator.role}
                          </span>
                          <button className="p-1 hover:bg-gray-600/50 rounded">
                            <svg className="w-4 h-4" style={{ color: 'var(--color-text-alt)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button className="flex items-center gap-2 px-2 py-1 rounded-lg border border-dashed border-gray-600 hover:bg-gray-700/30 transition-colors">
                        <svg className="w-4 h-4" style={{ color: 'var(--color-text-alt)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm" style={{ color: 'var(--color-text-alt)' }}>Agregar colaborador</span>
                      </button>
                    </div>
                  </div>

                  {/* Historial de actividad */}
                  <div className="mt-4">
                    <label className="block text-sm mb-2" style={{ color: 'var(--color-text-alt)' }}>
                      Historial de actividad
                    </label>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-300">JP</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                            <span className="font-medium">Juan Pérez</span> actualizó el estado a &quot;En Progreso&quot;
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-alt)' }}>hace 1 hora</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-300">MG</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                            <span className="font-medium">María García</span> completó la subtarea &quot;Revisar documentación&quot;
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-alt)' }}>hace 2 horas</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat y Comentarios */}
                  <div className="mt-6 border-t border-gray-700 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        Chat y Comentarios
                      </h4>
                      <div className="flex items-center gap-2">
                        <button className="text-xs hover:underline" style={{ color: 'var(--color-text-alt)' }}>
                          Ver todo el historial
                        </button>
                      </div>
                    </div>

                    {/* Campo de nuevo mensaje */}
                    <div className="flex gap-3 mb-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-indigo-300">TU</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="relative">
                          <textarea
                            placeholder="Escribe un mensaje..."
                            className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 text-sm min-h-[80px]"
                            style={{ color: 'var(--color-text)' }}
                          />
                          <div className="absolute bottom-2 right-2 flex items-center gap-2">
                            <button className="p-1.5 hover:bg-gray-600/50 rounded" title="Adjuntar archivo">
                              <svg className="w-4 h-4" style={{ color: 'var(--color-text-alt)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                            </button>
                            <button className="p-1.5 hover:bg-gray-600/50 rounded" title="Mencionar usuario">
                              <svg className="w-4 h-4" style={{ color: 'var(--color-text-alt)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </button>
                            <button className="p-1.5 hover:bg-gray-600/50 rounded" title="Añadir emoji">
                              <svg className="w-4 h-4" style={{ color: 'var(--color-text-alt)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">
                              Enviar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lista de mensajes */}
                    <div className="space-y-3">
                      <div className="flex gap-3 p-3 rounded-lg bg-gray-700/50">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-300">JP</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Juan Pérez</span>
                            <span className="text-xs" style={{ color: 'var(--color-text-alt)' }}>hace 2 horas</span>
                          </div>
                          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                            @maria Necesito que revises los últimos cambios en esta tarea. #urgente
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300">
                              #urgente
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300">
                              @maria
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <button className="text-xs hover:underline" style={{ color: 'var(--color-text-alt)' }}>
                              Responder
                            </button>
                            <button className="text-xs hover:underline" style={{ color: 'var(--color-text-alt)' }}>
                              Reaccionar
                            </button>
                          </div>
                        </div>
                        <button className="p-1 hover:bg-gray-600/50 rounded h-fit">
                          <svg className="w-4 h-4" style={{ color: 'var(--color-text-alt)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-700 flex justify-end gap-3 flex-shrink-0">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingTask(null);
                    setSelectedTask(null);
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg"
                  style={{ color: 'var(--color-text-alt)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateTask}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Creación */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full m-4">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                Nueva Tarea
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <svg className="w-6 h-6" style={{ color: 'var(--color-text-alt)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-alt)' }}>
                    Título
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                    style={{ color: 'var(--color-text)' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-alt)' }}>
                      Prioridad
                    </label>
                    <select
                      value={newTask.subtitle1}
                      onChange={(e) => setNewTask({ ...newTask, subtitle1: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-alt)' }}>
                      Estado
                    </label>
                    <select
                      value={newTask.subtitle2}
                      onChange={(e) => setNewTask({ ...newTask, subtitle2: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Progreso">En Progreso</option>
                      <option value="Completado">Completado</option>
                    </select>
                  </div>
                </div>
                {newTask.fields.map((field, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-alt)' }}>
                      {field.label}
                    </label>
                    {field.label === "Descripción" ? (
                      <textarea
                        value={field.value}
                        onChange={(e) => {
                          const newFields = [...newTask.fields];
                          newFields[index].value = e.target.value;
                          setNewTask({ ...newTask, fields: newFields });
                        }}
                        className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm h-24"
                        style={{ color: 'var(--color-text)' }}
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
                        className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                        style={{ color: 'var(--color-text)' }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg"
                  style={{ color: 'var(--color-text-alt)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Crear Tarea
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Sharepoint.propTypes = {
  currentUser: PropTypes.string.isRequired
}; 