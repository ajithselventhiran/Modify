-- =====================================================
-- 1️⃣ DATABASE உருவாக்கம்
-- =====================================================
CREATE DATABASE IF NOT EXISTS rapid_ticket_db
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rapid_ticket_db;



CREATE TABLE `tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emp_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reporting_to` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assigned_to` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `system_ip` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issue_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fixed_note` text COLLATE utf8mb4_unicode_ci,
  `status` enum('NOT_ASSIGNED','ASSIGNED','PENDING','INPROCESS','COMPLETE','FIXED','REJECTED') COLLATE utf8mb4_unicode_ci DEFAULT 'NOT_ASSIGNED',
  `priority` enum('Low','Medium','High') COLLATE utf8mb4_unicode_ci DEFAULT 'Medium',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_emp_id` (`emp_id`),
  KEY `idx_department` (`department`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_ticket_user` FOREIGN KEY (`emp_id`) REFERENCES `users` (`emp_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('MANAGER','TECHNICIAN','EMPLOYEE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emp_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reporting_to` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mail_pass` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `emp_id` (`emp_id`),
  KEY `idx_department` (`department`),
  KEY `idx_reporting_to` (`reporting_to`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- =====================================================
-- 4️⃣ SAMPLE DATA FOR USERS
-- =====================================================
INSERT INTO users (username, password, role, full_name, emp_id, department, reporting_to, email, mail_pass)
VALUES
-- Managers
('venkatesan', '1234', 'MANAGER', 'Venkatesan M', 'EMP001', 'IT', NULL, 'selventhiranajith2024@gmail.com', 'hhrjuskiqtuqptck'),
('nagarajan', '1234', 'MANAGER', 'Nagarajan M', 'EMP002', 'Maintenance', NULL, 'nagarajan@dbit.com', 'manager'),

-- Technicians
('rajkumar_tech', '1234', 'TECHNICIAN', 'Rajkumar P', 'EMP003', 'IT', 'Venkatesan M', 'rajkumar@dbit.com', 'manager'),
('piraba', '1234', 'TECHNICIAN', 'Piraba K', 'EMP004', 'Maintenance', 'Nagarajan M', 'ambikai19790326@gmail.com', 'zsoiuiwvqngyycql'),

-- Employees
('dinesh', '1234', 'EMPLOYEE', 'Dinesh S', 'EMP005', 'IT', 'Venkatesan M', 'murugan20050922@gmail.com', 'manager'),
('anita', '1234', 'EMPLOYEE', 'Anita R', 'EMP006', 'Maintenance', 'Nagarajan M', 'anita@dbit.com', 'manager');

-- =====================================================
-- 5️⃣ SAMPLE DATA FOR TICKETS
-- =====================================================
INSERT INTO tickets 
(username, emp_id, full_name, department, reporting_to, assigned_to, system_ip, issue_text, remarks, fixed_note, status, priority, start_date, end_date)
VALUES
('dinesh', 'EMP005', 'Dinesh S', 'IT', 'Venkatesan M', 'Rajkumar P', '192.168.1.25', 
 'System not booting properly after Windows update.', 
 'Urgent request from IT Lab 2', 
 'Reinstalled Windows and updated drivers', 
 'FIXED', 'High', '2025-10-10', '2025-10-11'),

('anita', 'EMP006', 'Anita R', 'Maintenance', 'Nagarajan M', 'Piraba K', '192.168.1.45', 
 'Printer not connecting to network.', 
 'Check before monthly report submission', 
 NULL, 
 'INPROCESS', 'Medium', '2025-10-15', NULL);
