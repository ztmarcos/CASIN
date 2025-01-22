import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:3001/api/auth/login', { email });
      const { token } = response.data;
      
      // Guardar token en localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('userEmail', email);
      
      // Llamar al callback de login exitoso
      onLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="header">C-H</h1>
        <h2>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Cargando...' : 'Entrar'}
          </button>
        </form>
        <div className="admin-section">
          <Link to="/user-management" className="admin-link">
            Gestión de Usuarios
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login; 