-- Crear la tabla directorio_contactos
CREATE TABLE IF NOT EXISTS directorio_contactos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  origen VARCHAR(255),
  comentario TEXT,
  nombre_completo VARCHAR(255) NOT NULL,
  nombre_completo_oficial VARCHAR(255),
  nickname VARCHAR(255),
  apellido VARCHAR(255),
  display_name VARCHAR(255),
  empresa VARCHAR(255),
  telefono_oficina VARCHAR(50),
  telefono_casa VARCHAR(50),
  telefono_asistente VARCHAR(50),
  telefono_movil VARCHAR(50),
  telefonos_corregidos VARCHAR(255),
  email VARCHAR(255),
  entidad VARCHAR(255),
  genero ENUM('Masculino', 'Femenino', 'Otro'),
  status_social VARCHAR(255),
  ocupacion VARCHAR(255),
  pais VARCHAR(255) DEFAULT 'MÉXICO',
  status ENUM('prospecto', 'cliente', 'inactivo') DEFAULT 'prospecto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar algunos datos de ejemplo
INSERT INTO directorio_contactos (nombre_completo, email, telefono_movil, empresa, ocupacion, origen, comentario) VALUES
('Juan Pérez García', 'juan.perez@email.com', '555-1234', 'Empresa ABC', 'Gerente General', 'Referido', 'Cliente potencial interesado en seguros de vida'),
('María López Rodríguez', 'maria.lopez@email.com', '555-5678', 'Consultoría XYZ', 'Consultora', 'Web', 'Contacto desde página web'),
('Carlos Mendoza Torres', 'carlos.mendoza@email.com', '555-9012', 'Industrias DEF', 'Director Financiero', 'Evento', 'Conocido en evento de networking'); 