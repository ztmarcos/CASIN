/**
 * Team utility functions
 */

/**
 * Removes "Team" suffix from team names for cleaner display
 * @param {string} teamName - The original team name
 * @returns {string} - The cleaned team name without "Team" suffix
 * 
 * Examples:
 * "CASIN Team" -> "CASIN"
 * "Marketing Team" -> "Marketing"
 * "CASIN" -> "CASIN" (no change if no "Team" suffix)
 */
export const getCleanTeamName = (teamName) => {
  if (!teamName) return '';
  return teamName.replace(/\s+Team\s*$/i, '').trim();
};

/**
 * Gets the display name for a team with optional fallback
 * @param {object} team - The team object
 * @param {string} fallback - Fallback text if team name is not available
 * @returns {string} - The clean team display name
 */
export const getTeamDisplayName = (team, fallback = 'Equipo') => {
  if (!team || !team.name) return fallback;
  return getCleanTeamName(team.name);
}; 