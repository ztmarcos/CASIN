import React from 'react';
import Actividad from '../components/Tasks/Actividad';
import { useTheme } from '../context/ThemeContext';

const Tasks = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <Actividad />
    </div>
  );
};

export default Tasks; 