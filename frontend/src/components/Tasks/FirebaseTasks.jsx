import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useTeam } from '../../context/TeamContext';
import firebaseTaskService from '../../services/firebaseTaskService';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import './FirebaseTasks.css';

const FirebaseTasks = () => {
  const { theme } = useTheme();
  const { userTeam } = useTeam();
  const isDark = theme === 'dark';
  
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Estados para filtros y modal
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Cargar tareas al montar el componente
  useEffect(() => {
    if (userTeam) {
      loadTasks();
      loadStats();
    }
  }, [userTeam]);

  // Filtrar tareas cuando cambien los filtros
  useEffect(() => {
    filterTasks();
  }, [tasks, statusFilter, priorityFilter, searchTerm]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const taskList = await firebaseTaskService.getAllTasks();
      setTasks(taskList);
      
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Error al cargar las tareas');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const taskStats = await firebaseTaskService.getTaskStats();
      setStats(taskStats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    // Filtrar por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Filtrar por prioridad
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(term) ||
        task.description.toLowerCase().includes(term) ||
        task.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    setFilteredTasks(filtered);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowModal(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
      try {
        await firebaseTaskService.deleteTask(taskId);
        await loadTasks();
        await loadStats();
      } catch (err) {
        console.error('Error deleting task:', err);
        alert('Error al eliminar la tarea');
      }
    }
  };

  const handleTaskSave = async (taskData) => {
    try {
      if (editingTask) {
        await firebaseTaskService.updateTask(editingTask.id, taskData);
      } else {
        await firebaseTaskService.createTask(taskData);
      }
      
      setShowModal(false);
      setEditingTask(null);
      await loadTasks();
      await loadStats();
      
    } catch (err) {
      console.error('Error saving task:', err);
      alert('Error al guardar la tarea');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await firebaseTaskService.updateTask(taskId, { status: newStatus });
      await loadTasks();
      await loadStats();
    } catch (err) {
      console.error('Error updating task status:', err);
      alert('Error al actualizar el estado de la tarea');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'in_progress': return '#3498db';
      case 'completed': return '#27ae60';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="firebase-tasks-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando tareas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="firebase-tasks-container">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={loadTasks} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`firebase-tasks-container ${isDark ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="tasks-header">
        <div className="header-left">
          <h1>Tareas del Equipo</h1>
          <p>{userTeam?.name || 'Equipo Actual'}</p>
        </div>
        <button 
          className="create-task-btn"
          onClick={handleCreateTask}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Nueva Tarea
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{color: getStatusColor('pending')}}>{stats.pending}</div>
            <div className="stat-label">Pendientes</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{color: getStatusColor('in_progress')}}>{stats.inProgress}</div>
            <div className="stat-label">En Progreso</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{color: getStatusColor('completed')}}>{stats.completed}</div>
            <div className="stat-label">Completadas</div>
          </div>
          {stats.overdue > 0 && (
            <div className="stat-card">
              <div className="stat-number" style={{color: '#e74c3c'}}>{stats.overdue}</div>
              <div className="stat-label">Vencidas</div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="filters-row">
        <div className="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="in_progress">En Progreso</option>
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
        </select>

        <select 
          value={priorityFilter} 
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">Todas las prioridades</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
      </div>

      {/* Tasks Grid */}
      <div className="tasks-grid">
        {filteredTasks.length === 0 ? (
          <div className="no-tasks">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            <p>No hay tareas que mostrar</p>
            <button onClick={handleCreateTask} className="create-first-task-btn">
              Crear primera tarea
            </button>
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              isDark={isDark}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          onSave={handleTaskSave}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
          isDark={isDark}
        />
      )}
    </div>
  );
};

export default FirebaseTasks; 