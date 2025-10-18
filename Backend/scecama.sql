CREATE DATABASE IF NOT EXISTS rapid_ticket_db
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rapid_ticket_db;


CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  emp_id VARCHAR(50) NOT NULL,
  department VARCHAR(100) NOT NULL,
  reporting_to VARCHAR(150) NULL,
  email VARCHAR(160) NULL
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  emp_id VARCHAR(50) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  department VARCHAR(100) NOT NULL,
  system_ip VARCHAR(60) NOT NULL,
  issue_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


ALTER TABLE tickets
ADD COLUMN reporting_to VARCHAR(150) NOT NULL AFTER department;


ALTER TABLE tickets ADD COLUMN remarks VARCHAR(255) AFTER issue_text;


ALTER TABLE employees ADD INDEX idx_emp_id (emp_id);
ALTER TABLE tickets ADD INDEX idx_emp_id (emp_id);
ALTER TABLE tickets ADD INDEX idx_department (department);
ALTER TABLE tickets MODIFY system_ip VARCHAR(60);
-- விருப்பம்
ALTER TABLE tickets
ADD CONSTRAINT fk_ticket_employee
FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
ON DELETE CASCADE ON UPDATE CASCADE;





INSERT INTO employees (username, full_name, emp_id, department, reporting_to, email) VALUES
('prainila', 'Prainila Koneswaran', 'EMP-1001', 'IT', 'Murugan R', 'prainila@example.com'),
('nagarajan', 'Nagarajan M', 'EMP-1002', 'Production', 'Venkatesan K', 'nagarajan@example.com'),
('murugan', 'Murugan R', 'EMP-1003', 'Sales', 'Rajkumar', 'murugan@example.com');
