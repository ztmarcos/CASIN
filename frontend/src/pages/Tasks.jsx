import React from 'react';
import FirebaseTasks from '../components/Tasks/FirebaseTasks';
import { useTheme } from '../context/ThemeContext';

const Tasks = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <div className={isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}>
      <div className="p-4 pb-0">
        <h1 className="text-xl font-bold">
          Tareas 
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          
        </p>
      </div>
      
      <div className={`m-4 rounded overflow-hidden shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <FirebaseTasks />
      </div>
    </div>
  );
};

export default Tasks; 