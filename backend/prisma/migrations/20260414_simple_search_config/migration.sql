-- Switch search_vector from 'english' to 'simple' config for CJK support

-- Rebuild existing search vectors with 'simple' config
UPDATE skills SET search_vector =
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(display_name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B');

-- Replace trigger function to use 'simple' config
CREATE OR REPLACE FUNCTION skills_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
