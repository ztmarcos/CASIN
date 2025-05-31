const express = require('express');
const router = express.Router();
const sharepointService = require('../services/sharepointService');

// Task routes
router.get('/tasks', async (req, res) => {
    try {
        const { userId, status, priority } = req.query;
        const filters = { status, priority };
        const tasks = await sharepointService.getTasks(userId, filters);
        res.json(tasks);
    } catch (error) {
        console.error('Error in GET /tasks:', error);
        res.status(500).json({ error: 'Failed to get tasks' });
    }
});

router.post('/tasks', async (req, res) => {
    try {
        const task = await sharepointService.createTask(req.body);
        res.status(201).json(task);
    } catch (error) {
        console.error('Error in POST /tasks:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

router.put('/tasks/:id', async (req, res) => {
    try {
        const task = await sharepointService.updateTask(req.params.id, req.body);
        res.json(task);
    } catch (error) {
        console.error('Error in PUT /tasks/:id:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

router.delete('/tasks/:id', async (req, res) => {
    try {
        await sharepointService.deleteTask(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error('Error in DELETE /tasks/:id:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Tags endpoint - returns empty array since we store tags in tasks now
router.get('/tags', async (req, res) => {
    res.json([]);
});

// Notifications endpoint - returns empty array since we removed notifications
router.get('/notifications/:userId', async (req, res) => {
    res.json([]);
});

// Collaborators endpoint - returns empty array since we removed collaborators
router.get('/collaborators', async (req, res) => {
    res.json([]);
});

module.exports = router; 