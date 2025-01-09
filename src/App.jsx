import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import DataSection from './components/DataSection/DataSection'
import TestGPT from './components/TestGPT/TestGPT'
import Drive from './components/Drive/Drive'
import { ThemeProvider } from './context/ThemeContext'
import './styles/theme.css'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/data" element={<DataSection />} />
            <Route path="/drive" element={
              <div className="section-container">
                <Drive currentUser="default-user" />
              </div>
            } />
            <Route path="/reports" element={
              <div className="section-container">
                <h2>Reports Section</h2>
              </div>
            } />
            <Route path="/datapool" element={
              <div className="section-container">
                <h2>Data Pool Section</h2>
              </div>
            } />
            <Route path="/sharepoint" element={
              <div className="section-container">
                <h2>Sharepoint Section</h2>
              </div>
            } />
            <Route path="/birthdays" element={
              <div className="section-container">
                <h2>Cumpleaños Section</h2>
              </div>
            } />
            <Route path="/prospeccion" element={
              <div className="section-container">
                <h2>Prospección Section</h2>
              </div>
            } />
            <Route path="/test-gpt" element={<TestGPT />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App 