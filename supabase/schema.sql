-- ============================================================
-- Pitasuke Database Schema
-- Supabase SQL Editor で実行してください
-- ============================================================
-- 構成: 1) テーブル作成 → 2) トリガー → 3) RLS有効化 → 4) ポリシー
-- ============================================================


-- ============================================================
-- PART 1: テーブル作成
-- ============================================================

CREATE TABLE companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id                          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id                  UUID REFERENCES companies(id),
  full_name                   TEXT NOT NULL DEFAULT '',
  avatar_url                  TEXT,
  role                        TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'member')),
  status                      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited')),
  timezone                    TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  calendar_status             TEXT CHECK (calendar_status IN ('connected', 'error', 'not_connected')),
  last_synced_at              TIMESTAMPTZ,
  google_account_email        TEXT,
  google_webhook_channel_id   TEXT,
  google_webhook_resource_id  TEXT,
  google_webhook_expiration   TIMESTAMPTZ,
  slack_status                TEXT,
  slack_webhook_url           TEXT,
  slack_channel_name          TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_types (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID NOT NULL REFERENCES companies(id),
  user_id            UUID NOT NULL REFERENCES profiles(id),
  title              TEXT NOT NULL,
  slug               TEXT NOT NULL,
  description        TEXT,
  duration           INTEGER NOT NULL DEFAULT 60,
  buffer_before      INTEGER NOT NULL DEFAULT 0,
  buffer_after       INTEGER NOT NULL DEFAULT 0,
  location_type      TEXT NOT NULL DEFAULT 'online' CHECK (location_type IN ('online', 'in-person', 'phone')),
  location_detail    TEXT,
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  scheduling_mode    TEXT NOT NULL DEFAULT 'fixed' CHECK (scheduling_mode IN ('fixed', 'pool', 'weekday')),
  color              TEXT DEFAULT '#3B82F6',
  reception_settings JSONB,
  weekday_schedule   JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, slug)
);

CREATE TABLE event_roles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  required_count INTEGER NOT NULL DEFAULT 1,
  priority_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE event_members (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES event_roles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(role_id, user_id)
);

CREATE TABLE exclusion_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('all-day', 'time-range')),
  day_of_week   INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  specific_date DATE,
  start_time    TIME,
  end_time      TIME,
  recurring     BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE custom_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('text', 'email', 'tel', 'multiline', 'url')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  placeholder TEXT
);

CREATE TABLE reminder_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  channel    TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  timing     JSONB NOT NULL DEFAULT '{"value": 24, "unit": "hours"}',
  message    TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE bookings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                  UUID NOT NULL REFERENCES event_types(id),
  candidate_name            TEXT NOT NULL,
  candidate_email           TEXT NOT NULL,
  candidate_phone           TEXT,
  start_time                TIMESTAMPTZ NOT NULL,
  end_time                  TIMESTAMPTZ NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'pending')),
  meeting_url               TEXT,
  custom_field_values       JSONB,
  cancel_token              TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  google_calendar_event_id  TEXT,
  google_calendar_owner_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE booking_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id    UUID REFERENCES event_roles(id) ON DELETE SET NULL
);

CREATE TABLE booking_reminders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reminder_id  UUID NOT NULL REFERENCES reminder_settings(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL DEFAULT 'email',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at      TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped'))
);

CREATE TABLE calendar_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '予定あり',
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,
  source     TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'google', 'outlook'))
);

CREATE TABLE notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id),
  user_id        UUID NOT NULL REFERENCES profiles(id),
  type           TEXT NOT NULL CHECK (type IN ('booking_received', 'booking_changed', 'booking_cancelled')),
  booking_id     UUID REFERENCES bookings(id) ON DELETE SET NULL,
  candidate_name TEXT NOT NULL,
  event_title    TEXT NOT NULL,
  message        TEXT NOT NULL,
  is_read        BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  type        TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id                    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  working_hours_start        TIME NOT NULL DEFAULT '09:00',
  working_hours_end          TIME NOT NULL DEFAULT '18:00',
  notify_booking_new         BOOLEAN NOT NULL DEFAULT true,
  notify_booking_cancel      BOOLEAN NOT NULL DEFAULT true,
  notify_reminder            BOOLEAN NOT NULL DEFAULT true,
  notify_digest              BOOLEAN NOT NULL DEFAULT false,
  slack_notify_booking_new   BOOLEAN NOT NULL DEFAULT true,
  slack_notify_booking_cancel BOOLEAN NOT NULL DEFAULT true,
  slack_notify_reminder      BOOLEAN NOT NULL DEFAULT true,
  slack_notify_digest        BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE oauth_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  token_type    TEXT NOT NULL DEFAULT 'Bearer',
  expires_at    TIMESTAMPTZ NOT NULL,
  scope         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);


-- ============================================================
-- PART 2: トリガー・関数
-- ============================================================

