-- chat_sessions — one row per ChatGPT-style conversation thread.
--
-- Sessions live alongside the patient (patient_id FK). Short-term turns
-- (st_turns) are already keyed by (user_id, session_id) so this table
-- just adds the metadata the UI sidebar needs to render the list.
--
-- Naming: kept column names plain text so the existing st_turns and
-- mem_facts tables (also keyed by string ids) play together without
-- needing JOIN-on-uuid.

CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id      TEXT PRIMARY KEY,
    patient_id      TEXT NOT NULL,
    title           TEXT NOT NULL,
    last_message_at INTEGER,                       -- epoch seconds, NULL until first message
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    archived        INTEGER NOT NULL DEFAULT 0
);

-- Sidebar lists sessions newest-message-first, scoped to the current patient.
CREATE INDEX IF NOT EXISTS idx_chat_sessions_patient
    ON chat_sessions (patient_id, archived, last_message_at DESC NULLS LAST, created_at DESC);
