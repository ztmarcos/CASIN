import React, { createContext, useState, useContext, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un token guardado al cargar la app
    console.log('🔍 AuthContext: Checking localStorage for user data...');
    
    // Método 1: Buscar claves individuales (formato GoogleLogin)
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    const name = localStorage.getItem('userName');
    const photoURL = localStorage.getItem('userPhoto');
    const uid = localStorage.getItem('userUid');
    
    console.log('🔍 AuthContext: localStorage individual keys:', { 
      hasToken: !!token, 
      email, 
      name, 
      hasPhoto: !!photoURL, 
      uid 
    });
    
    // Método 2: Buscar objeto 'user' completo
    let userFromObject = null;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        userFromObject = JSON.parse(userStr);
        console.log('🔍 AuthContext: Found user object:', userFromObject);
      }
    } catch (e) {
      console.log('🔍 AuthContext: No valid user object in localStorage');
    }
    
    // Método 3: Buscar cualquier clave que contenga email conocidos (fallback para testing)
    const knownEmails = ['z.t.marcos@gmail.com', '2012solitario@gmail.com'];
    let userData = null;
    
    if (token && email && uid) {
      // Usar datos de claves individuales
      userData = { 
        email, 
        token, 
        name: name || '',
        photoURL: photoURL || '',
        uid: uid
      };
      console.log('✅ AuthContext: Using individual keys data');
    } else if (userFromObject && userFromObject.email) {
      // Usar datos del objeto user
      userData = {
        email: userFromObject.email,
        token: userFromObject.token || 'fallback-token',
        name: userFromObject.name || userFromObject.displayName || '',
        photoURL: userFromObject.photoURL || '',
        uid: userFromObject.uid || userFromObject.email.replace(/[@.]/g, '_')
      };
      console.log('✅ AuthContext: Using user object data');
    } else {
      // Fallback: buscar emails conocidos en cualquier clave
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        
        if (knownEmails.some(email => value.includes(email))) {
          console.log(`🎯 AuthContext: Found known email in key '${key}'`);
          
          // Intentar parsear como JSON
          try {
            const parsed = JSON.parse(value);
            if (parsed.email && knownEmails.includes(parsed.email)) {
              userData = {
                email: parsed.email,
                token: parsed.token || 'fallback-token',
                name: parsed.name || parsed.displayName || '',
                photoURL: parsed.photoURL || '',
                uid: parsed.uid || parsed.email.replace(/[@.]/g, '_')
              };
              console.log('✅ AuthContext: Using fallback data from JSON');
              break;
            }
          } catch (e) {
            // Si no es JSON, verificar si es un email directo
            if (knownEmails.includes(value)) {
              userData = {
                email: value,
                token: 'fallback-token',
                name: value === 'z.t.marcos@gmail.com' ? 'Marcos Zavala' : '2012 Solitario',
                photoURL: '',
                uid: value.replace(/[@.]/g, '_')
              };
              console.log('✅ AuthContext: Using fallback data from email string');
              break;
            }
          }
        }
      }
    }
    
    if (userData) {
      console.log('✅ AuthContext: Setting user:', userData);
      setUser(userData);
    } else {
      console.log('❌ AuthContext: No valid user data found in localStorage');
      console.log('💡 AuthContext: Available localStorage keys:', Object.keys(localStorage));
    }
    
    setLoading(false);
  }, []);

  const login = (userData) => {
    console.log('🔐 AuthContext: Logging in user:', userData);
    
    // Save user data to localStorage for persistence
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('userEmail', userData.email);
    localStorage.setItem('userName', userData.name || '');
    localStorage.setItem('userPhoto', userData.photoURL || '');
    localStorage.setItem('userUid', userData.uid);
    localStorage.setItem('token', userData.token || 'firebase-token');
    
    setUser(userData);
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      // Logout de Firebase primero
      await signOut(auth);
      console.log('✅ Firebase logout successful');
      
      // Limpiar localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('userPhoto');
      localStorage.removeItem('userUid');
      
      // Limpiar estado de usuario
      setUser(null);
      
      toast.success('Sesión cerrada correctamente');
      
      // Opcional: redirigir a login o recargar página
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error during logout:', error);
      
      // Aunque Firebase falle, limpiar datos locales
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('userPhoto');
      localStorage.removeItem('userUid');
      setUser(null);
      
      toast.error('Error al cerrar sesión, pero datos locales limpiados');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext; 