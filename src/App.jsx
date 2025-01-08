import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import DataSection from './components/DataSection/DataSection'
import TestGPT from './components/TestGPT/TestGPT'
import Sharepoint from './components/Sharepoint/Sharepoint'
import { ThemeProvider } from './context/ThemeContext'
import './styles/theme.css'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/data" element={<DataSection />} />
            <Route path="/sharepoint" element={<Sharepoint currentUser="default_user" />} />
            <Route path="/testgpt" element={<TestGPT />} />
            <Route path="/reports" element={<div>Reports Section</div>} />
            <Route path="/birthdays" element={<div>Birthdays Section</div>} />
            <Route path="/drive" element={<div>Drive Section</div>} />
            <Route path="/datapool" element={<div>Data Pool Section</div>} />
            <Route path="/prospeccion" element={<div>Prospección Section</div>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App 