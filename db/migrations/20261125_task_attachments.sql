CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  cloudinary_asset_id text NOT NULL UNIQUE,
  cloudinary_public_id text NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('image','raw')),
  delivery_type text NOT NULL DEFAULT 'authenticated' CHECK (delivery_type='authenticated'),
  format text,
  version bigint,
  file_name text NOT NULL CHECK (length(file_name) BETWEEN 1 AND 180),
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  uploaded_by_username text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_attachments_task_id_created_at_idx
  ON public.task_attachments (task_id, created_at);

CREATE INDEX IF NOT EXISTS task_attachments_cloudinary_public_id_idx
  ON public.task_attachments (cloudinary_public_id);