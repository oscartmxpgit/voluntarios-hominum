-- ==========================================
-- ESTRUCTURA DE BASE DE DATOS
-- ==========================================
CREATE DATABASE IF NOT EXISTS hominum_db;

USE hominum_db;

-- 1. Voluntarios
DROP TABLE IF EXISTS volunteers;

CREATE TABLE volunteers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_coordinator TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Updated insertion script
INSERT INTO
    volunteers (clerk_user_id, email, is_coordinator, is_active)
VALUES
    (
        'user_3FffVy66t3QKeVtG0lMisCZGbUj',
        'oscar.trujillo1985@gmail.com',
        1,
        1
    ),
    (
        'user_3FffcgASVfTP1wvNm3PZR6RSY4Z',
        'oscartmxp@gmail.com',
        0,
        1
    );

-- 2. Entradas de Tiempo
DROP TABLE IF EXISTS time_entries;

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

DROP TABLE IF EXISTS patient_time_entries;

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

DROP TABLE IF EXISTS general_time_entries;

CREATE TABLE general_time_entries (
    time_entry_id INT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,

    CONSTRAINT fk_generaltimeentry_timeentry
        FOREIGN KEY (time_entry_id)
        REFERENCES time_entries(id)
        ON DELETE CASCADE
);

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
    assigned_volunteer_id INT NULL,
    -- Enlazado al ID del voluntario de la tabla volunteers
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_volunteer_id) REFERENCES volunteers(id) ON DELETE
    SET
        NULL
);

-- Datos de semilla opcionales para pruebas
INSERT INTO
    patients (name, assigned_volunteer_id)
VALUES
    ('María Carmen Gómez', 2),
    -- Suponiendo que el ID 2 es 'oscartmxp@gmail.com'
    ('Manuel Rodríguez', NULL);


DROP TABLE IF EXISTS event_types;

CREATE TABLE event_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos iniciales
INSERT INTO event_types (name) VALUES ('Reunión'), ('Formación'), ('Administrativo'), ('Otro');