-- Remove the hard 5,000-character check from task descriptions.
-- PostgreSQL TEXT remains the storage type; private notes keep their existing limit.
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_description_check;
