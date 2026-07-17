-- ==========================================
-- ESTRUCTURA DE BASE DE DATOS
-- ==========================================
CREATE DATABASE IF NOT EXISTS hominum_db;
USE hominum_db;

-- ==========================================
-- 1. DROP TABLES (Reverse Dependency Order)
-- ==========================================
DROP TABLE IF EXISTS general_time_entries;
DROP TABLE IF EXISTS patient_time_entries;
DROP TABLE IF EXISTS time_entries;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS volunteers;
DROP TABLE IF EXISTS contact_submissions;
DROP TABLE IF EXISTS event_types;

-- ==========================================
-- 2. CREATE TABLES
-- ==========================================

-- A. Voluntarios (No dependencies)
CREATE TABLE volunteers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_coordinator TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- B. Entradas de Tiempo (Depends on volunteers)
CREATE TABLE time_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    volunteer_id INT NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    comments TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_timeentry_volunteer
        FOREIGN KEY (volunteer_id)
        REFERENCES volunteers(id)
        ON DELETE CASCADE
);

-- C. Pacientes (Depends on volunteers)
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    assigned_volunteer_id INT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_patient_volunteer
        FOREIGN KEY (assigned_volunteer_id) 
        REFERENCES volunteers(id) 
        ON DELETE SET NULL
);

-- D. Relación paciente-entrada (Depends on time_entries and patients)
CREATE TABLE patient_time_entries (
    time_entry_id INT PRIMARY KEY,
    patient_id INT NOT NULL,
    CONSTRAINT fk_patienttimeentry_timeentry
        FOREIGN KEY (time_entry_id)
        REFERENCES time_entries(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_patienttimeentry_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE
);

-- E. Relación general-entrada (Depends on time_entries)
CREATE TABLE general_time_entries (
    time_entry_id INT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    CONSTRAINT fk_generaltimeentry_timeentry
        FOREIGN KEY (time_entry_id)
        REFERENCES time_entries(id)
        ON DELETE CASCADE
);

-- F. Solicitudes de Contacto (No dependencies)
CREATE TABLE contact_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'contacted', 'archived') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL
);

-- G. Tipos de Eventos (No dependencies)
CREATE TABLE event_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. DATOS DE SEMILLA
-- ==========================================

INSERT INTO volunteers (clerk_user_id, email, is_coordinator, is_active)
VALUES
    ('user_3FffVy66t3QKeVtG0lMisCZGbUj', 'oscar.trujillo1985@gmail.com', 1, 1),
    ('user_3FffcgASVfTP1wvNm3PZR6RSY4Z', 'oscartmxp@gmail.com', 0, 1);

INSERT INTO patients (name, assigned_volunteer_id)
VALUES
    ('María Carmen Gómez', 2),
    ('Manuel Rodríguez', NULL);

INSERT INTO event_types (name) 
VALUES ('Reunión'), ('Formación'), ('Administrativo'), ('Otro');



DROP TABLE IF EXISTS events;

CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ejemplo de inserción
INSERT INTO events (title, start_datetime, end_datetime) VALUES 
('Reunión de Equipo', '2026-07-15 09:00:00', '2026-07-15 10:30:00');
