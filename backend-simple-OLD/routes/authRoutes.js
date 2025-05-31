const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [users] = await connection.execute('SELECT * FROM users');
    connection.release();
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    await connection.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    
    connection.release();
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email } = req.body;
  
  try {
    const connection = await pool.getConnection();
    
    // Buscar usuario
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    // Si el usuario no existe, lo creamos
    if (users.length === 0) {
      await connection.execute(
        'INSERT INTO users (email) VALUES (?)',
        [email]
      );
      
      const [newUser] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      connection.release();
      
      const token = jwt.sign(
        { userId: newUser[0].id, email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({ token, email });
    }
    
    connection.release();
    
    // Si el usuario existe, generamos token
    const token = jwt.sign(
      { userId: users[0].id, email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token, email });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { email } = req.body;
    const connection = await pool.getConnection();
    
    // Check if user exists
    const [existingUsers] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      connection.release();
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Create new user
    await connection.execute(
      'INSERT INTO users (email) VALUES (?)',
      [email]
    );
    
    connection.release();
    res.status(201).json({ message: 'Usuario creado correctamente' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router; 