import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import './Login.css';

const GoogleLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      console.log('🔐 Starting Google Auth...');
      
      const provider = new GoogleAuthProvider();
      // Optional: Add scopes if needed
      provider.addScope('email');
      provider.addScope('profile');
      
      // Forzar selección de cuenta
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log('✅ Google Auth successful:', {
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL
      });
      
      // Get Firebase ID token
      const token = await user.getIdToken();
      
      // Create user data for AuthContext
      const userData = {
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid,
        token: token
      };
      
      // Save to localStorage (same as your current AuthContext)
      localStorage.setItem('token', token);
      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userName', user.displayName || '');
      localStorage.setItem('userPhoto', user.photoURL || '');
      localStorage.setItem('userUid', user.uid);
      
      // Use your existing AuthContext login
      login(userData);
      
      toast.success(`¡Bienvenido ${user.displayName || user.email}!`);
      
    } catch (error) {
      console.error('❌ Google Auth error:', error);
      
      let errorMessage = 'Error al iniciar sesión con Google';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Login cancelado por el usuario';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup bloqueado. Permite popups para este sitio';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Solo se puede tener un popup de login a la vez';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Google Sign-In no está habilitado. Contacta al administrador';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="header">C-H</h1>
        <h2>Iniciar Sesión</h2>
        
        <div className="google-login-section">
          <button 
            className="google-login-btn"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner">⏳</span>
                <span>Conectando...</span>
              </>
            ) : (
              <>
                <span className="google-icon">🔐</span>
                <span>Continuar con Google</span>
              </>
            )}
          </button>
        </div>
        
        <div className="divider">
          <span>o</span>
        </div>
        
        <div className="fallback-info">
          <p>¿Problemas con Google? Contacta al administrador</p>
        </div>
      </div>
    </div>
  );
};

export default GoogleLogin; 