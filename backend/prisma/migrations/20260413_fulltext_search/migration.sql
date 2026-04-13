-- Add full-text search vector column and GIN index
ALTER TABLE skills ADD COLUMN search_vector tsvector;

-- Populate search vector from existing data
UPDATE skills SET search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(display_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B');

-- GIN index for fast full-text search
CREATE INDEX idx_skills_search_vector ON skills USING GIN (search_vector);

-- Trigger function to auto-update search vector
CREATE OR REPLACE FUNCTION skills_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER skills_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, display_name, description
  ON skills
  FOR EACH ROW
  EXECUTE FUNCTION skills_search_vector_update();
