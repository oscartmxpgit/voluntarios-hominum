USE hominum_db;

START TRANSACTION;

-- ============================================================
-- TIME ENTRY ATTACHMENTS
-- ============================================================

CREATE TABLE time_entry_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    time_entry_id INT NOT NULL,
    uploaded_by INT NOT NULL,

    -- Original filename as uploaded by the user.
    -- This is ONLY used for display/download purposes.
    original_name VARCHAR(255) NOT NULL,

    -- UUID-generated physical filename.
    -- Example:
    -- 2fb3b0af-6e68-41c4-80aa-a8f754036267.jpg
    stored_name VARCHAR(255) NOT NULL,

    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_timeentryattachment_timeentry
        FOREIGN KEY (time_entry_id)
        REFERENCES time_entries(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_timeentryattachment_volunteer
        FOREIGN KEY (uploaded_by)
        REFERENCES volunteers(id)
        ON DELETE RESTRICT,

    -- Extra safety even though UUID collisions are practically impossible.
    CONSTRAINT uq_timeentryattachment_stored_name
        UNIQUE (stored_name)
);

CREATE INDEX idx_timeentryattachment_timeentry
    ON time_entry_attachments(time_entry_id);

CREATE INDEX idx_timeentryattachment_uploaded_by
    ON time_entry_attachments(uploaded_by);

CREATE INDEX idx_timeentryattachment_created_at
    ON time_entry_attachments(created_at);

COMMIT;