CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  position integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS businesses_name_uq ON businesses (lower(name));

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  icon text NOT NULL DEFAULT 'Tag' CHECK (char_length(icon) <= 40),
  color text NOT NULL DEFAULT '#668575',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, business_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS categories_business_name_uq ON categories (business_id, lower(name));
CREATE INDEX IF NOT EXISTS categories_business_idx ON categories (business_id);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id uuid,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 5000),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 5000),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  created_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Dhaka')::date,
  start_date date,
  deadline date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (category_id, business_id) REFERENCES categories(id, business_id) ON DELETE SET NULL (category_id),
  CHECK (start_date IS NULL OR deadline IS NULL OR deadline >= start_date)
);
CREATE INDEX IF NOT EXISTS tasks_business_idx ON tasks (business_id);
CREATE INDEX IF NOT EXISTS tasks_category_idx ON tasks (category_id);
CREATE INDEX IF NOT EXISTS tasks_deadline_idx ON tasks (deadline);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status);
CREATE INDEX IF NOT EXISTS tasks_created_date_idx ON tasks (created_date);
CREATE INDEX IF NOT EXISTS tasks_updated_idx ON tasks (updated_at DESC);

CREATE OR REPLACE FUNCTION shlomo_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS tasks_touch ON tasks;
CREATE TRIGGER tasks_touch BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION shlomo_touch_updated_at();
DROP TRIGGER IF EXISTS businesses_touch ON businesses;
CREATE TRIGGER businesses_touch BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION shlomo_touch_updated_at();
DROP TRIGGER IF EXISTS categories_touch ON categories;
CREATE TRIGGER categories_touch BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION shlomo_touch_updated_at();

CREATE OR REPLACE FUNCTION shlomo_seed_business_categories() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO categories (business_id,name,icon,color,position) VALUES
  (NEW.id,'Shopify','ShoppingBag','#527966',1),
  (NEW.id,'Discount','Percent','#c87561',2),
  (NEW.id,'Sale','Tag','#c87561',3),
  (NEW.id,'Video','Video','#8879b0',4),
  (NEW.id,'Email','Mail','#6d91a0',5),
  (NEW.id,'Marketing','Megaphone','#ba944e',6),
  (NEW.id,'Design','Palette','#8879b0',7),
  (NEW.id,'Development','Code2','#527966',8),
  (NEW.id,'SEO','Search','#6d9277',9),
  (NEW.id,'Content','PenLine','#ba944e',10),
  (NEW.id,'Operations','Settings','#7b8580',11),
  (NEW.id,'Finance','Wallet','#6d9277',12),
  (NEW.id,'Other','CircleDot','#7b8580',13);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS businesses_seed_categories ON businesses;
CREATE TRIGGER businesses_seed_categories AFTER INSERT ON businesses FOR EACH ROW EXECUTE FUNCTION shlomo_seed_business_categories();

INSERT INTO businesses (name,position) VALUES
('Pellishoes',1),('Casabella',2),('V3PL',3),('Hug & Home',4)
ON CONFLICT DO NOTHING;

INSERT INTO categories (business_id,name,icon,color,position)
SELECT b.id,c.name,c.icon,c.color,c.position
FROM businesses b
CROSS JOIN (VALUES
('Shopify','ShoppingBag','#527966',1),('Discount','Percent','#c87561',2),('Sale','Tag','#c87561',3),
('Video','Video','#8879b0',4),('Email','Mail','#6d91a0',5),('Marketing','Megaphone','#ba944e',6),
('Design','Palette','#8879b0',7),('Development','Code2','#527966',8),('SEO','Search','#6d9277',9),
('Content','PenLine','#ba944e',10),('Operations','Settings','#7b8580',11),('Finance','Wallet','#6d9277',12),
('Other','CircleDot','#7b8580',13)
) AS c(name,icon,color,position)
WHERE NOT EXISTS (SELECT 1 FROM categories x WHERE x.business_id=b.id AND lower(x.name)=lower(c.name));