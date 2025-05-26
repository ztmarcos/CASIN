import { useState, useEffect } from 'react';
import tableService from '../services/data/tableService';

export const usePolicyCount = () => {
  const [totalPolicies, setTotalPolicies] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPolicyCount = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get all available tables
      const tables = await tableService.getTables();
      
      // Filter out child/secondary tables to avoid double counting
      const mainTables = tables.filter(table => !table.isSecondaryTable);
      console.log('Fetching policy count from main tables only:', mainTables.map(t => t.name));

      // Get data from main tables only
      const allResponses = await Promise.all(
        mainTables.map(async (table) => {
          try {
            const response = await tableService.getData(table.name);
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
      console.log('Total policy count (excluding child tables):', total);
      
      setTotalPolicies(total);
    } catch (err) {
      console.error('Error fetching policy count:', err);
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