-- updated_at の自動更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER event_types_updated_at
  BEFORE UPDATE ON event_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 新規ユーザー登録時に company + profile を自動作成
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  INSERT INTO companies (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.email))
  RETURNING id INTO new_company_id;

  INSERT INTO profiles (id, company_id, full_name, role)
  VALUES (
    NEW.id,
    new_company_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS ポリシーで profiles を安全に参照するための SECURITY DEFINER 関数
-- （直接 SELECT すると RLS が再帰して infinite recursion になるため）
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;


-- ============================================================
-- PART 3: RLS 有効化（全テーブル）
-- ============================================================

ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE exclusion_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens     ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- PART 4: RLS ポリシー（全テーブルが作成済みの状態で定義）
-- ============================================================

-- companies
CREATE POLICY "company members can view their company"
  ON companies FOR SELECT
  USING (id = get_my_company_id());

-- profiles
-- ※ get_my_company_id() は SECURITY DEFINER のため再帰しない
CREATE POLICY "users can view profiles in same company"
  ON profiles FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- event_types
CREATE POLICY "company members can manage events"
  ON event_types FOR ALL
  USING (company_id = get_my_company_id());

-- event_roles
CREATE POLICY "company members can manage event roles"
  ON event_roles FOR ALL
  USING (
    event_id IN (
      SELECT id FROM event_types WHERE company_id = get_my_company_id()
    )
  );

-- event_members
CREATE POLICY "company members can manage event members"
  ON event_members FOR ALL
  USING (
    role_id IN (
      SELECT er.id FROM event_roles er
      JOIN event_types et ON et.id = er.event_id
      WHERE et.company_id = get_my_company_id()
    )
  );

-- exclusion_rules
CREATE POLICY "company members can manage exclusion rules"
  ON exclusion_rules FOR ALL
  USING (
    event_id IN (
      SELECT id FROM event_types WHERE company_id = get_my_company_id()
    )
  );

-- custom_fields
CREATE POLICY "company members can manage custom fields"
  ON custom_fields FOR ALL
  USING (
    event_id IN (
      SELECT id FROM event_types WHERE company_id = get_my_company_id()
    )
  );

-- reminder_settings
CREATE POLICY "company members can manage reminder settings"
  ON reminder_settings FOR ALL
  USING (
    event_id IN (
      SELECT id FROM event_types WHERE company_id = get_my_company_id()
    )
  );

-- bookings
CREATE POLICY "company members can view bookings"
  ON bookings FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM event_types WHERE company_id = get_my_company_id()
    )
  );

CREATE POLICY "company members can update bookings"
  ON bookings FOR UPDATE
  USING (
    event_id IN (
      SELECT id FROM event_types WHERE company_id = get_my_company_id()
    )
  );

CREATE POLICY "company members can delete bookings"
  ON bookings FOR DELETE
  USING (
    event_id IN (
      SELECT id FROM event_types WHERE company_id = get_my_company_id()
    )
  );

CREATE POLICY "public cancel token read"
  ON bookings FOR SELECT
  USING (cancel_token IS NOT NULL);

-- booking_members
CREATE POLICY "company members can manage booking members"
  ON booking_members FOR ALL
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN event_types et ON et.id = b.event_id
      WHERE et.company_id = get_my_company_id()
    )
  );

-- booking_reminders
CREATE POLICY "company members can manage booking reminders"
  ON booking_reminders FOR ALL
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN event_types et ON et.id = b.event_id
      WHERE et.company_id = get_my_company_id()
    )
  );

-- calendar_events
CREATE POLICY "users can manage their own calendar events"
  ON calendar_events FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "company members can view team calendar events"
  ON calendar_events FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE company_id = get_my_company_id()
    )
  );

-- notifications
-- INSERT はサービスロールクライアントから行うためポリシー不要
-- （route handler で createServiceClient() を使用）
CREATE POLICY "users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- activity_log
CREATE POLICY "company members can view activity"
  ON activity_log FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "company members can insert activity"
  ON activity_log FOR INSERT
  WITH CHECK (company_id = get_my_company_id());

-- user_settings
CREATE POLICY "users can manage their own settings"
  ON user_settings FOR ALL
  USING (user_id = auth.uid());

-- oauth_tokens
CREATE POLICY "users can manage their own tokens"
  ON oauth_tokens FOR ALL
  USING (user_id = auth.uid());


-- ============================================================
-- PART 5: Supabase Realtime 有効化
-- ============================================================

-- 通知・予約のリアルタイム更新に必要
-- 既存プロジェクトへの適用: Supabase SQL Editor で実行してください
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- Supabase Realtime が RLS ポリシー（user_id = auth.uid()）を評価して
-- 正しいクライアントにイベントを届けるために REPLICA IDENTITY FULL が必須。
-- 既存プロジェクトへの適用: Supabase SQL Editor で実行してください
ALTER TABLE notifications REPLICA IDENTITY FULL;
