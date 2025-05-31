const mysqlDatabase = require('./mysqlDatabase');

class SharepointService {
    async getTasks(userId, filters = {}) {
        try {
            let query = 'SELECT * FROM sharepoint_tasks WHERE created_by = ?';
            const values = [userId];

            if (filters.status) {
                query += ' AND status = ?';
                values.push(filters.status);
            }
            if (filters.priority) {
                query += ' AND priority = ?';
                values.push(filters.priority);
            }

            query += ' ORDER BY created_at DESC';
            
            const tasks = await mysqlDatabase.executeQuery(query, values);
            return tasks || [];
        } catch (error) {
            console.error('Error getting tasks:', error);
            throw error;
        }
    }

    async createTask(taskData) {
        try {
            // Convert tags array to string if present
            if (taskData.tags && Array.isArray(taskData.tags)) {
                taskData.tags = taskData.tags.join(',');
            }

            // Format the date or set to null
            if (taskData.due_date) {
                // Ensure the date is in YYYY-MM-DD format
                const date = new Date(taskData.due_date);
                if (isNaN(date.getTime())) {
                    taskData.due_date = null;
                } else {
                    taskData.due_date = date.toISOString().split('T')[0];
                }
            } else {
                taskData.due_date = null;
            }

            const result = await mysqlDatabase.insertData('sharepoint_tasks', {
                title: taskData.title,
                priority: taskData.priority || 'Media',
                status: taskData.status || 'Pendiente',
                assigned_to: taskData.assigned_to || null,
                due_date: taskData.due_date,
                description: taskData.description || null,
                created_by: taskData.created_by,
                tags: taskData.tags || null
            });

            if (result.success && result.data) {
                return result.data;
            }
            throw new Error('Failed to create task');
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    async updateTask(taskId, taskData) {
        try {
            // Convert tags array to string if present
            if (taskData.tags && Array.isArray(taskData.tags)) {
                taskData.tags = taskData.tags.join(',');
            }

            // Format the date or set to null
            if (taskData.due_date) {
                // Ensure the date is in YYYY-MM-DD format
                const date = new Date(taskData.due_date);
                if (isNaN(date.getTime())) {
                    taskData.due_date = null;
                } else {
                    taskData.due_date = date.toISOString().split('T')[0];
                }
            } else {
                taskData.due_date = null;
            }

            await mysqlDatabase.executeQuery(
                'UPDATE sharepoint_tasks SET ? WHERE id = ?',
                [taskData, taskId]
            );

            return await this.getTaskById(taskId);
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    async deleteTask(taskId) {
        try {
            return await mysqlDatabase.executeQuery(
                'DELETE FROM sharepoint_tasks WHERE id = ?',
                [taskId]
            );
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    async getTaskById(taskId) {
        try {
            const [task] = await mysqlDatabase.executeQuery(
                'SELECT * FROM sharepoint_tasks WHERE id = ?',
                [taskId]
            );
            return task;
        } catch (error) {
            console.error('Error getting task by id:', error);
            throw error;
        }
    }
}

module.exports = new SharepointService(); 