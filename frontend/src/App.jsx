import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import DataSection from './components/DataSection/DataSection'
import TestGPT from './components/TestGPT/TestGPT'
import Drive from './components/Drive/Drive'
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

// Componente protector de rutas
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { needsTeamSetup, isLoadingTeam, userTeam } = useTeam();
  
  console.log('🛡️ ProtectedRoute: State check', {
    user: !!user,
    userEmail: user?.email,
    loading,
    isLoadingTeam,
    needsTeamSetup,
    userTeam: !!userTeam,
    teamName: userTeam?.name
  });
  
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
  
  // 2. Si no está autenticado, mostrar Google Login
  if (!user) {
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
  
  // 6. Todo está listo, mostrar la aplicación
  return children;
};

function AppRoutes() {
  const { user, login } = useAuth();

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
            <Drive currentUser={user?.email || 'default-user'} />
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

      <Route path="/migration" element={
        <DataMigration />
      } />

      <Route path="/database-viewer" element={
        <DatabaseViewer />
      } />

      <Route path="/team-firebase" element={
        <ProtectedRoute>
          <Layout>
            <TeamFirebaseViewer />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/team" element={
        <ProtectedRoute>
          <Layout>
            <TeamManagement />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/team-data" element={
        <ProtectedRoute>
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

      <Route path="/test" element={
        <div style={{padding: '2rem', textAlign: 'center'}}>
          <h1>🧪 Test Route Works!</h1>
          <p>Si ves esto, las rutas funcionan correctamente.</p>
        </div>
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
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ThemeProvider>
        </TeamProvider>
      </AuthProvider>
    </>
  );
}

export default App 