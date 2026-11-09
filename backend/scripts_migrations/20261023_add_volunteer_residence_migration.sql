USE hominum_db;

ALTER TABLE volunteers
ADD COLUMN residencia VARCHAR(255) NULL AFTER full_name;