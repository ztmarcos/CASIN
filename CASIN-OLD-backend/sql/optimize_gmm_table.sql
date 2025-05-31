-- Optimize GMM table structure
ALTER TABLE `gmm`
  -- Fix column names with encoding issues
  CHANGE COLUMN `n__mero_de_p__liza` `numero_de_poliza` VARCHAR(50) NULL,
  CHANGE COLUMN `direcci__n` `direccion` VARCHAR(255) NULL,
  CHANGE COLUMN `tel__fono` `telefono` VARCHAR(20) NULL,
  CHANGE COLUMN `c__digo_cliente` `codigo_cliente` VARCHAR(50) NULL,
  CHANGE COLUMN `vigencia__inicio_` `vigencia_inicio` DATE NULL,
  CHANGE COLUMN `vigencia__fin_` `vigencia_fin` DATE NULL,
  CHANGE COLUMN `duraci__n` `duracion` VARCHAR(50) NULL,
  CHANGE COLUMN `derecho_de_p__liza` `derecho_de_poliza` DECIMAL(10,2) NULL,
  CHANGE COLUMN `i_v_a__16_` `iva` DECIMAL(10,2) NULL,
  CHANGE COLUMN `versi__n` `version` VARCHAR(50) NULL,

  -- Convert numeric fields to proper types
  MODIFY COLUMN `prima_neta` DECIMAL(12,2) NULL,
  MODIFY COLUMN `recargo_por_pago_fraccionado` DECIMAL(10,2) NULL,
  MODIFY COLUMN `importe_total_a_pagar` DECIMAL(12,2) NULL,
  MODIFY COLUMN `monto_parcial` DECIMAL(12,2) NULL,
  MODIFY COLUMN `no__de_pago` INT NULL,

  -- Convert date fields to proper type
  MODIFY COLUMN `fecha_de_expedici__n` DATE NULL,
  MODIFY COLUMN `fecha_nacimiento_asegurado` DATE NULL,

  -- Add indexes for better performance
  ADD INDEX `idx_numero_poliza` (`numero_de_poliza`),
  ADD INDEX `idx_contratante` (`contratante`),
  ADD INDEX `idx_vigencia` (`vigencia_inicio`, `vigencia_fin`);

-- Add constraints
ALTER TABLE `gmm`
  ADD CONSTRAINT `chk_email` CHECK (`e_mail` REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT `chk_rfc` CHECK (`rfc` REGEXP '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$'); 