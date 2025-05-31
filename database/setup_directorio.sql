-- Create database for directorio
CREATE DATABASE IF NOT EXISTS directorio_db;
USE directorio_db;

-- Create the directorio_contactos table
CREATE TABLE directorio_contactos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  origen VARCHAR(100),
  comentario TEXT,
  nombre_completo VARCHAR(255) NOT NULL,
  empresa VARCHAR(255),
  telefono_movil VARCHAR(20),
  email VARCHAR(255),
  ocupacion VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO directorio_contactos (origen, comentario, nombre_completo, empresa, telefono_movil, email, ocupacion) VALUES
('Web', 'Contacto inicial por formulario', 'Ana García López', 'Tecnologías ABC', '+52 55 1234 5678', 'ana.garcia@tecabc.com', 'Desarrolladora Senior'),
('Referencia', 'Recomendado por cliente actual', 'Carlos Martínez', 'Consultores XYZ', '+52 55 8765 4321', 'carlos.martinez@consxyz.com', 'Consultor de TI'),
('LinkedIn', 'Conexión profesional', 'María Rodríguez', 'Innovación Digital', '+52 55 2468 1357', 'maria.rodriguez@innovdig.com', 'Gerente de Proyecto'),
('Evento', 'Conocido en conferencia tech', 'Juan Pérez', 'StartUp Solutions', '+52 55 1357 2468', 'juan.perez@startup.com', 'CTO'),
('Web', 'Interesado en servicios', 'Laura Fernández', 'Empresa Global', '+52 55 9876 5432', 'laura.fernandez@global.com', 'Directora de Operaciones');

-- Verify the data was inserted
SELECT * FROM directorio_contactos;

-- Show table structure
DESCRIBE directorio_contactos; 