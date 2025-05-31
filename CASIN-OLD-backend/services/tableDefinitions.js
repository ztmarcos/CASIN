// Table definitions for all insurance types
const TABLE_DEFINITIONS = {
  // GMM (Gastos Médicos Mayores)
  GMM: {
    main: {
      name: 'GruposGMM',
      columns: [
        { name: 'numero_de_poliza', type: 'VARCHAR(50)', nullable: false },
        { name: 'contratante', type: 'VARCHAR(100)', nullable: false },
        { name: 'rfc', type: 'VARCHAR(13)', nullable: true },
        { name: 'domicilio', type: 'VARCHAR(255)', nullable: true },
        { name: 'desde_vigencia', type: 'DATE', nullable: false },
        { name: 'hasta_vigencia', type: 'DATE', nullable: false },
        { name: 'forma_de_pago', type: 'VARCHAR(50)', nullable: true },
        { name: 'fecha_de_expedicion', type: 'DATE', nullable: true },
        { name: 'planes', type: 'VARCHAR(100)', nullable: true },
        { name: 'suma_asegurada', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'deducible', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'coaseguro', type: 'DECIMAL(5,2)', nullable: true },
        { name: 'prima_neta', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'derecho_de_poliza', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'recargo_por_pago_fraccionado', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'prima_total', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'iva', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'total_a_pagar', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'nombre_del_agente', type: 'VARCHAR(100)', nullable: true },
        { name: 'clave_zona', type: 'VARCHAR(20)', nullable: true },
        { name: 'status', type: 'ENUM("Vigente 🟢","Cancelada 🔴")', nullable: false, default: 'Vigente 🟢' }
      ]
    },
    secondary: {
      name: 'GMMListado',
      columns: [
        { name: 'numero_de_certificado', type: 'VARCHAR(50)', nullable: false },
        { name: 'nombre_completo', type: 'VARCHAR(100)', nullable: false },
        { name: 'sexo', type: 'ENUM("M","F")', nullable: true },
        { name: 'edad', type: 'INT', nullable: true },
        { name: 'cobertura', type: 'VARCHAR(100)', nullable: true },
        { name: 'suma_asegurada', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'prima', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'fecha_de_antiguedad', type: 'DATE', nullable: true },
        { name: 'status', type: 'ENUM("Vigente 🟢","Baja 🔴")', nullable: false, default: 'Vigente 🟢' }
      ]
    }
  },

  // Autos
  AUTOS: {
    main: {
      name: 'GruposAutos',
      columns: [
        { name: 'numero_de_poliza', type: 'VARCHAR(50)', nullable: false },
        { name: 'contratante', type: 'VARCHAR(100)', nullable: false },
        { name: 'rfc', type: 'VARCHAR(13)', nullable: true },
        { name: 'desde_vigencia', type: 'DATE', nullable: false },
        { name: 'hasta_vigencia', type: 'DATE', nullable: false },
        { name: 'forma_de_pago', type: 'VARCHAR(50)', nullable: true },
        { name: 'fecha_de_expedicion', type: 'DATE', nullable: true },
        { name: 'prima_neta', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'derecho_de_poliza', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'recargo_por_pago_fraccionado', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'prima_total', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'iva', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'total_a_pagar', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'nombre_del_agente', type: 'VARCHAR(100)', nullable: true },
        { name: 'status', type: 'ENUM("Vigente 🟢","Cancelada 🔴")', nullable: false, default: 'Vigente 🟢' }
      ]
    },
    secondary: {
      name: 'AutosListado',
      columns: [
        { name: 'numero_de_certificado', type: 'VARCHAR(50)', nullable: false },
        { name: 'propietario', type: 'VARCHAR(100)', nullable: false },
        { name: 'marca', type: 'VARCHAR(50)', nullable: true },
        { name: 'modelo', type: 'VARCHAR(50)', nullable: true },
        { name: 'año', type: 'INT', nullable: true },
        { name: 'serie', type: 'VARCHAR(50)', nullable: true },
        { name: 'placas', type: 'VARCHAR(20)', nullable: true },
        { name: 'uso', type: 'VARCHAR(50)', nullable: true },
        { name: 'suma_asegurada', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'prima', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'status', type: 'ENUM("Vigente 🟢","Baja 🔴")', nullable: false, default: 'Vigente 🟢' }
      ]
    }
  },

  // Vida
  VIDA: {
    main: {
      name: 'GruposVida',
      columns: [
        { name: 'numero_de_poliza', type: 'VARCHAR(50)', nullable: false },
        { name: 'contratante', type: 'VARCHAR(100)', nullable: false },
        { name: 'rfc', type: 'VARCHAR(13)', nullable: true },
        { name: 'desde_vigencia', type: 'DATE', nullable: false },
        { name: 'hasta_vigencia', type: 'DATE', nullable: false },
        { name: 'forma_de_pago', type: 'VARCHAR(50)', nullable: true },
        { name: 'fecha_de_expedicion', type: 'DATE', nullable: true },
        { name: 'prima_neta', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'derecho_de_poliza', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'recargo_por_pago_fraccionado', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'prima_total', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'iva', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'total_a_pagar', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'nombre_del_agente', type: 'VARCHAR(100)', nullable: true },
        { name: 'status', type: 'ENUM("Vigente 🟢","Cancelada 🔴")', nullable: false, default: 'Vigente 🟢' }
      ]
    },
    secondary: {
      name: 'VidaListado',
      columns: [
        { name: 'numero_de_certificado', type: 'VARCHAR(50)', nullable: false },
        { name: 'nombre_completo', type: 'VARCHAR(100)', nullable: false },
        { name: 'fecha_nacimiento', type: 'DATE', nullable: true },
        { name: 'edad', type: 'INT', nullable: true },
        { name: 'suma_asegurada', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'prima', type: 'DECIMAL(12,2)', nullable: true },
        { name: 'beneficiarios', type: 'TEXT', nullable: true },
        { name: 'status', type: 'ENUM("Vigente 🟢","Baja 🔴")', nullable: false, default: 'Vigente 🟢' }
      ]
    }
  },

  // Single tables for other insurance types
  MASCOTAS: {
    name: 'Mascotas',
    columns: [
      { name: 'numero_de_poliza', type: 'VARCHAR(50)', nullable: false },
      { name: 'contratante', type: 'VARCHAR(100)', nullable: false },
      { name: 'nombre_mascota', type: 'VARCHAR(50)', nullable: false },
      { name: 'especie', type: 'VARCHAR(50)', nullable: true },
      { name: 'raza', type: 'VARCHAR(50)', nullable: true },
      { name: 'edad', type: 'INT', nullable: true },
      { name: 'desde_vigencia', type: 'DATE', nullable: false },
      { name: 'hasta_vigencia', type: 'DATE', nullable: false },
      { name: 'suma_asegurada', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'prima', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'status', type: 'ENUM("Vigente 🟢","Cancelada 🔴")', nullable: false, default: 'Vigente 🟢' }
    ]
  },

  TRANSPORTE: {
    name: 'Transporte',
    columns: [
      { name: 'numero_de_poliza', type: 'VARCHAR(50)', nullable: false },
      { name: 'contratante', type: 'VARCHAR(100)', nullable: false },
      { name: 'tipo_mercancia', type: 'VARCHAR(100)', nullable: true },
      { name: 'medio_transporte', type: 'VARCHAR(50)', nullable: true },
      { name: 'origen', type: 'VARCHAR(100)', nullable: true },
      { name: 'destino', type: 'VARCHAR(100)', nullable: true },
      { name: 'desde_vigencia', type: 'DATE', nullable: false },
      { name: 'hasta_vigencia', type: 'DATE', nullable: false },
      { name: 'suma_asegurada', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'prima', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'status', type: 'ENUM("Vigente 🟢","Cancelada 🔴")', nullable: false, default: 'Vigente 🟢' }
    ]
  },

  NEGOCIO: {
    name: 'Negocio',
    columns: [
      { name: 'numero_de_poliza', type: 'VARCHAR(50)', nullable: false },
      { name: 'contratante', type: 'VARCHAR(100)', nullable: false },
      { name: 'nombre_negocio', type: 'VARCHAR(100)', nullable: true },
      { name: 'giro', type: 'VARCHAR(100)', nullable: true },
      { name: 'ubicacion', type: 'VARCHAR(255)', nullable: true },
      { name: 'desde_vigencia', type: 'DATE', nullable: false },
      { name: 'hasta_vigencia', type: 'DATE', nullable: false },
      { name: 'suma_asegurada_contenidos', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'suma_asegurada_edificio', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'prima', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'status', type: 'ENUM("Vigente 🟢","Cancelada 🔴")', nullable: false, default: 'Vigente 🟢' }
    ]
  },

  HOGAR: {
    name: 'Hogar',
    columns: [
      { name: 'numero_de_poliza', type: 'VARCHAR(50)', nullable: false },
      { name: 'contratante', type: 'VARCHAR(100)', nullable: false },
      { name: 'ubicacion', type: 'VARCHAR(255)', nullable: true },
      { name: 'tipo_inmueble', type: 'VARCHAR(50)', nullable: true },
      { name: 'desde_vigencia', type: 'DATE', nullable: false },
      { name: 'hasta_vigencia', type: 'DATE', nullable: false },
      { name: 'suma_asegurada_contenidos', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'suma_asegurada_edificio', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'prima', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'status', type: 'ENUM("Vigente 🟢","Cancelada 🔴")', nullable: false, default: 'Vigente 🟢' }
    ]
  },

  RC: {
    name: 'ResponsabilidadCivil',
    columns: [
      { name: 'numero_de_poliza', type: 'VARCHAR(50)', nullable: false },
      { name: 'contratante', type: 'VARCHAR(100)', nullable: false },
      { name: 'tipo_responsabilidad', type: 'VARCHAR(100)', nullable: true },
      { name: 'actividad', type: 'VARCHAR(255)', nullable: true },
      { name: 'desde_vigencia', type: 'DATE', nullable: false },
      { name: 'hasta_vigencia', type: 'DATE', nullable: false },
      { name: 'suma_asegurada', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'prima', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'status', type: 'ENUM("Vigente 🟢","Cancelada 🔴")', nullable: false, default: 'Vigente 🟢' }
    ]
  }
};

module.exports = TABLE_DEFINITIONS; 