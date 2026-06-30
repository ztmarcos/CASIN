const ICON_PROPS = {
  width: 40,
  height: 40,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const icons = {
  autos: (
    <svg {...ICON_PROPS}>
      <path d="M4 14.5h16" />
      <path d="M5 14.5 6.8 9.5h1.7l1.2-2h3.6l1.2 2h1.7L20 14.5" />
      <path d="M9.5 9.5h5" />
      <circle cx="7.5" cy="14.5" r="2" />
      <circle cx="16.5" cy="14.5" r="2" />
    </svg>
  ),
  gmm: (
    <svg {...ICON_PROPS}>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M12 10v6" />
      <path d="M9 13h6" />
      <path d="M8 6V4h8v2" />
    </svg>
  ),
  hogar: (
    <svg {...ICON_PROPS}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  ),
  vida: (
    <svg {...ICON_PROPS}>
      <path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.4-7 10-7 10z" />
    </svg>
  ),
  diversos: (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  ),
  mascotas: (
    <svg {...ICON_PROPS}>
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="16" cy="8" r="1.5" />
      <circle cx="5.5" cy="12.5" r="1.5" />
      <circle cx="18.5" cy="12.5" r="1.5" />
      <path d="M12 11c-2.8 0-5 1.8-5 4.2 0 2.2 2.2 3.8 5 3.8s5-1.6 5-3.8C17 12.8 14.8 11 12 11z" />
    </svg>
  ),
  negocio: (
    <svg {...ICON_PROPS}>
      <rect x="4" y="8" width="16" height="12" rx="1.5" />
      <path d="M8 20v-4h8v4" />
      <path d="M9 8V6h6v2" />
      <path d="M4 12h16" />
    </svg>
  ),
  rc: (
    <svg {...ICON_PROPS}>
      <path d="M2 16h20" />
      <path d="M2 20h20" />
      <path d="M6 18h2.5" />
      <path d="M11.5 18h2.5" />
      <path d="M17 18h2.5" />
      <path d="M10 16v4" />
      <path d="M12 16v4" />
      <path d="M14 16v4" />
      <circle cx="8.5" cy="8" r="1.35" />
      <path d="M8.5 9.5v3.2" />
      <path d="M8.5 10.8 6.2 12.8" />
      <path d="M8.5 10.8l2.4 1.5" />
      <path d="M8.5 12.7 6.8 15.2" />
      <path d="M8.5 12.7l2.2 1.8" />
    </svg>
  ),
  transporte: (
    <svg {...ICON_PROPS}>
      <path d="M3 8h12v8H3z" />
      <path d="M15 10h3l3 3v3h-6z" />
      <circle cx="7" cy="18" r="1.75" />
      <circle cx="18" cy="18" r="1.75" />
      <path d="M3 14h18" />
    </svg>
  ),
  default: (
    <svg {...ICON_PROPS}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </svg>
  ),
};

export const TABLE_DISPLAY_NAMES = {
  autos: 'Autos',
  gmm: 'GMM',
  hogar: 'Hogar',
  vida: 'Vida',
  diversos: 'Diversos',
  mascotas: 'Mascotas',
  negocio: 'Negocio',
  rc: 'Responsabilidad Civil',
  transporte: 'Transporte',
};

export function getTableDisplayName(tableName) {
  return TABLE_DISPLAY_NAMES[tableName?.toLowerCase()] || tableName;
}

export function getTableIconClassName(tableName) {
  const key = (tableName || '').toLowerCase();
  return key === 'autos' ? 'table-card-icon table-card-icon--autos' : 'table-card-icon';
}

export default function TableCategoryIcon({ tableName }) {
  const key = (tableName || '').toLowerCase();
  return icons[key] || icons.default;
}
