import { useState, useEffect } from 'react';
import firebaseTableService from '../services/firebaseTableService';

export const usePolicyCount = () => {
  const [totalPolicies, setTotalPolicies] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPolicyCount = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get all available Firebase collections
      const tables = await firebaseTableService.getTables();
      
      // Filter out directorio_contactos to avoid counting contacts as policies
      const policyTables = tables.filter(table => 
        table.name !== 'directorio_contactos'
      );
      console.log('Fetching policy count from Firebase collections:', policyTables.map(t => t.name));

      // Get data from policy collections
      const allResponses = await Promise.all(
        policyTables.map(async (table) => {
          try {
            const response = await firebaseTableService.getData(table.name);
            const count = response.data?.length || 0;
            console.log(`Table ${table.name}: ${count} records`);
            return count;
          } catch (error) {
            console.error(`Error fetching from ${table.name}:`, error);
            return 0;
          }
        })
      );

      // Sum all counts
      const total = allResponses.reduce((sum, count) => sum + count, 0);
      console.log('Total policy count from Firebase (excluding directorio):', total);
      
      setTotalPolicies(total);
    } catch (err) {
      console.error('Error fetching policy count from Firebase:', err);
      setError('Error al cargar el conteo de pólizas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicyCount();

    // Listen for policy updates to refresh count
    const handlePolicyUpdate = () => {
      console.log('Policy update detected, refreshing count...');
      fetchPolicyCount();
    };

    window.addEventListener('policyDataUpdated', handlePolicyUpdate);
    return () => window.removeEventListener('policyDataUpdated', handlePolicyUpdate);
  }, []);

  return { totalPolicies, isLoading, error, refetch: fetchPolicyCount };
}; 