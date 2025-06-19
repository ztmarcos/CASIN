import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

class FirebaseTaskService {
  constructor() {
    this.collectionName = 'tasks';
    this.tagsCollectionName = 'tags';
    this.isInitialized = true;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // ================== Cache Utilities ==================
  getCacheKey(key, params = '') {
    return `${this.collectionName}_${key}_${params}`;
  }

  setCacheData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCacheData(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  clearCache() {
    this.cache.clear();
    console.log('🗑️ Task service cache cleared');
  }

  // ================== CRUD Operations ==================

  /**
   * Get all tasks
   */
  async getAllTasks(useCache = true) {
    const cacheKey = this.getCacheKey('all_tasks');
    
    if (useCache) {
      const cachedData = this.getCacheData(cacheKey);
      if (cachedData) {
        console.log('📋 Returning cached tasks');
        return cachedData;
      }
    }

    try {
      console.log('🔍 Fetching all tasks from Firebase');
      
      const tasksCollection = collection(db, this.collectionName);
      const q = query(tasksCollection, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        firebase_doc_id: doc.id
      }));

      if (useCache) {
        this.setCacheData(cacheKey, tasks);
      }

      console.log(`✅ Successfully fetched ${tasks.length} tasks`);
      return tasks;

    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      throw error;
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStats() {
    try {
      const tasks = await this.getAllTasks();
      
      const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        cancelled: tasks.filter(t => t.status === 'cancelled').length,
        high_priority: tasks.filter(t => t.priority === 'high').length,
        medium_priority: tasks.filter(t => t.priority === 'medium').length,
        low_priority: tasks.filter(t => t.priority === 'low').length
      };

      console.log('📊 Task stats:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Error getting task stats:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    try {
      console.log('➕ Creating new task:', taskData);

      const now = new Date();
      const newTask = {
        ...taskData,
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
        tags: taskData.tags || [],
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        dueDate: taskData.dueDate ? Timestamp.fromDate(new Date(taskData.dueDate)) : null
      };

      const tasksCollection = collection(db, this.collectionName);
      const docRef = await addDoc(tasksCollection, newTask);

      console.log('✅ Task created with ID:', docRef.id);
      
      // Clear cache
      this.clearCache();
      
      return {
        id: docRef.id,
        ...newTask
      };

    } catch (error) {
      console.error('❌ Error creating task:', error);
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId, updateData) {
    try {
      console.log('✏️ Updating task:', taskId, updateData);

      const taskRef = doc(db, this.collectionName, taskId);
      const updatedData = {
        ...updateData,
        updatedAt: Timestamp.fromDate(new Date()),
        dueDate: updateData.dueDate ? Timestamp.fromDate(new Date(updateData.dueDate)) : null
      };

      await updateDoc(taskRef, updatedData);

      console.log('✅ Task updated successfully');
      
      // Clear cache
      this.clearCache();
      
      return updatedData;

    } catch (error) {
      console.error('❌ Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId) {
    try {
      console.log('🗑️ Deleting task:', taskId);

      const taskRef = doc(db, this.collectionName, taskId);
      await deleteDoc(taskRef);

      console.log('✅ Task deleted successfully');
      
      // Clear cache
      this.clearCache();
      
      return true;

    } catch (error) {
      console.error('❌ Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Get a specific task by ID
   */
  async getTaskById(taskId) {
    try {
      console.log('🔍 Fetching task by ID:', taskId);

      const taskRef = doc(db, this.collectionName, taskId);
      const docSnapshot = await getDoc(taskRef);

      if (docSnapshot.exists()) {
        const task = {
          id: docSnapshot.id,
          ...docSnapshot.data(),
          firebase_doc_id: docSnapshot.id
        };
        
        console.log('✅ Task found:', task);
        return task;
      } else {
        console.log('❌ Task not found');
        return null;
      }

    } catch (error) {
      console.error('❌ Error fetching task:', error);
      throw error;
    }
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status) {
    try {
      console.log('🔍 Fetching tasks by status:', status);

      const tasksCollection = collection(db, this.collectionName);
      const q = query(
        tasksCollection, 
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        firebase_doc_id: doc.id
      }));

      console.log(`✅ Found ${tasks.length} tasks with status: ${status}`);
      return tasks;

    } catch (error) {
      console.error('❌ Error fetching tasks by status:', error);
      throw error;
    }
  }

  /**
   * Get tasks by priority
   */
  async getTasksByPriority(priority) {
    try {
      console.log('🔍 Fetching tasks by priority:', priority);

      const tasksCollection = collection(db, this.collectionName);
      const q = query(
        tasksCollection, 
        where('priority', '==', priority),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        firebase_doc_id: doc.id
      }));

      console.log(`✅ Found ${tasks.length} tasks with priority: ${priority}`);
      return tasks;

    } catch (error) {
      console.error('❌ Error fetching tasks by priority:', error);
      throw error;
    }
  }

  // ================== Tags Operations ==================

  /**
   * Get all available tags
   */
  async getAllTags() {
    try {
      console.log('🔍 Fetching all tags from Firebase');
      
      const tagsCollection = collection(db, this.tagsCollectionName);
      const q = query(tagsCollection, orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      
      const tags = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ Successfully fetched ${tags.length} tags`);
      return tags;

    } catch (error) {
      console.error('❌ Error fetching tags:', error);
      throw error;
    }
  }

  /**
   * Create a new tag
   */
  async createTag(tagName, color = '#3b82f6') {
    try {
      console.log('➕ Creating new tag:', tagName);

      const tagsCollection = collection(db, this.tagsCollectionName);
      const q = query(tagsCollection, where('name', '==', tagName));
      const snapshot = await getDocs(q);
      
      if (snapshot.docs.length > 0) {
        console.log('ℹ️ Tag already exists:', snapshot.docs[0].data());
        return snapshot.docs[0].data();
      }

      const newTag = {
        name: tagName.trim(),
        color: color,
        createdAt: Timestamp.fromDate(new Date()),
        createdBy: localStorage.getItem('userEmail') || 'system'
      };

      const docRef = await addDoc(tagsCollection, newTag);

      console.log('✅ Tag created with ID:', docRef.id);
      
      // Clear cache
      this.clearCache();
      
      return { id: docRef.id, ...newTag };

    } catch (error) {
      console.error('❌ Error creating tag:', error);
      throw error;
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagId) {
    try {
      console.log('🗑️ Deleting tag:', tagId);

      const tagRef = doc(db, this.tagsCollectionName, tagId);
      await deleteDoc(tagRef);

      console.log('✅ Tag deleted successfully');
      
      // Clear cache
      this.clearCache();
      
      return true;

    } catch (error) {
      console.error('❌ Error deleting tag:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const firebaseTaskService = new FirebaseTaskService();
export default firebaseTaskService; 