USE hominum_db;

START TRANSACTION;

-- =====================================================
-- 1. UPDATE EXISTING VOLUNTEERS
-- =====================================================

UPDATE volunteers
SET residencia = CASE email
    WHEN 'david.djst1998@gmail.com' THEN 'Madre Elisea'
    WHEN 'fersanroman0805@gmail.com' THEN 'Madre Elisea'
    WHEN 'angelesmrterapeuta@gmail.com' THEN 'La Saleta'
    WHEN 'isabeltrabajobiografico@gmail.com' THEN 'Vistasol'
    WHEN 'mcshlife1@gmail.com' THEN 'Vistasol'
    WHEN 'javierporzuna@gmail.com' THEN 'Nuestra señora de Lourdes'
    WHEN 'ysiaddaisy7@gmail.com' THEN 'Vistasol'
    WHEN 'beagozal1967@gmail.com' THEN 'domicilio'
    WHEN 'amadeubenedetti1962@gmail.com' THEN 'La Saleta'
    WHEN 'gonzpita@gmail.com' THEN 'domicilio'
    WHEN 'mercedescruzmolina@gmail.com' THEN 'Nuestra señora de Lourdes'
    WHEN 'nununiki.katamadze@gmail.com' THEN 'Nuestra señora de Lourdes'
    WHEN 'rosa.arjona74@gmail.com' THEN 'domicilio'
    WHEN 'giaannapeña@gmail.com' THEN 'Vistasol'
    WHEN 'laurayanezferrando1510@gmail.com' THEN 'La Saleta'
    WHEN 'jimenez@jimenez-abogados.es' THEN 'La Saleta'
    WHEN 'valentinl@telefonica.net' THEN 'Vistasol'
    WHEN 'noemisellerspastor.n@gmail.com' THEN 'La Saleta'
    ELSE residencia
END
WHERE email IN (
    'david.djst1998@gmail.com',
    'fersanroman0805@gmail.com',
    'angelesmrterapeuta@gmail.com',
    'isabeltrabajobiografico@gmail.com',
    'mcshlife1@gmail.com',
    'javierporzuna@gmail.com',
    'ysiaddaisy7@gmail.com',
    'beagozal1967@gmail.com',
    'amadeubenedetti1962@gmail.com',
    'gonzpita@gmail.com',
    'mercedescruzmolina@gmail.com',
    'nununiki.katamadze@gmail.com',
    'rosa.arjona74@gmail.com',
    'giaannapeña@gmail.com',
    'laurayanezferrando1510@gmail.com',
    'jimenez@jimenez-abogados.es',
    'valentinl@telefonica.net',
    'noemisellerspastor.n@gmail.com'
);


-- =====================================================
-- 2. DEACTIVATE VOLUNTEERS MARKED "BAJA"
-- =====================================================

UPDATE volunteers
SET is_active = 0
WHERE email IN (
    'zoarecarranza@gmail.com',
    'mercedesacuniau@gmail.com'
);


-- =====================================================
-- 3. INSERT NEW VOLUNTEERS
-- =====================================================

INSERT INTO volunteers
(clerk_user_id, email, full_name, residencia, is_coordinator, is_active)
SELECT
    'user_3LsPfBe0JUplsIXa0nxIE4FKdEO',
    'segisalex@gmail.com',
    'Segismundo Ramón',
    'La Saleta', 0, 1
WHERE NOT EXISTS (
    SELECT 1 FROM volunteers
    WHERE email = 'segisalex@gmail.com'
);

INSERT INTO volunteers
(clerk_user_id, email, full_name, residencia, is_coordinator, is_active)
SELECT
    'user_3LsPjUTCXnX0v8aYLISixBrkG2Q',
    'cmarcomarhuenda@gmail.com',
    'Claudina Marco',
    'domicilio', 0, 1
WHERE NOT EXISTS (
    SELECT 1 FROM volunteers
    WHERE email = 'cmarcomarhuenda@gmail.com'
);

INSERT INTO volunteers
(clerk_user_id, email, full_name, residencia, is_coordinator, is_active)
SELECT
    'user_3LsPmSv0Dq5ltSoBPEKV7rpbZGt',
    'gfl0002@alu.medac.es',
    'Giulia Flores',
    'La Saleta', 0, 1
WHERE NOT EXISTS (
    SELECT 1 FROM volunteers
    WHERE email = 'gfl0002@alu.medac.es'
);


-- =====================================================
-- 4. INSERT NEW PATIENT ASSIGNMENTS
-- Existing patients are preserved.
-- =====================================================

-- Noemi Pastor -> Eugenia
INSERT INTO patients (name, assigned_volunteer_id, status)
SELECT 'Eugenia', v.id, 'active'
FROM volunteers v
WHERE v.email = 'noemisellerspastor.n@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM patients p
    WHERE p.assigned_volunteer_id = v.id
      AND p.name = 'Eugenia'
);

-- Segismundo Ramón -> Antonio
INSERT INTO patients (name, assigned_volunteer_id, status)
SELECT 'Antonio', v.id, 'active'
FROM volunteers v
WHERE v.email = 'segisalex@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM patients p
    WHERE p.assigned_volunteer_id = v.id
      AND p.name = 'Antonio'
);

-- Claudina Marco -> Isabel
INSERT INTO patients (name, assigned_volunteer_id, status)
SELECT 'Isabel', v.id, 'active'
FROM volunteers v
WHERE v.email = 'cmarcomarhuenda@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM patients p
    WHERE p.assigned_volunteer_id = v.id
      AND p.name = 'Isabel'
);

-- Giulia Flores -> Carmen
INSERT INTO patients (name, assigned_volunteer_id, status)
SELECT 'Carmen', v.id, 'active'
FROM volunteers v
WHERE v.email = 'gfl0002@alu.medac.es'
AND NOT EXISTS (
    SELECT 1 FROM patients p
    WHERE p.assigned_volunteer_id = v.id
      AND p.name = 'Carmen'
);


-- =====================================================
-- 5. VERIFY COMPLETE CONSOLIDATED TABLE
-- =====================================================

SELECT
    v.id,
    v.full_name AS nombre_y_apellidos,
    v.email AS correo_electronico,
    GROUP_CONCAT(
        p.name ORDER BY p.name SEPARATOR ', '
    ) AS personas_que_acompana,
    v.residencia,
    v.clerk_user_id,
    v.is_coordinator,
    v.is_active,
    v.created_at
FROM volunteers v
LEFT JOIN patients p
    ON p.assigned_volunteer_id = v.id
GROUP BY
    v.id,
    v.full_name,
    v.email,
    v.residencia,
    v.clerk_user_id,
    v.is_coordinator,
    v.is_active,
    v.created_at
ORDER BY v.full_name;


-- =====================================================
-- 6. VERIFY TOTALS
-- =====================================================

SELECT
    (SELECT COUNT(*) FROM volunteers) AS total_volunteers,
    (SELECT COUNT(*) FROM volunteers WHERE is_active = 1) AS active_volunteers,
    (SELECT COUNT(*) FROM volunteers WHERE is_active = 0) AS inactive_volunteers,
    (SELECT COUNT(*) FROM patients) AS total_patient_records;


-- =====================================================
-- 7. COMMIT
-- =====================================================

COMMIT;