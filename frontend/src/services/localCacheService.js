/**
 * LocalCacheService - Servicio de caché local para evitar requests innecesarios
 * Guarda datos en localStorage con timestamps y detección de cambios
 */
class LocalCacheService {
  constructor() {
    this.prefix = 'casin_cache_';
    this.defaultTTL = 2 * 60 * 1000; // 2 minutos por defecto (más corto para mejor experiencia)
  }

  /**
   * Genera una clave de caché única
   */
  getCacheKey(service, params = {}) {
    const paramString = Object.keys(params).length > 0 
      ? '_' + JSON.stringify(params) 
      : '';
    return `${this.prefix}${service}${paramString}`;
  }

  /**
   * Guarda datos en caché con timestamp
   */
  set(service, data, params = {}, ttl = this.defaultTTL) {
    try {
      const cacheKey = this.getCacheKey(service, params);
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
        params,
        service
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`💾 Cached data for ${service}:`, { 
        key: cacheKey, 
        dataSize: JSON.stringify(data).length,
        expiresAt: new Date(Date.now() + ttl).toLocaleTimeString()
      });
      
      // También guardamos un índice de todas las claves de caché para limpieza
      this.updateCacheIndex(cacheKey);
      
      return true;
    } catch (error) {
      console.error('Error saving to cache:', error);
      return false;
    }
  }

  /**
   * Obtiene datos del caché si están válidos
   */
  get(service, params = {}) {
    try {
      const cacheKey = this.getCacheKey(service, params);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        console.log(`💾 No cache found for ${service}`);
        return null;
      }

      const cacheData = JSON.parse(cached);
      const now = Date.now();
      const isExpired = now - cacheData.timestamp > cacheData.ttl;

      if (isExpired) {
        console.log(`💾 Cache expired for ${service}, removing...`);
        localStorage.removeItem(cacheKey);
        this.removeCacheIndex(cacheKey);
        return null;
      }

      console.log(`💾 Cache hit for ${service}:`, {
        age: Math.round((now - cacheData.timestamp) / 1000) + 's',
        expiresIn: Math.round((cacheData.ttl - (now - cacheData.timestamp)) / 1000) + 's'
      });
      
      return cacheData.data;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  /**
   * Invalida caché específico
   */
  invalidate(service, params = {}) {
    try {
      const cacheKey = this.getCacheKey(service, params);
      localStorage.removeItem(cacheKey);
      this.removeCacheIndex(cacheKey);
      console.log(`💾 Invalidated cache for ${service}`);
      return true;
    } catch (error) {
      console.error('Error invalidating cache:', error);
      return false;
    }
  }

  /**
   * Invalida todos los caché de un servicio
   */
  invalidateService(service) {
    try {
      const index = this.getCacheIndex();
      const keysToRemove = index.filter(key => key.includes(`${this.prefix}${service}`));
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      this.updateCacheIndex(null, keysToRemove);
      console.log(`💾 Invalidated all cache for service ${service}:`, keysToRemove.length + ' items');
      return true;
    } catch (error) {
      console.error('Error invalidating service cache:', error);
      return false;
    }
  }

  /**
   * Limpia todo el caché
   */
  clear() {
    try {
      const index = this.getCacheIndex();
      index.forEach(key => localStorage.removeItem(key));
      localStorage.removeItem(`${this.prefix}index`);
      console.log(`💾 Cleared all cache: ${index.length} items`);
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats() {
    try {
      const index = this.getCacheIndex();
      const stats = {
        totalItems: index.length,
        totalSize: 0,
        services: {},
        oldestItem: null,
        newestItem: null
      };

      index.forEach(key => {
        const cached = localStorage.getItem(key);
        if (cached) {
          const size = cached.length;
          stats.totalSize += size;
          
          try {
            const cacheData = JSON.parse(cached);
            const service = cacheData.service;
            
            if (!stats.services[service]) {
              stats.services[service] = { count: 0, size: 0 };
            }
            stats.services[service].count++;
            stats.services[service].size += size;
            
            if (!stats.oldestItem || cacheData.timestamp < stats.oldestItem) {
              stats.oldestItem = cacheData.timestamp;
            }
            if (!stats.newestItem || cacheData.timestamp > stats.newestItem) {
              stats.newestItem = cacheData.timestamp;
            }
          } catch (e) {
            // Ignore malformed cache entries
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Función helper para verificar si necesitamos hacer fetch
   */
  shouldFetch(service, params = {}, forceRefresh = false) {
    if (forceRefresh) {
      console.log(`💾 Force refresh requested for ${service}`);
      return true;
    }

    const cached = this.get(service, params);
    const shouldFetch = !cached;
    
    if (shouldFetch) {
      console.log(`💾 Should fetch ${service}: no valid cache`);
    } else {
      console.log(`💾 Should NOT fetch ${service}: using cache`);
    }
    
    return shouldFetch;
  }

  /**
   * Mantiene un índice de todas las claves de caché
   */
  updateCacheIndex(addKey = null, removeKeys = []) {
    try {
      let index = this.getCacheIndex();
      
      if (addKey && !index.includes(addKey)) {
        index.push(addKey);
      }
      
      if (removeKeys.length > 0) {
        index = index.filter(key => !removeKeys.includes(key));
      }
      
      localStorage.setItem(`${this.prefix}index`, JSON.stringify(index));
    } catch (error) {
      console.error('Error updating cache index:', error);
    }
  }

  removeCacheIndex(removeKey) {
    this.updateCacheIndex(null, [removeKey]);
  }

  getCacheIndex() {
    try {
      const index = localStorage.getItem(`${this.prefix}index`);
      return index ? JSON.parse(index) : [];
    } catch (error) {
      console.error('Error reading cache index:', error);
      return [];
    }
  }

  /**
   * Limpia caché expirado automáticamente
   */
  cleanup() {
    try {
      const index = this.getCacheIndex();
      const now = Date.now();
      const expiredKeys = [];

      index.forEach(key => {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const cacheData = JSON.parse(cached);
            if (now - cacheData.timestamp > cacheData.ttl) {
              expiredKeys.push(key);
            }
          } catch (e) {
            // Remove malformed entries
            expiredKeys.push(key);
          }
        } else {
          // Remove missing entries from index
          expiredKeys.push(key);
        }
      });

      expiredKeys.forEach(key => localStorage.removeItem(key));
      this.updateCacheIndex(null, expiredKeys);

      if (expiredKeys.length > 0) {
        console.log(`💾 Cleaned up ${expiredKeys.length} expired cache entries`);
      }

      return expiredKeys.length;
    } catch (error) {
      console.error('Error during cache cleanup:', error);
      return 0;
    }
  }
}

// Crear instancia singleton
const localCacheService = new LocalCacheService();

// Limpieza automática cada 2 minutos (más frecuente)
setInterval(() => {
  localCacheService.cleanup();
}, 2 * 60 * 1000);

// Limpieza al cargar la página
window.addEventListener('load', () => {
  localCacheService.cleanup();
});

export default localCacheService; 