export const TASK_STATUS_OPTIONS = [
  { value: 'Por iniciar', label: 'Por iniciar' },
  { value: 'En progreso', label: 'En progreso' },
  { value: 'Listo', label: 'Listo' }
];

export const PROPERTY_CONFIGS = {
  title: {
    type: 'title',
    formatValue: value => ({
      title: [{
        text: { content: value || '' }
      }]
    })
  },
  Status: {
    type: 'status',
    formatValue: value => ({
      status: { name: value || 'Por iniciar' }
    })
  },
  'Fecha límite': {
    type: 'date',
    formatValue: value => ({
      date: value ? { start: value, time_zone: null } : null
    })
  },
  Descripción: {
    type: 'rich_text',
    formatValue: value => ({
      rich_text: [{
        text: { content: value || '' }
      }]
    })
  },
  Encargado: {
    type: 'people',
    formatValue: value => ({
      people: value ? [{
        id: value
      }] : []
    })
  }
}; 