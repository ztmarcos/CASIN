import React from 'react'
import Layout from './components/Layout/Layout'
import DataSection from './components/DataSection/DataSection'
import { ThemeProvider } from './context/ThemeContext'
import './styles/theme.css'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <Layout>
        <DataSection />
      </Layout>
    </ThemeProvider>
  )
}

export default App 