import React, { useEffect, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import DataSection from './components/DataSection/DataSection'
import TestGPT from './components/TestGPT/TestGPT'
import Firedrive from './components/Drive/Firedrive'
import DriveMigration from './components/DriveMigration/DriveMigration'
import PDFParser from './components/PDFParser_new/PDFParser'
import Datapool from './components/Datapool/Datapool'
import Birthdays from './components/Birthdays/Birthdays'
import Reports from './components/Reports/Reports'
import GoogleLogin from './components/Auth/GoogleLogin'
import UserManagement from './components/UserManagement/UserManagement'
import Tasks from './pages/Tasks'
import TeamSetup from './components/TeamSetup/TeamSetup'
import TeamManagement from './components/TeamManagement/TeamManagement'
import TeamFirebaseViewer from './components/TeamFirebaseViewer/TeamFirebaseViewer'
import TeamDataDemo from './components/TeamDataDemo/TeamDataDemo'
import DataMigration from './components/DataMigration/DataMigration'
import DatabaseViewer from './components/DatabaseViewer/DatabaseViewer'
import CASINSetup from './components/CASINSetup/CASINSetup'
import CASINSetupTest from './components/CASINSetup/CASINSetupTest'
import CASINSetupSimple from './components/CASINSetup/CASINSetupSimple'
import DeveloperDashboard from './components/DeveloperDashboard/DeveloperDashboard'

import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { TeamProvider, useTeam } from './context/TeamContext'
import './styles/theme.css'
import './App.css'
import Sharepoint from './components/Sharepoint/Sharepoint'
import { Toaster } from 'react-hot-toast'
import FirebaseViewer from './components/FirebaseViewer/FirebaseViewer'
import Directorio from './components/Directorio/Directorio'
import DirectorioSimple from './components/Directorio/DirectorioSimple'
import FirebaseTest from './components/FirebaseTest/FirebaseTest'
import Cotiza from './components/Cotiza/Cotiza'
import Clientes from './components/Clientes/Clientes'
import Resumen from './components/Resumen/Resumen'

// Error Boundary: evita pantalla blanca si algo falla (p. ej. en móvil)
class AppErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('AppErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'var(--bg-secondary, #f8f9fa)',
          color: 'var(--text-primary, #212529)',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Algo salió mal</h1>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary, #495057)' }}>
            Si ves esto en móvil, recarga la página o prueba desde escritorio.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              background: 'var(--accent-color, #2563eb)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Componente protector de rutas con verificación de permisos
const ProtectedRoute = ({ children, requireAdminAccess = false }) => {
  const { user, loading } = useAuth();
  const { needsTeamSetup, isLoadingTeam, userTeam, canAccessTeamData, isActiveMember } = useTeam();
  
  // 🛠️ BYPASS DE DESARROLLO: Permitir acceso sin auth en localhost
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const DEV_BYPASS = isDevelopment && localStorage.getItem('dev_bypass_auth') === 'true';
  
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.__LOG_PROTECTED_ROUTE__) {
    console.log('🛡️ ProtectedRoute: State check', {
      user: !!user,
      userEmail: user?.email,
      loading,
      isLoadingTeam,
      needsTeamSetup,
      userTeam: !!userTeam,
      teamName: userTeam?.name,
      requireAdminAccess,
      canAccessTeamData: canAccessTeamData ? canAccessTeamData() : false,
      isActiveMember: isActiveMember ? isActiveMember() : false,
      isDevelopment,
      DEV_BYPASS
    });
  }
  
  // 🛠️ BYPASS: Si está en desarrollo y el bypass está activado, permitir acceso directo
  if (DEV_BYPASS) {
    console.log('🛠️ DEV MODE: Bypassing authentication');
    return children;
  }
  
  // 1. Primero verificar si está cargando la autenticación
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Cargando...
      </div>
    );
  }
  
  // 2. Si no está autenticado, mostrar Google Login (con opción de bypass en desarrollo)
  if (!user) {
    // En desarrollo, mostrar opción de bypass
    if (isDevelopment) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          padding: '2rem'
        }}>
          <GoogleLogin />
          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            background: '#f8f9fa', 
            borderRadius: '8px',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              🛠️ Modo Desarrollo: Puedes activar el bypass de autenticación
            </p>
            <button
              onClick={() => {
                localStorage.setItem('dev_bypass_auth', 'true');
                window.location.reload();
              }}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✅ Activar Bypass de Auth (Solo Desarrollo)
            </button>
          </div>
        </div>
      );
    }
    return <GoogleLogin />;
  }
  
  // 3. Si está autenticado, verificar el estado del equipo
  if (isLoadingTeam) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Verificando equipo...
      </div>
    );
  }
  
  // 4. Si necesita configurar equipo, mostrar TeamSetup
  if (needsTeamSetup) {
    return <TeamSetup />;
  }
  
  // 5. Si no tiene equipo (estado inválido), mostrar mensaje
  if (!userTeam) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Configurando equipo...
      </div>
    );
  }
  
  // 6. Verificar permisos específicos si se requieren
  if (requireAdminAccess && canAccessTeamData && !canAccessTeamData()) {
    return (
      <Layout>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          fontSize: '1.2rem',
          color: '#666',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>🚫 Acceso Denegado</h2>
          <p style={{ marginBottom: '0.5rem' }}>No tienes permisos para acceder a esta sección.</p>
          <p style={{ fontSize: '1rem', color: '#999' }}>Solo los administradores del equipo pueden acceder a datos críticos y configuraciones del equipo.</p>
        </div>
      </Layout>
    );
  }
  
  // 7. Todo está listo, mostrar la aplicación
  return children;
};

