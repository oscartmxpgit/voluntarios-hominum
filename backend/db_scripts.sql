-- ==========================================
-- ESTRUCTURA DE BASE DE DATOS
-- ==========================================
CREATE DATABASE IF NOT EXISTS hominum_db;
USE hominum_db;

-- 1. Usuarios
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL, -- ID único de Clerk
    email VARCHAR(255) NOT NULL UNIQUE,
    is_coordinator TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Entradas de Tiempo
DROP TABLE IF EXISTS time_entries;
CREATE TABLE time_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    volunteer_email VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL,

    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    patient_name VARCHAR(255) NULL,
    comments TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- DATOS DE SEMILLA (MODIFICA LOS IDs)
-- ==========================================
-- Inserta aquí los IDs reales obtenidos de tu panel de Clerk:
INSERT INTO users (clerk_user_id, email, is_coordinator) VALUES 
('user_3FffVy66t3QKeVtG0lMisCZGbUj', 'oscar.trujillo1985@gmail.com', 1),
('user_3FffcgASVfTP1wvNm3PZR6RSY4Z', 'oscartmxp@gmail.com', 0);

-- Datos de prueba para entradas de tiempo
INSERT INTO time_entries (volunteer_email, task_name, start_datetime, end_datetime, patient_name) VALUES 
('oscartmxp@gmail.com', 'Visita domiciliaria', '2026-06-26 10:00:00', '2026-06-26 12:00:00', 'Juan Perez');


-- ==========================================
-- 3. Tabla de Solicitudes de Contacto
-- ==========================================
DROP TABLE IF EXISTS contact_submissions;
CREATE TABLE contact_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    message TEXT NOT NULL,
    
    -- Campos de gestión para el coordinador
    status ENUM('pending', 'contacted', 'archived') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL
);

-- ==========================================
-- 4. Tabla de Pacientes
-- ==========================================
DROP TABLE IF EXISTS patients;
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    assigned_volunteer_id INT NULL, -- Enlazado al ID del voluntario de la tabla users
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_volunteer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Datos de semilla opcionales para pruebas
INSERT INTO patients (name, assigned_volunteer_id) VALUES 
('María Carmen Gómez', 2), -- Suponiendo que el ID 2 es 'oscartmxp@gmail.com'
('Manuel Rodríguez', NULL);