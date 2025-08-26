import { API_URL } from '../config/api.js';
import { getSenderOptions } from '../config/users.js';

class TaskEmailService {
  constructor() {
    this.apiUrl = `${API_URL}/email`;
    this.defaultSender = getSenderOptions()[0]; // CASIN Seguros por defecto
  }

  /**
   * Envía notificación cuando se crea una nueva tarea
   */
  async notifyTaskCreated(taskData, participants) {
    try {
      console.log('📧 Enviando notificación de tarea creada:', taskData.title);
      
      const emailData = {
        type: 'task_created',
        task: taskData,
        participants: participants,
        sender: this.defaultSender
      };

      await this.sendTaskNotification(emailData);
    } catch (error) {
      console.error('Error enviando notificación de tarea creada:', error);
    }
  }

  /**
   * Envía notificación cuando se actualiza una tarea
   */
  async notifyTaskUpdated(oldTask, newTask, participants, changes) {
    try {
      console.log('📧 Enviando notificación de tarea actualizada:', newTask.title);
      
      const emailData = {
        type: 'task_updated',
        oldTask: oldTask,
        newTask: newTask,
        participants: participants,
        changes: changes,
        sender: this.defaultSender
      };

      await this.sendTaskNotification(emailData);
    } catch (error) {
      console.error('Error enviando notificación de tarea actualizada:', error);
    }
  }

  /**
   * Envía notificación cuando se agrega un comentario
   */
  async notifyCommentAdded(taskData, comment, participants, commentAuthor) {
    try {
      console.log('📧 Enviando notificación de comentario agregado:', taskData.title);
      
      const emailData = {
        type: 'comment_added',
        task: taskData,
        comment: comment,
        participants: participants,
        commentAuthor: commentAuthor,
        sender: this.defaultSender
      };

      await this.sendTaskNotification(emailData);
    } catch (error) {
      console.error('Error enviando notificación de comentario:', error);
    }
  }

  /**
   * Envía notificación cuando se asigna la tarea a nuevos usuarios
   */
  async notifyTaskAssigned(taskData, newAssignees, assigner) {
    try {
      console.log('📧 Enviando notificación de tarea asignada:', taskData.title);
      
      const emailData = {
        type: 'task_assigned',
        task: taskData,
        newAssignees: newAssignees,
        assigner: assigner,
        sender: this.defaultSender
      };

      await this.sendTaskNotification(emailData);
    } catch (error) {
      console.error('Error enviando notificación de asignación:', error);
    }
  }

  /**
   * Método principal para enviar notificaciones
   */
  async sendTaskNotification(emailData) {
    try {
      const response = await fetch(`${this.apiUrl}/send-task-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar notificación');
      }

      const result = await response.json();
      console.log('✅ Notificación enviada exitosamente:', result);
      return result;
    } catch (error) {
      console.error('❌ Error enviando notificación por email:', error);
      throw error;
    }
  }

  /**
   * Obtiene los participantes únicos de una tarea
   */
  getTaskParticipants(taskData) {
    const participants = new Set();
    
    // Agregar creador de la tarea
    if (taskData.createdByUser?.email) {
      participants.add(taskData.createdByUser.email);
    }

    // Agregar usuarios asignados
    if (taskData.assignedUsers && Array.isArray(taskData.assignedUsers)) {
      taskData.assignedUsers.forEach(user => {
        if (user.email) {
          participants.add(user.email);
        }
      });
    }

    // Agregar autores de comentarios
    if (taskData.comments && Array.isArray(taskData.comments)) {
      taskData.comments.forEach(comment => {
        if (comment.authorEmail) {
          participants.add(comment.authorEmail);
        }
      });
    }

    return Array.from(participants);
  }

  /**
   * Filtra participantes para excluir el autor de la acción
   */
  filterParticipants(participants, excludeEmail) {
    return participants.filter(email => email !== excludeEmail);
  }

  /**
   * Detecta cambios entre versiones de tarea
   */
  detectTaskChanges(oldTask, newTask) {
    const changes = [];

    if (oldTask.status !== newTask.status) {
      changes.push({
        field: 'Estado',
        oldValue: this.getStatusText(oldTask.status),
        newValue: this.getStatusText(newTask.status)
      });
    }

    if (oldTask.priority !== newTask.priority) {
      changes.push({
        field: 'Prioridad',
        oldValue: this.getPriorityText(oldTask.priority),
        newValue: this.getPriorityText(newTask.priority)
      });
    }

    if (oldTask.assignedTo !== newTask.assignedTo) {
      changes.push({
        field: 'Asignado a',
        oldValue: oldTask.assignedTo || 'Sin asignar',
        newValue: newTask.assignedTo || 'Sin asignar'
      });
    }

    if (oldTask.dueDate !== newTask.dueDate) {
      changes.push({
        field: 'Fecha límite',
        oldValue: oldTask.dueDate ? new Date(oldTask.dueDate).toLocaleDateString() : 'Sin fecha',
        newValue: newTask.dueDate ? new Date(newTask.dueDate).toLocaleDateString() : 'Sin fecha'
      });
    }

    return changes;
  }

  getStatusText(status) {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return 'Pendiente';
    }
  }

  getPriorityText(priority) {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return 'Media';
    }
  }
}

export default new TaskEmailService();


