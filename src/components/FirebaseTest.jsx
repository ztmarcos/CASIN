import React, { useState, useEffect } from 'react';
import firebaseService from '../services/firebaseService.js';

const FirebaseTest = () => {
  const [contacts, setContacts] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔥 Testing Firebase connection...');
      
      // Test contacts
      const contactsResult = await firebaseService.getContacts(5);
      console.log('📋 Contacts from Firebase:', contactsResult);
      setContacts(contactsResult.data);
      
      // Test policies
      const policiesResult = await firebaseService.getPolicies(5);
      console.log('🚗 Policies from Firebase:', policiesResult);
      setPolicies(policiesResult.data);
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Firebase test error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>🔥 Testing Firebase Connection...</h2>
        <p>Loading your data from the cloud...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>❌ Firebase Connection Error</h2>
        <p>{error}</p>
        <button onClick={loadData}>Try Again</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>🎉 ¡FIREBASE FUNCIONANDO!</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>📋 Contactos ({contacts.length} loaded)</h2>
        <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px' }}>
          {contacts.map((contact, index) => (
            <div key={contact.firebaseId || index} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f5f5f5' }}>
              <strong>{contact.nombre_completo}</strong><br />
              📞 {contact.telefono_movil}<br />
              📧 {contact.email}<br />
              🏷️ Status: {contact.status}<br />
              <small>Firebase ID: {contact.firebaseId}</small>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🚗 Pólizas de Seguros ({policies.length} loaded)</h2>
        <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px' }}>
          {policies.map((policy, index) => (
            <div key={policy.firebaseId || index} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f0f8ff' }}>
              <strong>{policy.nombre_contratante}</strong><br />
              🏢 Aseguradora: {policy.aseguradora}<br />
              📋 Póliza: {policy.numero_poliza}<br />
              💰 Prima: ${policy.prima_neta}<br />
              🚗 Vehículo: {policy.descripcion_del_vehiculo}<br />
              <small>Firebase ID: {policy.firebaseId}</small>
            </div>
          ))}
        </div>
      </div>

      <button onClick={loadData} style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>
        🔄 Recargar Datos
      </button>
    </div>
  );
};

export default FirebaseTest; 