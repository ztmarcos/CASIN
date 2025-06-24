import React, { useState, useEffect } from 'react';
import firebaseServiceAdapter from '../../services/firebaseServiceAdapter';
import { useTeam } from '../../context/TeamContext';
import { getCleanTeamName } from '../../utils/teamUtils';

const FirebaseTest = () => {
  const { userTeam, currentTeam } = useTeam();
  const team = currentTeam || userTeam;
  
  const [contacts, setContacts] = useState([]);
  const [autos, setAutos] = useState([]);
  const [allCollections, setAllCollections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debug: Show environment variables
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  const loadAllCollections = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔥 Loading all Firebase collections...');
      
      const tables = await firebaseServiceAdapter.getTables();
      const collectionData = {};
      
      for (const tableName of tables) {
        try {
          const data = await firebaseServiceAdapter.getAllDocuments(tableName, 5);
          collectionData[tableName] = {
            count: data.length,
            sampleData: data
          };
          console.log(`📊 ${tableName}: ${data.length} records`);
        } catch (err) {
          console.warn(`⚠️ Could not load ${tableName}:`, err);
          collectionData[tableName] = {
            count: 0,
            error: err.message,
            sampleData: []
          };
        }
      }
      
      setAllCollections(collectionData);

    } catch (err) {
      console.error('❌ Error loading collections:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔥 Loading Firebase data...');
      
      // Load contacts
      const contactsData = await firebaseServiceAdapter.getData('directorio_contactos', 5);
      console.log('📇 Contacts loaded:', contactsData.length);
      setContacts(contactsData);

      // Load autos
      const autosData = await firebaseServiceAdapter.getData('autos', 5);
      console.log('🚗 Autos loaded:', autosData.length);
      setAutos(autosData);

    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllCollections();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🔥 Firebase Data Test</h2>
      
      {team && (
        <div style={{
          background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #e2e8f0',
          fontSize: '14px'
        }}>
          <strong>🏢 Equipo:</strong> {getCleanTeamName(team.name)} | 
          <strong> 📊 Servicio:</strong> {firebaseServiceAdapter.getServiceInfo().service} | 
          <strong> 🔒 Datos:</strong> Aislados por equipo
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <h3>📡 Firebase Configuration</h3>
        <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px' }}>
          {JSON.stringify({
            projectId: firebaseConfig.projectId,
            hasApiKey: !!firebaseConfig.apiKey,
            hasAuthDomain: !!firebaseConfig.authDomain,
            configured: !!(firebaseConfig.projectId && firebaseConfig.apiKey)
          }, null, 2)}
        </pre>
      </div>

      {loading && <p>🔄 Loading...</p>}
      {error && <p style={{ color: 'red' }}>❌ Error: {error}</p>}
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={loadAllCollections} style={{ marginRight: '10px' }}>
          🔄 Reload All Collections
        </button>
        <button onClick={loadData}>
          🔄 Load Sample Data
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>📊 All Firebase Collections</h3>
        {Object.keys(allCollections).length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            {Object.entries(allCollections).map(([collectionName, data]) => (
              <div key={collectionName} style={{ 
                border: '1px solid #ddd', 
                padding: '15px', 
                borderRadius: '8px',
                background: data.error ? '#ffe6e6' : data.count > 0 ? '#e6ffe6' : '#fff'
              }}>
                <h4 style={{ margin: '0 0 10px 0' }}>
                  {collectionName} 
                  <span style={{ fontSize: '14px', fontWeight: 'normal' }}>
                    ({data.error ? 'Error' : `${data.count} records`})
                  </span>
                </h4>
                {data.error ? (
                  <p style={{ color: 'red', fontSize: '12px' }}>⚠️ {data.error}</p>
                ) : data.count > 0 ? (
                  <div>
                    <p style={{ color: 'green', fontSize: '12px' }}>✅ Has data</p>
                    {data.sampleData[0] && (
                      <details>
                        <summary style={{ cursor: 'pointer', fontSize: '12px' }}>
                          View sample record
                        </summary>
                        <pre style={{ fontSize: '10px', marginTop: '5px', background: '#f9f9f9', padding: '5px' }}>
                          {JSON.stringify(data.sampleData[0], null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ) : (
                  <p style={{ color: 'orange', fontSize: '12px' }}>📭 Empty collection</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No collections loaded yet</p>
        )}
      </div>

      {contacts.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>📇 Sample Contacts ({contacts.length})</h3>
          <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
            {JSON.stringify(contacts.slice(0, 2), null, 2)}
          </pre>
        </div>
      )}

      {autos.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>🚗 Sample Autos ({autos.length})</h3>
          <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
            {JSON.stringify(autos.slice(0, 2), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default FirebaseTest; 