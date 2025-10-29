import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useTeam } from '../../context/TeamContext';
import { useAuth } from '../../context/AuthContext';
import actividadService from '../../services/actividadService';
import taskEmailService from '../../services/taskEmailService';
import TaskCard from './TaskCard';
import ActivityModal from './ActivityModal';
import './Actividad.css';

const Actividad = () => {
  const { theme } = useTheme();
  const { userTeam } = useTeam();
  const { user } = useAuth();
  const isDark = theme === 'dark';
  
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  
  // Estados para vista de usuarios
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  
  // Estados para filtros y modal
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  // Lista de usuarios predefinidos
  const teamUsers = [
    { name: 'Lore', email: 'lore@casin.com', initials: 'L' },
    { name: 'Mich', email: 'mich@casin.com', initials: 'M' },
    { name: 'Marcos', email: 'marcos@casin.com', initials: 'MA' },
    { name: 'MarcosJr', email: 'marcosjr@casin.com', initials: 'MJ' }
  ];

  // Cargar todas las tareas al inicio
  useEffect(() => {
    if (userTeam) {
      loadTasks();
    }
  }, [userTeam]);

  // Filtrar actividades del usuario seleccionado cuando cambian las tareas o el usuario
  useEffect(() => {
    if (selectedUser && tasks.length > 0) {
      filterUserActivities();
    }
  }, [tasks, selectedUser]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const taskList = await actividadService.getAllTasks();
      setTasks(taskList);
      
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Error al cargar las actividades');
    } finally {
      setLoading(false);
    }
  };



  const filterUserActivities = () => {
    if (!selectedUser) return;
    
    console.log('🔍 Filtering activities for user:', selectedUser.name);
    console.log('📊 Total tasks:', tasks.length);
    
    // Filtrar tareas del usuario seleccionado por nombre
    const filtered = tasks.filter(task => 
      task.userName === selectedUser.name || 
      task.createdBy === selectedUser.name
    );
    
    console.log('✅ Filtered activities:', filtered.length);
    setUserActivities(filtered);
    setLoading(false);
  };

  const handleUserSelect = (userObj) => {
    console.log('👤 Selected user:', userObj);
    setSelectedUser(userObj);
    setUserActivities([]);
  };

  const handleBackToUsers = () => {
    console.log('⬅️ Back to users list');
    setSelectedUser(null);
    setUserActivities([]);
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
    if (window.confirm('¿Estás seguro de que quieres eliminar esta actividad?')) {
      try {
        await actividadService.deleteTask(taskId);
        
        // Remove from local state immediately
        setUserActivities(prevActivities => 
          prevActivities.filter(task => task.id !== taskId)
        );
        
        await loadTasks();
      } catch (err) {
        console.error('Error deleting task:', err);
        alert('Error al eliminar la actividad');
      }
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      console.log(`🔄 Changing status of task ${taskId} to ${newStatus}`);
      await actividadService.updateTask(taskId, { status: newStatus });
      
      // Update local state immediately for better UX
      setUserActivities(prevActivities => 
        prevActivities.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
      
      // Reload all tasks to sync
      await loadTasks();
      console.log('✅ Status updated successfully');
    } catch (err) {
      console.error('❌ Error updating task status:', err);
      alert('Error al actualizar el estado de la actividad');
    }
  };

  const handleStatusCycle = async (taskId, currentStatus) => {
    // Cycle: pending -> in_progress -> completed -> pending
    let newStatus;
    switch (currentStatus) {
      case 'pending':
        newStatus = 'in_progress';
        break;
      case 'in_progress':
        newStatus = 'completed';
        break;
      case 'completed':
      case 'cancelled':
        newStatus = 'pending';
        break;
      default:
        newStatus = 'pending';
    }
    await handleStatusChange(taskId, newStatus);
  };

  const handleTaskSave = async (taskData) => {
    try {
      let savedTask;
      
      if (editingTask) {
        // Actualizar tarea existente
        savedTask = await actividadService.updateTask(editingTask.id, taskData);
        
        // Detectar cambios y enviar notificaciones
        const participants = taskEmailService.getTaskParticipants(taskData);
        const filteredParticipants = taskEmailService.filterParticipants(participants, user?.email);
        
        if (filteredParticipants.length > 0) {
          const changes = taskEmailService.detectTaskChanges(editingTask, taskData);
          if (changes.length > 0) {
            try {
              await taskEmailService.notifyTaskUpdated(editingTask, taskData, filteredParticipants, changes);
              console.log('✅ Notificaciones de actualización enviadas');
            } catch (emailError) {
              console.warn('⚠️ Error enviando notificaciones:', emailError);
            }
          }
        }
      } else {
        // Crear nueva tarea
        savedTask = await actividadService.createTask(taskData);
        
        // Enviar notificaciones de creación
        const participants = taskEmailService.getTaskParticipants(taskData);
        
        // Para tareas nuevas, solo filtrar si hay otros participantes además del creador
        // Si el creador se asigna a sí mismo, debe recibir la notificación
        const filteredParticipants = participants.length > 1 
          ? taskEmailService.filterParticipants(participants, user?.email)
          : participants; // Si solo hay un participante (el creador), no filtrar
        
        if (filteredParticipants.length > 0) {
          try {
            await taskEmailService.notifyTaskCreated(taskData, filteredParticipants);
            console.log('✅ Notificaciones de creación enviadas');
          } catch (emailError) {
            console.warn('⚠️ Error enviando notificaciones:', emailError);
          }
        } else {
          console.log('ℹ️ No hay participantes para notificar después del filtrado');
        }
      }
      
      setShowModal(false);
      setEditingTask(null);
      await loadTasks();
      
    } catch (err) {
      console.error('Error saving task:', err);
      alert('Error al guardar la actividad');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#666666';
      case 'in_progress': return '#000000';
      case 'completed': return '#333333';
      case 'cancelled': return '#999999';
      default: return '#cccccc';
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

  // Vista de selección de usuarios
  if (!selectedUser) {
    if (loading) {
      return (
        <div className="firebase-tasks-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Cargando...</p>
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
        <div className="tasks-header">
          <div className="header-left">
            <h1>Actividad del Equipo</h1>
            <p>Selecciona un usuario para ver sus actividades</p>
          </div>
        </div>

        <div className="users-grid">
          {teamUsers.map((userObj) => (
            <div 
              key={userObj.email}
              className="user-card"
              onClick={() => handleUserSelect(userObj)}
            >
              <div className="user-avatar">
                {userObj.initials}
              </div>
              <div className="user-info-card">
                <h3>{userObj.name}</h3>
                <p>{userObj.email}</p>
              </div>
              <div className="arrow-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Vista de actividades del usuario seleccionado
  return (
    <div className={`firebase-tasks-container ${isDark ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="tasks-header">
        <div className="header-left">
          <button className="back-button" onClick={handleBackToUsers}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>
          <div>
            <h1>Actividades de {selectedUser.name}</h1>
            <p>{selectedUser.email}</p>
          </div>
        </div>
        <button 
          className="create-task-btn"
          onClick={handleCreateTask}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Nueva Actividad
        </button>
      </div>



      {/* Loading State */}
      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando actividades de {selectedUser.name}...</p>
        </div>
      )}

      {/* Activities List */}
      {!loading && (
        <div className="activities-list">
          {userActivities.length === 0 ? (
            <div className="no-activities">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              <p>{selectedUser.name} no tiene actividades registradas</p>
              <button onClick={handleCreateTask} className="create-first-activity-btn">
                Crear primera actividad
              </button>
            </div>
          ) : (
            userActivities.map(task => (
              <div key={task.id} className={`activity-item status-${task.status || 'pending'}`}>
                <div className="activity-status-section">
                  <button 
                    className={`status-badge status-${task.status || 'pending'}`}
                    onClick={() => handleStatusCycle(task.id, task.status)}
                    title="Clic para cambiar estado"
                  >
                    {getStatusText(task.status || 'pending')}
                  </button>
                  <div className="activity-date-badge">
                    {new Date(task.createdAt).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                <div className="activity-content">
                  <h3>{task.title}</h3>
                  {task.description && task.description !== task.title && (
                    <p>{task.description}</p>
                  )}
                </div>
                <button 
                  className="activity-edit-btn"
                  onClick={() => handleEditTask(task)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ActivityModal
          activity={editingTask}
          onSave={handleTaskSave}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
};

export default Actividad; 