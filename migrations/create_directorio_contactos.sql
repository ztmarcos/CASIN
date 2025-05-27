CREATE TABLE IF NOT EXISTS directorio_contactos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Información básica
  origen VARCHAR(50),
  comentario TEXT,
  nombre_completo VARCHAR(255),
  nombre_completo_oficial VARCHAR(255),
  nickname VARCHAR(100),
  apellido VARCHAR(100),
  display_name VARCHAR(255),
  
  -- Información de contacto
  empresa VARCHAR(255),
  telefono_oficina VARCHAR(50),
  telefono_casa VARCHAR(50),
  telefono_asistente VARCHAR(50),
  telefono_movil VARCHAR(50),
  telefonos_corregidos VARCHAR(255),
  email VARCHAR(255),
  
  -- Información personal/profesional
  entidad VARCHAR(100),
  genero ENUM('MASCULINO', 'FEMENINO', 'OTRO'),
  status_social VARCHAR(100),
  ocupacion VARCHAR(255),
  pais VARCHAR(100) DEFAULT 'MÉXICO',
  
  -- Estado del contacto
  status ENUM('cliente', 'prospecto', 'inactivo') DEFAULT 'prospecto',
  
  -- Campos de auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices para búsquedas eficientes
  INDEX idx_nombre_completo (nombre_completo),
  INDEX idx_email (email),
  INDEX idx_empresa (empresa),
  INDEX idx_telefono_movil (telefono_movil),
  INDEX idx_status (status),
  INDEX idx_origen (origen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 