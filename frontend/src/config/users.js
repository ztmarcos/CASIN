// Configuración de usuarios compartida entre TableMail y Tasks
export const SENDER_OPTIONS = [
  {
    label: 'CASIN Seguros (casinseguros@gmail.com)',
    value: import.meta.env.VITE_SMTP_USER_CASIN || 'casinseguros@gmail.com',
    pass: import.meta.env.VITE_SMTP_PASS_CASIN,
    name: 'CASIN Seguros',
    email: 'casinseguros@gmail.com',
    role: 'admin',
    avatar: '🏢'
  },
  {
    label: 'Lorena Acosta - CASIN Seguros (lorenacasin5@gmail.com)',
    value: import.meta.env.VITE_SMTP_USER_LORE || 'lorenacasin5@gmail.com',
    pass: import.meta.env.VITE_SMTP_PASS_LORE,
    name: 'Lorena Acosta - CASIN Seguros',
    email: 'lorenacasin5@gmail.com',
    role: 'user',
    avatar: '👩‍💼'
  },
  {
    label: 'Michell Diaz - CASIN Seguros (michelldiaz.casinseguros@gmail.com)',
    value: import.meta.env.VITE_SMTP_USER_MICH || 'michelldiaz.casinseguros@gmail.com',
    pass: import.meta.env.VITE_SMTP_PASS_MICH,
    name: 'Michell Diaz - CASIN Seguros',
    email: 'michelldiaz.casinseguros@gmail.com',
    role: 'user',
    avatar: '👩‍💼'
  },
  {
    label: 'Marquitos (z.t.marcos@gmail.com)',
    value: import.meta.env.VITE_SMTP_USER_MARCOS || 'z.t.marcos@gmail.com',
    pass: import.meta.env.VITE_SMTP_PASS_MARCOS,
    name: 'Marquitos',
    email: 'z.t.marcos@gmail.com',
    role: 'admin',
    avatar: '👨‍💻'
  },
  {
    label: 'Test Team - Marcos (z.t.marcos@gmail.com)',
    value: import.meta.env.VITE_SMTP_USER_MARCOS || 'z.t.marcos@gmail.com',
    pass: import.meta.env.VITE_SMTP_PASS_MARCOS,
    name: 'Test Team - Marcos',
    email: 'z.t.marcos@gmail.com',
    role: 'admin',
    avatar: '🧪'
  }
];

// Función para obtener usuarios en formato para Tasks
export const getTaskUsers = () => {
  return SENDER_OPTIONS.map(user => ({
    id: user.email,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isCurrentUser: false // Se determinará dinámicamente
  }));
};

// Función para obtener usuarios en formato para TableMail
export const getSenderOptions = () => {
  return SENDER_OPTIONS.map(user => ({
    label: `${user.name} (${user.email})`,
    value: user.value,
    pass: user.pass,
    name: user.name,
    email: user.email // Agregar email para poder buscar por email
  }));
};
