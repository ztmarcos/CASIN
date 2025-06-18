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
    
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    const name = localStorage.getItem('userName');
    const photoURL = localStorage.getItem('userPhoto');
    const uid = localStorage.getItem('userUid');
    
    console.log('🔍 AuthContext: localStorage data:', { 
      hasToken: !!token, 
      email, 
      name, 
      hasPhoto: !!photoURL, 
      uid 
    });
    
    if (token && email && uid) {
      const userData = { 
        email, 
        token, 
        name: name || '',
        photoURL: photoURL || '',
        uid: uid
      };
      console.log('✅ AuthContext: Setting user from localStorage:', userData);
      setUser(userData);
    } else {
      console.log('❌ AuthContext: No valid user data in localStorage');
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      // Logout de Firebase primero
      await signOut(auth);
      console.log('✅ Firebase logout successful');
      
      // Limpiar localStorage
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