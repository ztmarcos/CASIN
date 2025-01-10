DROP TABLE IF EXISTS sharepoint_task_tags;
DROP TABLE IF EXISTS sharepoint_tags;
DROP TABLE IF EXISTS sharepoint_notifications;
DROP TABLE IF EXISTS sharepoint_collaborators;
DROP TABLE IF EXISTS sharepoint_tasks;

CREATE TABLE IF NOT EXISTS sharepoint_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'Media',
    status VARCHAR(50) DEFAULT 'Pendiente',
    assigned_to VARCHAR(255),
    created_by VARCHAR(255) NOT NULL,
    tags TEXT,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created_by (created_by)
); 