ALTER TABLE file_metadata
ADD COLUMN record_id INT NULL,
ADD INDEX idx_table_record (table_name, record_id); 