USE hominum_db;

START TRANSACTION;

-- ============================================================
-- 1. CREATE COMMENTS TABLE
-- ============================================================

CREATE TABLE time_entry_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    time_entry_id INT NOT NULL,
    volunteer_id INT NOT NULL,

    comment TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_timeentrycomment_timeentry
        FOREIGN KEY (time_entry_id)
        REFERENCES time_entries(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_timeentrycomment_volunteer
        FOREIGN KEY (volunteer_id)
        REFERENCES volunteers(id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_timeentrycomment_time_entry
    ON time_entry_comments(time_entry_id);

CREATE INDEX idx_timeentrycomment_volunteer
    ON time_entry_comments(volunteer_id);

CREATE INDEX idx_timeentrycomment_created
    ON time_entry_comments(created_at);


-- ============================================================
-- 2. MIGRATE EXISTING COMMENTS
-- ============================================================

INSERT INTO time_entry_comments (
    time_entry_id,
    volunteer_id,
    comment,
    created_at
)
SELECT
    id,
    volunteer_id,
    comments,
    created_at
FROM time_entries
WHERE comments IS NOT NULL
  AND TRIM(comments) <> '';


-- ============================================================
-- 3. REMOVE OLD COLUMN
-- ============================================================

ALTER TABLE time_entries
DROP COLUMN comments;

COMMIT;