import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const GoogleLogin = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Verificar si hay un resultado de redirección al cargar el componente
  React.useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const userData = {
            uid: result.user.uid,
            email: result.user.email,
            name: result.user.displayName,
            photoURL: result.user.photoURL
          };
          console.log('🔐 User signed in via redirect:', userData.email);
          await login(userData);
        }
      } catch (error) {
        console.error('❌ Redirect result error:', error);
      }
    };
    checkRedirectResult();
  }, [login]);
  
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const provider = new GoogleAuthProvider();
      
      // 🔑 FORZAR SELECCIÓN DE CUENTA - Esto resuelve el problema
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Intentar primero con popup
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupError) {
        // Si el popup está bloqueado, usar redirect como fallback
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
          console.log('⚠️ Popup bloqueado, usando redirect...');
          await signInWithRedirect(auth, provider);
          return; // La redirección manejará el resto
        }
        throw popupError; // Re-lanzar si es otro error
      }
      
      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        name: result.user.displayName,
        photoURL: result.user.photoURL
      };
      
      console.log('🔐 User signed in:', userData.email);
      
      // Limpiar cualquier estado previo problemático para usuarios específicos
      if (userData.email === 'z.t.marcos@gmail.com' || userData.email === '2012solitario@gmail.com') {
        console.log('🧹 Clearing previous state for admin user');
        localStorage.removeItem('teamState');
        localStorage.removeItem('userTeam');
        localStorage.removeItem('teamSetupComplete');
      }
      
      await login(userData);
      
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Detectar error específico de API key restrictions
      const isApiKeyBlocked = 
        error.code === 'auth/requests-from-referer-are-blocked' ||
        error.message?.includes('are blocked') ||
        error.message?.includes('API_KEY_HTTP_REFERRER_BLOCKED') ||
        error.message?.includes('PERMISSION_DENIED');
      
      if (isApiKeyBlocked) {
        const currentDomain = window.location.origin;
        setError(
          `Error de configuración de Firebase: El dominio ${currentDomain} no está permitido en las restricciones del API key. ` +
          `Por favor, agrega este dominio en la consola de Firebase (Credentials → API Key → HTTP referrers). ` +
          `Consulta la documentación FIREBASE_API_KEY_SETUP.md para más detalles.`
        );
      } else if (error.code === 'auth/popup-blocked') {
        setError(
          '⚠️ El navegador bloqueó la ventana emergente. Por favor, permite popups para este sitio y vuelve a intentar, o el sistema usará redirección automáticamente.'
        );
      } else {
        setError('Error al iniciar sesión: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearLocalStorageAndRetry = () => {
    console.log('🧹 Clearing all local storage and retrying...');
    
    // Limpiar todo el localStorage que pueda estar causando problemas
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('team') || key.includes('auth') || key.includes('user') || key.includes('firebase'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed: ${key}`);
    });
    
    // También limpiar sessionStorage
    sessionStorage.clear();
    
    // Recargar la página para empezar limpio
    window.location.reload();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏢 CASIN CRM</h1>
          <p>Inicia sesión para acceder al sistema</p>
        </div>
        
        <div className="login-content">
          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}
          
          <button 
            className="google-login-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continuar con Google</span>
              </>
            )}
          </button>
          
          {/* Debug options for troubleshooting */}
          <div className="debug-section">
            <details>
              <summary style={{ cursor: 'pointer', color: '#666', fontSize: '0.9rem', marginTop: '1rem' }}>
                🔧 Opciones de solución de problemas
              </summary>
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
                  Si tienes problemas para acceder a tu equipo, puedes limpiar el estado local:
                </p>
                <button 
                  onClick={clearLocalStorageAndRetry}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  🧹 Limpiar datos y reintentar
                </button>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleLogin; 