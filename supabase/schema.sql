-- ============================================
-- 第1块：枚举类型
-- ============================================
CREATE TYPE user_role AS ENUM ('boss', 'store_manager', 'supplier', 'finance');
CREATE TYPE delivery_status AS ENUM ('pending', 'confirmed', 'rejected', 'paid');
CREATE TYPE payment_status AS ENUM ('pending', 'overdue', 'paid');
CREATE TYPE notification_type AS ENUM (
  'delivery_created','delivery_confirmed','delivery_rejected',
  'payment_due_soon','payment_overdue','payment_severe','payment_completed'
);

-- ============================================
-- 第2块：核心表
-- ============================================
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'store_manager',
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  manager_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.suppliers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  phone             TEXT,
  category          TEXT,
  payment_term_days INT NOT NULL DEFAULT 30,
  bank_info         TEXT,
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.deliveries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id),
  store_id         UUID NOT NULL REFERENCES public.stores(id),
  delivery_date    DATE NOT NULL,
  total_amount     NUMERIC(10,2) NOT NULL,
  status           delivery_status NOT NULL DEFAULT 'pending',
  photos           TEXT[] DEFAULT '{}',
  notes            TEXT,
  confirmed_by     UUID REFERENCES public.users(id),
  confirmed_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at          TIMESTAMPTZ,
  created_by       UUID NOT NULL REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.delivery_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id         UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  unit                TEXT DEFAULT '件',
  quantity            NUMERIC(10,2) NOT NULL,
  unit_price          NUMERIC(10,2) NOT NULL,
  amount              NUMERIC(10,2) NOT NULL,
  original_quantity   NUMERIC(10,2),
  original_unit_price NUMERIC(10,2),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id       UUID NOT NULL REFERENCES public.deliveries(id),
  supplier_id       UUID NOT NULL REFERENCES public.suppliers(id),
  store_id          UUID NOT NULL REFERENCES public.stores(id),
  amount            NUMERIC(10,2) NOT NULL,
  payment_term_days INT NOT NULL,
  due_date          DATE NOT NULL,
  status            payment_status NOT NULL DEFAULT 'pending',
  overdue_days      INT GENERATED ALWAYS AS (
    CASE WHEN status = 'paid' THEN 0 ELSE GREATEST(0, (CURRENT_DATE - due_date)::INT) END
  ) STORED,
  paid_at           TIMESTAMPTZ,
  paid_by           UUID REFERENCES public.users(id),
  payment_proof     TEXT,
  payment_notes     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  delivery_id UUID REFERENCES public.deliveries(id),
  payment_id  UUID REFERENCES public.payments(id),
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 第3块：索引
-- ============================================
CREATE INDEX idx_deliveries_store_id    ON public.deliveries(store_id);
CREATE INDEX idx_deliveries_supplier_id ON public.deliveries(supplier_id);
CREATE INDEX idx_deliveries_status      ON public.deliveries(status);
CREATE INDEX idx_deliveries_date        ON public.deliveries(delivery_date DESC);
CREATE INDEX idx_payments_status        ON public.payments(status);
CREATE INDEX idx_payments_due_date      ON public.payments(due_date);
CREATE INDEX idx_payments_supplier_id   ON public.payments(supplier_id);
CREATE INDEX idx_payments_store_id      ON public.payments(store_id);
CREATE INDEX idx_notifications_user_id  ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread   ON public.notifications(user_id, is_read) WHERE is_read = false;