function AppRoutes() {
  const { user, login } = useAuth();

  useEffect(() => {
    // Clear any cached table counts on app start
    console.log('🧹 Clearing cached table counts...');
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('table_count_') || key.includes('firebase_cache_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Removed ${keysToRemove.length} cached items`);
  }, []);

  return (
    <Routes>
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/tasks" element={
        <ProtectedRoute>
          <Layout>
            <Tasks />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/data" element={
        <ProtectedRoute>
          <Layout>
            <DataSection />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/drive" element={
        <ProtectedRoute>
          <Layout>
            <Firedrive currentUser={user?.email || 'default-user'} />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/drive-migration" element={
        <ProtectedRoute>
          <Layout>
            <DriveMigration />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/reports" element={
        <ProtectedRoute>
          <Layout>
            <Reports />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/pdf-parser" element={
        <ProtectedRoute>
          <Layout>
            <PDFParser />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/datapool" element={
        <ProtectedRoute>
          <Layout>
            <Datapool />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/sharepoint" element={
        <ProtectedRoute>
          <Layout>
            <Sharepoint currentUser={user?.email} />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/birthdays" element={
        <ProtectedRoute>
          <Layout>
            <Birthdays />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/test-gpt" element={
        <ProtectedRoute>
          <Layout>
            <TestGPT />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/firebase" element={
        <ProtectedRoute>
          <Layout>
            <FirebaseViewer />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/firebase-test" element={
        <ProtectedRoute>
          <Layout>
            <FirebaseTest />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/directorio" element={
        <ProtectedRoute>
          <Layout>
            <Directorio />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/directorio-simple" element={
        <ProtectedRoute>
          <Layout>
            <DirectorioSimple />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/directorio-standalone" element={
        <ProtectedRoute>
          <DirectorioSimple />
        </ProtectedRoute>
      } />

      <Route path="/cotiza" element={
        <ProtectedRoute>
          <Layout>
            <Cotiza />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/clientes" element={
        <ProtectedRoute>
          <Layout>
            <Clientes />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/migration" element={
        <DataMigration />
      } />

      <Route path="/database-viewer" element={
        <ProtectedRoute requireAdminAccess>
          <Layout>
            <DatabaseViewer />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/team-firebase" element={
        <ProtectedRoute>
          <Layout>
            <TeamFirebaseViewer />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/team-data" element={
        <ProtectedRoute requireAdminAccess>
          <Layout>
            <TeamDataDemo />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/casin-setup" element={
        <CASINSetupSimple />
      } />

      <Route path="/casin-setup-full" element={
        <CASINSetup />
      } />

              <Route path="/developer-dashboard" element={
          <ProtectedRoute requireAdminAccess>
            <Layout>
              <DeveloperDashboard />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/test" element={
        <div style={{padding: '2rem', textAlign: 'center'}}>
          <h1>🧪 Test Route Works!</h1>
          <p>Si ves esto, las rutas funcionan correctamente.</p>
        </div>
      } />

      <Route path="/resumen" element={
        <ProtectedRoute requireAdminAccess>
          <Resumen />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#4aed88',
            },
          },
          error: {
            duration: 4000,
            theme: {
              primary: '#ff4b4b',
            },
          },
        }}
      />
      <AuthProvider>
        <TeamProvider>
          <ThemeProvider>
            <AppErrorBoundary>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true
                }}
              >
                <AppRoutes />
              </BrowserRouter>
            </AppErrorBoundary>
          </ThemeProvider>
        </TeamProvider>
      </AuthProvider>
    </>
  );
}

export default App 