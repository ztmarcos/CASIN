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
      console.log('📧 Participantes encontrados:', participants);
      console.log('📧 Datos de la tarea:', taskData);
      
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
        task: newTask, // El backend espera 'task', no 'newTask'
        oldTask: oldTask,
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
      
      // Obtener usuarios mencionados en el comentario
      const mentionedUsers = this.getMentionedUsers(comment);
      console.log('👥 Usuarios mencionados:', mentionedUsers);
      
      // Combinar participantes regulares con usuarios mencionados
      const allParticipants = [...new Set([...participants, ...mentionedUsers])];
      console.log('📧 Todos los participantes (incluyendo mencionados):', allParticipants);
      
      const emailData = {
        type: 'comment_added',
        task: taskData,
        comment: comment,
        participants: allParticipants,
        commentAuthor: commentAuthor,
        mentionedUsers: mentionedUsers, // Agregar usuarios mencionados específicamente
        sender: this.defaultSender
      };

      await this.sendTaskNotification(emailData);
      
      // Si el comentario es de un admin (z.t.marcos), enviar notificación especial a casinseguros
      if (commentAuthor?.email === 'z.t.marcos@gmail.com') {
        await this.notifyAdminCommentToCasin(taskData, comment, commentAuthor);
      }
    } catch (error) {
      console.error('Error enviando notificación de comentario:', error);
    }
  }

  /**
   * Envía notificación especial cuando un admin (z.t.marcos) agrega un comentario
   * Esta notificación va directamente a casinseguros@gmail.com
   */
  async notifyAdminCommentToCasin(taskData, comment, commentAuthor) {
    try {
      console.log('📧 Enviando notificación de comentario de admin a CASIN:', taskData.title);
      
      const emailData = {
        type: 'admin_comment',
        task: taskData,
        comment: comment,
        participants: ['casinseguros@gmail.com'], // Solo a casinseguros
        commentAuthor: commentAuthor,
        sender: this.defaultSender
      };

      await this.sendTaskNotification(emailData);
      console.log('✅ Notificación de comentario de admin enviada a CASIN');
    } catch (error) {
      console.error('Error enviando notificación de comentario de admin:', error);
    }
  }

  /**
   * Obtiene los usuarios mencionados en un comentario
   */
  getMentionedUsers(comment) {
    const mentionedUsers = [];
    
    if (comment.mentions && Array.isArray(comment.mentions)) {
      comment.mentions.forEach(mention => {
        if (mention.email) {
          mentionedUsers.push(mention.email);
        }
      });
    }
    
    // También buscar menciones en el texto del comentario como respaldo
    if (comment.text) {
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(comment.text)) !== null) {
        // Aquí podrías buscar en una lista de usuarios del equipo
        // Por ahora, solo agregamos el patrón encontrado
        console.log('🔍 Mención encontrada en texto:', match[1]);
      }
    }
    
    return mentionedUsers;
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
   * Envía notificación específica a usuarios mencionados
   */
  async notifyMentionedUsers(taskData, comment, mentionedUsers, commentAuthor) {
    try {
      if (mentionedUsers.length === 0) {
        console.log('📧 No hay usuarios mencionados para notificar');
        return;
      }

      console.log('📧 Enviando notificación a usuarios mencionados:', mentionedUsers);
      
      const emailData = {
        type: 'user_mentioned',
        task: taskData,
        comment: comment,
        participants: mentionedUsers,
        commentAuthor: commentAuthor,
        mentionedUsers: mentionedUsers,
        sender: this.defaultSender
      };

      await this.sendTaskNotification(emailData);
    } catch (error) {
      console.error('Error enviando notificación a usuarios mencionados:', error);
    }
  }

  /**
   * Envía notificación cuando se agrega una respuesta a un comentario
   */
  async notifyReplyAdded(taskData, parentComment, reply, participants, replyAuthor) {
    try {
      console.log('📧 Enviando notificación de respuesta agregada');
      
      // Obtener usuarios mencionados en la respuesta
      const mentionedUsers = this.getMentionedUsers(reply);
      
      // Incluir al autor del comentario padre y usuarios mencionados
      const allParticipants = [...new Set([
        ...participants,
        ...mentionedUsers,
        parentComment.authorEmail // Notificar al autor del comentario padre
      ])];
      
      const emailData = {
        type: 'reply_added',
        task: taskData,
        parentComment: parentComment,
        reply: reply,
        participants: allParticipants,
        replyAuthor: replyAuthor,
        mentionedUsers: mentionedUsers,
        sender: this.defaultSender
      };

      await this.sendTaskNotification(emailData);
    } catch (error) {
      console.error('Error enviando notificación de respuesta:', error);
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
    console.log('🔍 getTaskParticipants - taskData recibida:', taskData);
    const participants = new Set();
    
    // Agregar creador de la tarea
    if (taskData.createdByUser?.email) {
      console.log('✅ Agregando creador:', taskData.createdByUser.email);
      participants.add(taskData.createdByUser.email);
    }

    // Agregar usuarios asignados
    if (taskData.assignedUsers && Array.isArray(taskData.assignedUsers)) {
      console.log('✅ Usuarios asignados encontrados:', taskData.assignedUsers);
      taskData.assignedUsers.forEach(user => {
        if (user.email) {
          console.log('✅ Agregando usuario asignado:', user.email);
          participants.add(user.email);
        }
      });
    } else {
      console.log('❌ No se encontraron assignedUsers o no es array:', taskData.assignedUsers);
    }

    // Agregar autores de comentarios
    if (taskData.comments && Array.isArray(taskData.comments)) {
      taskData.comments.forEach(comment => {
        if (comment.authorEmail) {
          participants.add(comment.authorEmail);
        }
      });
    }

    const finalParticipants = Array.from(participants);
    console.log('🎯 Participantes finales:', finalParticipants);
    return finalParticipants;
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



