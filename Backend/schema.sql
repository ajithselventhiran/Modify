--  DATABASE 
CREATE DATABASE IF NOT EXISTS rapid_ticket_db
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


USE rapid_ticket_db;
CREATE TABLE `tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `emp_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reporting_to` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assigned_to` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `system_ip` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issue_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fixed_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('NOT_ASSIGNED','ASSIGNED','NOT_STARTED','INPROCESS','COMPLETE','REJECTED') COLLATE utf8mb4_unicode_ci DEFAULT 'NOT_ASSIGNED',
  `priority` enum('Low','Medium','High') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Medium',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_emp_id` (`emp_id`),
  KEY `idx_department` (`department`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_ticket_user` FOREIGN KEY (`emp_id`) REFERENCES `users` (`emp_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('ADMIN','TECHNICIAN','USER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `emp_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reporting_to` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mail_pass` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `emp_id` (`emp_id`),
  KEY `idx_department` (`department`),
  KEY `idx_reporting_to` (`reporting_to`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



INSERT INTO users (username, password, role, full_name, emp_id, department, reporting_to, email, mail_pass)
VALUES
-- Admins
('venkatesan', '1234', 'ADMIN', 'Venkatesan M', 'EMP001', 'IT', NULL, 'selventhiranajith2024@gmail.com', 'hhrjuskiqtuqptck'),
('nagarajan', '1234', 'ADMIN', 'Nagarajan M', 'EMP002', 'Maintenance', NULL, 'nagarajan@dbit.com', 'manager'),

-- Technicians
('rajkumar_tech', '1234', 'TECHNICIAN', 'Rajkumar P', 'EMP003', 'IT', 'Venkatesan M', 'rajkumar@dbit.com', 'manager'),
('piraba', '1234', 'TECHNICIAN', 'Piraba K', 'EMP004', 'Maintenance', 'Nagarajan M', 'ambikai19790326@gmail.com', 'ehbsgzkhocbxumow'),

-- Users
('Ajith', '1234', 'USER', 'Selventhian Ajith', 'EMP005', 'IT', 'Venkatesan M', 'murugan20050922@gmail.com', 'manager'),
('Lagithana', '1234', 'USER', 'Lagithana Lagi', 'EMP006', 'Maintenance', 'Nagarajan M', 'ashokkumarlagirththana@gmail.com', 'manager');


