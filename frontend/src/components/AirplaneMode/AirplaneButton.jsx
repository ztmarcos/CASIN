import React, { useState, useEffect } from 'react';
import airplaneModeService from '../../services/airplaneModeService';
import { toast } from 'react-hot-toast';
import './AirplaneButton.css';

const AirplaneButton = () => {
  const [isAirplaneMode, setIsAirplaneMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // Check initial state
    setIsAirplaneMode(airplaneModeService.isEnabled());
    setStatus(airplaneModeService.getStatus());
  }, []);

  const toggleAirplaneMode = async () => {
    setIsLoading(true);
    
    try {
      if (isAirplaneMode) {
        // Disable airplane mode
        airplaneModeService.disableAirplaneMode();
        setIsAirplaneMode(false);
        setStatus(null);
        toast.success('🌐 Airplane mode disabled - data will sync online');
        
        // Refresh the page to reload fresh data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // Enable airplane mode
        toast.loading('✈️ Enabling airplane mode - saving data...', { id: 'airplane' });
        
        await airplaneModeService.enableAirplaneMode();
        setIsAirplaneMode(true);
        setStatus(airplaneModeService.getStatus());
        
        toast.success('✈️ Airplane mode enabled - working offline!', { id: 'airplane' });
      }
    } catch (error) {
      console.error('Error toggling airplane mode:', error);
      toast.error(`Failed to toggle airplane mode: ${error.message}`, { id: 'airplane' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="airplane-button-container">
      <button
        className={`airplane-button ${isAirplaneMode ? 'enabled' : 'disabled'}`}
        onClick={toggleAirplaneMode}
        disabled={isLoading}
        title={isAirplaneMode ? 'Disable airplane mode' : 'Enable airplane mode'}
      >
        {isLoading ? (
          <span className="loading-spinner">⏳</span>
        ) : (
          <span className="airplane-icon">✈️</span>
        )}
      </button>
      
      {isAirplaneMode && status && (
        <div className="airplane-status">
          <small>
            Offline: {status.tablesCount} tables saved
          </small>
        </div>
      )}
    </div>
  );
};

export default AirplaneButton; 