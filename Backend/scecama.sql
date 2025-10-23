-- =====================================================
-- 1️⃣ DATABASE CREATE & USE
-- =====================================================
CREATE DATABASE IF NOT EXISTS rapid_ticket_db
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rapid_ticket_db;


-- =====================================================
-- 2️⃣ USERS_LOGIN TABLE  (Login credentials + role)
-- =====================================================
CREATE TABLE users_login (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  password VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  role ENUM('MANAGER','STAFF') COLLATE utf8mb4_unicode_ci NOT NULL,
  display_name VARCHAR(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 🔹 Sample Data
INSERT INTO users_login (username, password, role, display_name) VALUES
('venkatesan', '1234', 'MANAGER', 'Venkatesan M'),
('rajkumar', '1234', 'STAFF', 'Rajkumar P'),
('piraba', '1234', 'STAFF', 'Piraba K'),
('harini', '1234', 'STAFF', 'Harini S');


-- =====================================================
-- 3️⃣ EMPLOYEES TABLE (Employee master + reporting_to = Manager)
-- =====================================================
CREATE TABLE employees (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  full_name VARCHAR(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  emp_id VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  department VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  reporting_to VARCHAR(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  email VARCHAR(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY (username),
  KEY idx_emp_id (emp_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 🔹 Sample Data
INSERT INTO employees (username, full_name, emp_id, department, reporting_to, email) VALUES
('venkatesan', 'Venkatesan M', 'EMP001', 'IT', NULL, 'venkatesan@company.com'),
('rajkumar', 'Rajkumar P', 'EMP002', 'IT', 'Venkatesan M', 'rajkumar@company.com'),
('piraba', 'Piraba K', 'EMP003', 'Support', 'Venkatesan M', 'piraba@company.com'),
('harini', 'Harini S', 'EMP004', 'Finance', 'Venkatesan M', 'harini@company.com');


-- =====================================================
-- 4️⃣ TICKETS TABLE (Foreign key → employees.emp_id)
-- =====================================================
CREATE TABLE tickets (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  emp_id VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  full_name VARCHAR(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  department VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  reporting_to VARCHAR(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  assigned_to VARCHAR(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  system_ip VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  issue_text TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  remarks VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  fixed_note TEXT COLLATE utf8mb4_unicode_ci,
  status ENUM('NOT_ASSIGNED','ASSIGNED','PENDING','INPROCESS','COMPLETE','FIXED') COLLATE utf8mb4_unicode_ci DEFAULT 'NOT_ASSIGNED',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  priority ENUM('Low','Medium','High') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_emp_id (emp_id),
  KEY idx_department (department),
  KEY idx_reporting_to (reporting_to),
  KEY idx_assigned_to (assigned_to),
  KEY idx_status (status),
  KEY idx_created_at (created_at),
  CONSTRAINT fk_ticket_employee FOREIGN KEY (emp_id) REFERENCES employees (emp_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 🔹 Sample Data
INSERT INTO tickets 
(username, emp_id, full_name, department, reporting_to, assigned_to, system_ip, issue_text, remarks, status, priority, start_date, end_date)
VALUES
('rajkumar', 'EMP002', 'Rajkumar P', 'IT', 'Venkatesan M', NULL, '192.168.1.10', 'System not booting', 'Urgent issue', 'NOT_ASSIGNED', 'High', NULL, NULL),
('piraba', 'EMP003', 'Piraba K', 'Support', 'Venkatesan M', 'Rajkumar P', '192.168.1.15', 'Email not working', 'Check Outlook config', 'ASSIGNED', 'Medium', '2025-10-20', '2025-10-25'),
('harini', 'EMP004', 'Harini S', 'Finance', 'Venkatesan M', 'Piraba K', '192.168.1.18', 'Printer offline', 'Need driver reinstall', 'PENDING', 'Low', '2025-10-22', '2025-10-24');
