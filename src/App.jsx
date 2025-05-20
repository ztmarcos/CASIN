import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import DataSection from './components/DataSection/DataSection'
import TestGPT from './components/TestGPT/TestGPT'
import Drive from './components/Drive/Drive'
import PDFParser from './components/PDFParser_new/PDFParser'
import Prospeccion from './components/Prospeccion/Prospeccion'
import Datapool from './components/Datapool/Datapool'
import Birthdays from './components/Birthdays/Birthdays'
import Reports from './components/Reports/Reports'
import Login from './components/Auth/Login'
import UserManagement from './components/UserManagement/UserManagement'
import Tasks from './pages/Tasks'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import './styles/theme.css'
import './App.css'
import Sharepoint from './components/Sharepoint/Sharepoint'
import { Toaster } from 'react-hot-toast'
import FirebaseViewer from './components/FirebaseViewer/FirebaseViewer'

// Componente protector de rutas
const ProtectedRoute = ({ children }) => {
  // Temporalmente desactivado el chequeo de autenticación
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
      
      <Route path="/prospeccion" element={
        <ProtectedRoute>
          <Layout>
            <Prospeccion />
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
        <ThemeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </>
  );
}

export default App 