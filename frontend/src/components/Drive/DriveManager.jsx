import React, { useState, useEffect, useRef } from 'react';
import Firedrive from './Firedrive';
import './DriveManager.css';

const DriveManager = ({ isOpen, onClose, clientData }) => {
  const [clientFolderReady, setClientFolderReady] = useState(false);

  // Handle when client folder is ready in Firedrive
  const handleClientFolderReady = (folderPath) => {
    console.log('📁 DriveManager: Client folder ready:', folderPath);
    setClientFolderReady(true);
  };

  // Get client name for display (GMM REAL columns: 'contratante' and 'nombre_del_asegurado')
  const getClientName = () => {
    if (!clientData) return 'Cliente';
    
    return clientData.contratante || 
           clientData.nombre_contratante ||
           clientData.nombre_del_asegurado ||
           clientData.nombre_asegurado || 
           clientData.asegurado || 
           clientData.nombre_completo ||
           'Cliente';
  };

  if (!isOpen) return null;

  return (
    <div className="drive-manager-overlay" onClick={onClose}>
      <div className="drive-manager-modal" onClick={e => e.stopPropagation()}>
        <div className="drive-manager-header">
          <h3>📁 Drive - {getClientName()}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="drive-manager-body" style={{ height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
          {/* Embed Firedrive with client-specific navigation */}
          <Firedrive 
            clientData={clientData}
            autoNavigateToClient={true}
            onClientFolderReady={handleClientFolderReady}
          />
        </div>
      </div>
    </div>
  );
};

export default DriveManager; 