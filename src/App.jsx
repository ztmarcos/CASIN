import React, { useState } from 'react'
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
import { ThemeProvider } from './context/ThemeContext'
import './styles/theme.css'
import './App.css'
import Sidebar from './components/Sidebar/Sidebar'
import Sharepoint from './components/Sharepoint/Sharepoint'

function App() {
  const [currentUser] = useState("defaultUser")

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
                <Reports />
              </div>
            } />
            <Route path="/pdf-parser" element={
              <div className="section-container">
                <PDFParser />
              </div>
            } />
            <Route path="/datapool" element={
              <div className="section-container">
                <Datapool />
              </div>
            } />
            <Route path="/sharepoint" element={
              <div className="section-container">
                <Sharepoint currentUser={currentUser} />
              </div>
            } />
            <Route path="/birthdays" element={
              <div className="section-container">
                <Birthdays />
              </div>
            } />
            <Route path="/prospeccion" element={
              <div className="section-container">
                <Prospeccion />
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