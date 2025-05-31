-- Drop the primary key constraint first
ALTER TABLE `autos` DROP PRIMARY KEY;

-- Modify the id column to ensure proper AUTO_INCREMENT setup
ALTER TABLE `autos` MODIFY COLUMN `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY; 