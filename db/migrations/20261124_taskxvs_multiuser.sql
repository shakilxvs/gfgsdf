-- TaskXVS multi-user, permission, and notification migration.
-- Safe to apply to an existing Shlomo Tasks database.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS notification_email text,
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  display_name text NOT NULL,
  email text,
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member')),
  active boolean NOT NULL DEFAULT true,
  token_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uq ON users (lower(username));
CREATE INDEX IF NOT EXISTS users_active_idx ON users (active);

CREATE TABLE IF NOT EXISTS business_assignments (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'read' CHECK (permission IN ('read','write')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,business_id)
);
CREATE INDEX IF NOT EXISTS business_assignments_business_idx ON business_assignments (business_id);

CREATE OR REPLACE FUNCTION shlomo_touch_users_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS users_touch ON users;
CREATE TRIGGER users_touch BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION shlomo_touch_users_updated_at();

CREATE OR REPLACE FUNCTION shlomo_seed_business_categories() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO categories (business_id,name,icon,color,position) VALUES
  (NEW.id,'Shopify','shopping-bag','#4f7b65',1),
  (NEW.id,'Discount','percent','#d27a3f',2),
  (NEW.id,'Sale','badge-percent','#c46e39',3),
  (NEW.id,'Video','video','#8d70b0',4),
  (NEW.id,'Email','mail','#5d8e9b',5),
  (NEW.id,'Marketing','megaphone','#c58b35',6),
  (NEW.id,'Design','palette','#a8758b',7),
  (NEW.id,'Development','code-2','#557f91',8),
  (NEW.id,'Coding','terminal','#527d88',9),
  (NEW.id,'Theme development','panel-top','#638b79',10),
  (NEW.id,'App development','blocks','#727ab0',11),
  (NEW.id,'Bug fixing','bug','#bf674e',12),
  (NEW.id,'QA & Testing','clipboard-check','#ad874e',13),
  (NEW.id,'API & Integration','plug','#6b8b9e',14),
  (NEW.id,'Automation','workflow','#9877a4',15),
  (NEW.id,'SEO','search-check','#6c997c',16),
  (NEW.id,'Content','file-text','#bb8c52',17),
  (NEW.id,'Copywriting','notebook-pen','#b27765',18),
  (NEW.id,'Social media','instagram','#b66b80',19),
  (NEW.id,'Ads & Campaigns','chart-no-axes-combined','#c58a38',20),
  (NEW.id,'Analytics','chart-line','#688f9a',21),
  (NEW.id,'Product listing','list-checks','#7b8a68',22),
  (NEW.id,'Product sourcing','package-search','#9a845d',23),
  (NEW.id,'Supplier','truck','#648b87',24),
  (NEW.id,'Inventory','boxes','#6f9277',25),
  (NEW.id,'Warehouse','warehouse','#7b836e',26),
  (NEW.id,'Orders','shopping-basket','#a77955',27),
  (NEW.id,'Customer support','headset','#6f8b9f',28),
  (NEW.id,'Research','microscope','#9278a7',29),
  (NEW.id,'Finance','wallet','#8b8a63',30),
  (NEW.id,'Operations','settings-2','#7e897b',31),
  (NEW.id,'Other','shapes','#8a857e',32)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS businesses_seed_categories ON businesses;
CREATE TRIGGER businesses_seed_categories AFTER INSERT ON businesses
FOR EACH ROW EXECUTE FUNCTION shlomo_seed_business_categories();

INSERT INTO categories (business_id,name,icon,color,position)
SELECT b.id,c.name,c.icon,c.color,c.position
FROM businesses b
CROSS JOIN (VALUES
('Coding','terminal','#527d88',9),('Theme development','panel-top','#638b79',10),
('App development','blocks','#727ab0',11),('Bug fixing','bug','#bf674e',12),
('QA & Testing','clipboard-check','#ad874e',13),('API & Integration','plug','#6b8b9e',14),
('Automation','workflow','#9877a4',15),('SEO','search-check','#6c997c',16),
('Copywriting','notebook-pen','#b27765',18),('Social media','instagram','#b66b80',19),
('Ads & Campaigns','chart-no-axes-combined','#c58a38',20),('Analytics','chart-line','#688f9a',21),
('Product listing','list-checks','#7b8a68',22),('Product sourcing','package-search','#9a845d',23),
('Supplier','truck','#648b87',24),('Inventory','boxes','#6f9277',25),
('Warehouse','warehouse','#7b836e',26),('Orders','shopping-basket','#a77955',27),
('Customer support','headset','#6f8b9f',28),('Research','microscope','#9278a7',29)
) AS c(name,icon,color,position)
WHERE NOT EXISTS (
  SELECT 1 FROM categories x WHERE x.business_id=b.id AND lower(x.name)=lower(c.name)
);

UPDATE categories SET icon=CASE lower(name)
  WHEN 'shopify' THEN 'shopping-bag'
  WHEN 'discount' THEN 'percent'
  WHEN 'sale' THEN 'badge-percent'
  WHEN 'video' THEN 'video'
  WHEN 'email' THEN 'mail'
  WHEN 'marketing' THEN 'megaphone'
  WHEN 'design' THEN 'palette'
  WHEN 'development' THEN 'code-2'
  WHEN 'seo' THEN 'search-check'
  WHEN 'content' THEN 'file-text'
  WHEN 'operations' THEN 'settings-2'
  WHEN 'finance' THEN 'wallet'
  WHEN 'other' THEN 'shapes'
  ELSE icon END
WHERE icon IN ('ShoppingBag','Percent','Tag','Video','Mail','Megaphone','Palette','Code2','Search','PenLine','Settings','Wallet','CircleDot');

ALTER TABLE categories ALTER COLUMN icon SET DEFAULT 'tag';
