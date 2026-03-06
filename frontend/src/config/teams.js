/**
 * ID del equipo CASIN canónico (el más activo).
 * Solo debe aparecer un CASIN en el selector; los demás equipos con nombre CASIN se ocultan.
 */
export const CASIN_TEAM_ID = '4JlUqhAvfJMlCDhQ4vgH';

/** IDs de equipos CASIN duplicados que deben redirigirse al canónico (para no usar el equivocado). */
export const CASIN_DUPLICATE_IDS = ['ngXzjqxlBy8Bsv8ks3vc'];

export function isCasinTeamId(teamId) {
  return teamId === CASIN_TEAM_ID;
}

/** Si el usuario tenía guardado un CASIN duplicado, devolver el canónico. */
export function resolveToCanonicalCasin(teamId) {
  if (!teamId) return teamId;
  return CASIN_DUPLICATE_IDS.includes(teamId) ? CASIN_TEAM_ID : teamId;
}

/**
 * Filtra la lista de equipos para mostrar solo un CASIN (el canónico).
 * Si hay varios equipos con nombre "CASIN", solo se incluye el de CASIN_TEAM_ID.
 */
export function filterToSingleCasin(teams) {
  if (!Array.isArray(teams)) return teams;
  const casinNameMatch = (name) => (name || '').toLowerCase().includes('casin');
  const isOtherCasin = (t) => casinNameMatch(t.name) && t.id !== CASIN_TEAM_ID;
  return teams.filter((t) => !isOtherCasin(t));
}
