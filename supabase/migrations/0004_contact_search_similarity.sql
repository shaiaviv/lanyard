-- Replace ILIKE substring retrieval with pg_trgm similarity so name variants like
-- "Fischer"/"Fisher" and "Adyen"/"Aden" are caught by the matching engine.
CREATE OR REPLACE FUNCTION retrieve_contact_candidates(
  p_name     text  DEFAULT NULL,
  p_company  text  DEFAULT NULL,
  p_email    text  DEFAULT NULL,
  p_linkedin text  DEFAULT NULL
)
RETURNS TABLE (
  id              uuid,
  canonical_name  text,
  current_company text,
  current_title   text,
  linkedin_url    text,
  email           text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id,
    c.canonical_name,
    c.current_company,
    c.current_title,
    c.linkedin_url,
    c.email
  FROM contacts c
  WHERE
    (p_linkedin IS NOT NULL AND c.linkedin_url   = p_linkedin)
    OR (p_email    IS NOT NULL AND c.email        = p_email)
    OR (p_name     IS NOT NULL AND similarity(c.canonical_name,  p_name)    > 0.3)
    OR (p_company  IS NOT NULL AND similarity(c.current_company, p_company) > 0.3)
  ORDER BY
    GREATEST(
      CASE WHEN p_name    IS NOT NULL THEN similarity(c.canonical_name,  p_name)    ELSE 0 END,
      CASE WHEN p_company IS NOT NULL THEN similarity(c.current_company, p_company) ELSE 0 END
    ) DESC
  LIMIT 10;
$$;
