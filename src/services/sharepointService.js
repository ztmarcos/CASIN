import axios from 'axios';
import { API_URL } from '../config/api.js';

const API_BASE_URL = API_URL.replace('/api', '/api/sharepoint');

export const sharepointService = {
    // Task operations
    async getTasks(userId, filters = {}) {
        const response = await axios.get(`${API_BASE_URL}/tasks`, {
            params: { userId, ...filters }
        });
        return response.data;
    },

    async createTask(taskData) {
        const response = await axios.post(`${API_BASE_URL}/tasks`, taskData);
        return response.data;
    },

    async updateTask(taskId, taskData) {
        const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}`, taskData);
        return response.data;
    },

    async deleteTask(taskId) {
        const response = await axios.delete(`${API_BASE_URL}/tasks/${taskId}`);
        return response.data;
    },

    // Tag operations
    async getTags() {
        const response = await axios.get(`${API_BASE_URL}/tags`);
        return response.data;
    },

    // Notification operations
    async getNotifications(userId) {
        const response = await axios.get(`${API_BASE_URL}/notifications/${userId}`);
        return response.data;
    },

    async markNotificationAsRead(notificationId) {
        const response = await axios.put(`${API_BASE_URL}/notifications/${notificationId}/read`);
        return response.data;
    },

    // Collaborator operations
    async getCollaborators() {
        const response = await axios.get(`${API_BASE_URL}/collaborators`);
        return response.data;
    },

    async addCollaborator(collaboratorData) {
        const response = await axios.post(`${API_BASE_URL}/collaborators`, collaboratorData);
        return response.data;
    }
}; 