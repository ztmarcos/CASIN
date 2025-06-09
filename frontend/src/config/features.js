// Feature flags configuration
export const FEATURES = {
  // Re-enable directorio now that Firebase billing is activated
  DIRECTORIO_ENABLED: true, // ✅ Enabled with Blaze plan
  
  // Other features
  BIRTHDAYS_ENABLED: true,
  REPORTS_ENABLED: true,
  TABLES_ENABLED: true,
  
  // Pagination settings
  DEFAULT_PAGE_SIZE: 25, // Reduced from 50 to be more efficient
  MAX_PAGE_SIZE: 100
};

export default FEATURES; 