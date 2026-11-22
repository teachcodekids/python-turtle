CREATE TABLE projects (
  owner_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, id)
);
--> statement-breakpoint
CREATE INDEX projects_owner_updated ON projects (owner_id, updated_at DESC);
