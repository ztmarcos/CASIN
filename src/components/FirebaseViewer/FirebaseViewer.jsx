import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

const FirebaseViewer = () => {
  const [data, setData] = useState({
    backups: [],
    backupsMetadata: [],
    gmm: [],
    autos: [],
    loading: true,
    error: null,
    debug: []
  });

  useEffect(() => {
    loadFirebaseData();
  }, []);

  const addDebug = (message) => {
    setData(prev => ({
      ...prev,
      debug: [...prev.debug, `${new Date().toISOString()}: ${message}`]
    }));
  };

  const loadFirebaseData = async () => {
    try {
      addDebug('Iniciando carga de datos...');

      // Get GMM data
      try {
        addDebug('Intentando obtener datos de GMM...');
        const gmmRef = collection(db, 'gmm');
        const gmmQuery = query(gmmRef, limit(10)); // Limitamos a 10 documentos para prueba
        const gmmSnapshot = await getDocs(gmmQuery);
        const gmm = gmmSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        addDebug(`GMM datos obtenidos: ${gmm.length} documentos`);
      } catch (error) {
        addDebug(`Error al obtener GMM: ${error.message}`);
      }

      // Get Autos data
      try {
        addDebug('Intentando obtener datos de Autos...');
        const autosRef = collection(db, 'autos');
        const autosQuery = query(autosRef, limit(10)); // Limitamos a 10 documentos para prueba
        const autosSnapshot = await getDocs(autosQuery);
        const autos = autosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        addDebug(`Autos datos obtenidos: ${autos.length} documentos`);
      } catch (error) {
        addDebug(`Error al obtener Autos: ${error.message}`);
      }

      // Get backups metadata
      try {
        addDebug('Intentando obtener metadata de backups...');
        const backupsMetadataRef = collection(db, 'backups_metadata');
        const backupsMetadataSnapshot = await getDocs(backupsMetadataRef);
        const backupsMetadata = backupsMetadataSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()?.toLocaleString()
        }));
        addDebug(`Backups metadata obtenidos: ${backupsMetadata.length} documentos`);
      } catch (error) {
        addDebug(`Error al obtener backups metadata: ${error.message}`);
      }

      // Get backups
      try {
        addDebug('Intentando obtener backups...');
        const backupsRef = collection(db, 'backups');
        const backupsSnapshot = await getDocs(backupsRef);
        const backups = backupsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()?.toLocaleString()
        }));
        addDebug(`Backups obtenidos: ${backups.length} documentos`);
      } catch (error) {
        addDebug(`Error al obtener backups: ${error.message}`);
      }

      setData(prev => ({
        ...prev,
        loading: false,
        error: null
      }));
      addDebug('Carga de datos completada');
    } catch (error) {
      console.error('Error loading Firebase data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      addDebug(`Error general: ${error.message}`);
    }
  };

  if (data.loading) {
    return (
      <div>
        <div>Cargando datos de Firebase...</div>
        <div style={{ marginTop: '20px' }}>
          <h4>Debug Log:</h4>
          {data.debug.map((msg, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: '12px' }}>{msg}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Datos en Firebase</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h4>Debug Log:</h4>
        {data.debug.map((msg, i) => (
          <div key={i} style={{ fontFamily: 'monospace', fontSize: '12px' }}>{msg}</div>
        ))}
      </div>

      {data.error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          Error: {data.error}
        </div>
      )}
      
      <h3>GMM ({data.gmm.length} registros)</h3>
      <div style={{ maxHeight: '300px', overflow: 'auto', marginBottom: '20px' }}>
        {data.gmm.map(record => (
          <div key={record.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
            <div><strong>ID:</strong> {record.id}</div>
            <pre>{JSON.stringify(record, null, 2)}</pre>
          </div>
        ))}
      </div>

      <h3>Autos ({data.autos.length} registros)</h3>
      <div style={{ maxHeight: '300px', overflow: 'auto', marginBottom: '20px' }}>
        {data.autos.map(record => (
          <div key={record.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
            <div><strong>ID:</strong> {record.id}</div>
            <pre>{JSON.stringify(record, null, 2)}</pre>
          </div>
        ))}
      </div>

      <h3>Backups Metadata ({data.backupsMetadata.length})</h3>
      <div style={{ maxHeight: '300px', overflow: 'auto', marginBottom: '20px' }}>
        {data.backupsMetadata.map(backup => (
          <div key={backup.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
            <div><strong>ID:</strong> {backup.id}</div>
            <pre>{JSON.stringify(backup, null, 2)}</pre>
          </div>
        ))}
      </div>

      <h3>Backups ({data.backups.length})</h3>
      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
        {data.backups.map(backup => (
          <div key={backup.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
            <div><strong>ID:</strong> {backup.id}</div>
            <pre>{JSON.stringify(backup, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FirebaseViewer; 