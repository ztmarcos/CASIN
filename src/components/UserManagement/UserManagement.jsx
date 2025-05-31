import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config/api.js';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/users`);
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar usuarios');
      setLoading(false);
    }
  };

  const handleAddUser = async (email) => {
    try {
      await axios.post(`${API_URL}/auth/register`, { email });
      loadUsers();
    } catch (err) {
      setError('Error al agregar usuario');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${API_URL}/auth/users/${userId}`);
      loadUsers();
    } catch (err) {
      setError('Error al eliminar usuario');
    }
  };

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h1>Gestión de Usuarios</h1>
        <button onClick={() => navigate('/login')} className="back-button">
          Volver al Login
        </button>
      </div>

      {loading ? (
        <div className="loading">Cargando usuarios...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="users-list">
          {users.map(user => (
            <div key={user.id} className="user-item">
              <span className="user-email">{user.email}</span>
              <button 
                onClick={() => handleDeleteUser(user.id)}
                className="delete-button"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="add-user-form">
        <h2>Agregar Usuario</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          const email = e.target.email.value;
          handleAddUser(email);
          e.target.reset();
        }}>
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            required
          />
          <button type="submit">Agregar Usuario</button>
        </form>
      </div>
    </div>
  );
};

export default UserManagement; 