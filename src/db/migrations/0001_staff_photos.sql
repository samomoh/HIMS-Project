ALTER TABLE users
  DROP COLUMN IF EXISTS photo_data,
  DROP COLUMN IF EXISTS photo_mime_type;

CREATE TABLE IF NOT EXISTS staff_photos (
  user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  photo_data bytea NOT NULL,
  photo_mime_type varchar(32) NOT NULL,
  uploaded_at timestamp NOT NULL DEFAULT now()
);