-- ============================================
-- 第4块：触发器和函数
-- ============================================
CREATE OR REPLACE FUNCTION handle_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_users_updated_at     BEFORE UPDATE ON public.users     FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_stores_updated_at    BEFORE UPDATE ON public.stores    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_payments_updated_at  BEFORE UPDATE ON public.payments  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, phone, name, role) VALUES (
    NEW.id, COALESCE(NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', '新用户'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'store_manager')
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION create_payment_on_confirm() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_term_days INT;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    SELECT payment_term_days INTO v_term_days FROM public.suppliers WHERE id = NEW.supplier_id;
    INSERT INTO public.payments (delivery_id, supplier_id, store_id, amount, payment_term_days, due_date)
    VALUES (NEW.id, NEW.supplier_id, NEW.store_id, NEW.total_amount, v_term_days,
      (NEW.confirmed_at::DATE + (v_term_days || ' days')::INTERVAL)::DATE);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_create_payment_on_confirm AFTER UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION create_payment_on_confirm();

CREATE OR REPLACE FUNCTION update_overdue_payments() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.payments SET status = 'overdue', updated_at = NOW()
  WHERE status = 'pending' AND due_date < CURRENT_DATE;
END; $$;

-- ============================================
-- 第5块：RLS
-- ============================================
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role() RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.users WHERE id = auth.uid(); $$;
CREATE OR REPLACE FUNCTION get_manager_store_id() RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.stores WHERE manager_id = auth.uid() LIMIT 1; $$;
CREATE OR REPLACE FUNCTION get_supplier_id() RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.suppliers WHERE user_id = auth.uid() LIMIT 1; $$;

-- users
CREATE POLICY "users_select_self"  ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_select_admin" ON public.users FOR SELECT USING (get_user_role() IN ('boss','finance'));
CREATE POLICY "users_update_self"  ON public.users FOR UPDATE USING (id = auth.uid());
-- stores
CREATE POLICY "stores_select_boss_finance" ON public.stores FOR SELECT USING (get_user_role() IN ('boss','finance'));
CREATE POLICY "stores_select_supplier"     ON public.stores FOR SELECT USING (get_user_role() = 'supplier' AND is_active = true);
CREATE POLICY "stores_select_manager"      ON public.stores FOR SELECT USING (manager_id = auth.uid());
CREATE POLICY "stores_all_boss"            ON public.stores FOR ALL USING (get_user_role() = 'boss');
-- suppliers
CREATE POLICY "suppliers_select_boss_finance" ON public.suppliers FOR SELECT USING (get_user_role() IN ('boss','finance'));
CREATE POLICY "suppliers_select_self"         ON public.suppliers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "suppliers_select_manager"      ON public.suppliers FOR SELECT USING (get_user_role() = 'store_manager');
CREATE POLICY "suppliers_all_boss"            ON public.suppliers FOR ALL USING (get_user_role() = 'boss');
-- deliveries
CREATE POLICY "deliveries_select_boss_finance" ON public.deliveries FOR SELECT USING (get_user_role() IN ('boss','finance'));
CREATE POLICY "deliveries_select_manager"      ON public.deliveries FOR SELECT USING (get_user_role() = 'store_manager' AND store_id = get_manager_store_id());
CREATE POLICY "deliveries_select_supplier"     ON public.deliveries FOR SELECT USING (get_user_role() = 'supplier' AND supplier_id = get_supplier_id());
CREATE POLICY "deliveries_insert_supplier"     ON public.deliveries FOR INSERT WITH CHECK (get_user_role() = 'supplier' AND supplier_id = get_supplier_id());
CREATE POLICY "deliveries_update_manager"      ON public.deliveries FOR UPDATE USING (get_user_role() = 'store_manager' AND store_id = get_manager_store_id());
CREATE POLICY "deliveries_all_boss"            ON public.deliveries FOR ALL USING (get_user_role() = 'boss');
-- delivery_items
CREATE POLICY "items_select" ON public.delivery_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = delivery_id AND (
    get_user_role() IN ('boss','finance')
    OR (get_user_role() = 'store_manager' AND d.store_id = get_manager_store_id())
    OR (get_user_role() = 'supplier' AND d.supplier_id = get_supplier_id())
  ))
);
CREATE POLICY "items_insert_supplier" ON public.delivery_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = delivery_id AND d.supplier_id = get_supplier_id() AND d.status = 'pending')
);
CREATE POLICY "items_update_manager" ON public.delivery_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = delivery_id AND d.store_id = get_manager_store_id())
);
-- payments
CREATE POLICY "payments_select_boss_finance" ON public.payments FOR SELECT USING (get_user_role() IN ('boss','finance'));
CREATE POLICY "payments_select_manager"      ON public.payments FOR SELECT USING (get_user_role() = 'store_manager' AND store_id = get_manager_store_id());
CREATE POLICY "payments_select_supplier"     ON public.payments FOR SELECT USING (get_user_role() = 'supplier' AND supplier_id = get_supplier_id());
CREATE POLICY "payments_update_finance"      ON public.payments FOR UPDATE USING (get_user_role() IN ('finance','boss'));
-- notifications
CREATE POLICY "notifications_select_self" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_self" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_system" ON public.notifications FOR INSERT WITH CHECK (true);

-- ============================================
-- 第6块：测试数据（可选）
-- ============================================
INSERT INTO public.stores (name, address) VALUES
  ('1号店-望京店', '北京市朝阳区望京SOHO'),
  ('2号店-三里屯店', '北京市朝阳区三里屯太古里'),
  ('3号店-国贸店', '北京市朝阳区国贸CBD');

INSERT INTO public.suppliers (name, phone, category, payment_term_days) VALUES
  ('牛肉批发-张老板', '13800000001', '牛肉/海鲜', 30),
  ('蔬菜供应-李大姐', '13800000002', '蔬菜/菌类', 7),
  ('调料配送-王记', '13800000003', '调料/干货', 60);
