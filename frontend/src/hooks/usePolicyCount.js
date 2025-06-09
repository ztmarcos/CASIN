import { useState, useEffect } from 'react';
import { API_URL } from '../config/api.js';

export const usePolicyCount = () => {
  const [totalPolicies, setTotalPolicies] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPolicyCount = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📊 Fetching policy count from backend API...');
      console.log('🔗 Using API_URL:', API_URL);
      
      // Use the consolidated endpoint for better performance
      const url = `${API_URL}/policies/count`;
      console.log(`🔍 Fetching consolidated count from: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📊 Consolidated count result:', result);
      
      const total = result.total || 0;
      console.log('✅ Total policy count:', total);
      
      setTotalPolicies(total);
    } catch (err) {
      console.error('❌ Error fetching policy count from backend:', err);
      console.log('🔄 Falling back to individual collection counts...');
      
      // Fallback to individual collection requests
      try {
        const policyCollections = [
          'autos', 'rc', 'vida', 'gmm', 'transporte', 
          'mascotas', 'diversos', 'negocio', 'gruposgmm'
        ];

        const countPromises = policyCollections.map(async (collection) => {
          try {
            const url = `${API_URL}/data/${collection}?limit=1`;
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result.total || 0;
          } catch (error) {
            console.error(`❌ Error fetching count from ${collection}:`, error);
            return 0;
          }
        });

        const counts = await Promise.all(countPromises);
        const total = counts.reduce((sum, count) => sum + count, 0);
        console.log('✅ Fallback total policy count:', total);
        setTotalPolicies(total);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        setError('Error al cargar el conteo de pólizas');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 PolicyCounter hook initializing...');
    fetchPolicyCount();

    // Listen for policy updates to refresh count
    const handlePolicyUpdate = () => {
      console.log('🔄 Policy update detected, refreshing count...');
      fetchPolicyCount();
    };

    window.addEventListener('policyDataUpdated', handlePolicyUpdate);
    return () => window.removeEventListener('policyDataUpdated', handlePolicyUpdate);
  }, []);

  console.log('📈 PolicyCounter hook state:', { totalPolicies, isLoading, error });

  return { totalPolicies, isLoading, error, refetch: fetchPolicyCount };
}; 