-- Mensajes directos entre usuarios (sin necesidad de una Request previa).
-- conversations garantiza unicidad del par: user1_id < user2_id (ordenados
-- en la capa de aplicación antes del INSERT para evitar duplicados).

CREATE TABLE conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_conversations_pair UNIQUE (user1_id, user2_id)
);
CREATE INDEX idx_conv_user1 ON conversations(user1_id);
CREATE INDEX idx_conv_user2 ON conversations(user2_id);

CREATE TABLE direct_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dm_conv_time ON direct_messages(conversation_id, created_at);
CREATE INDEX idx_dm_unread   ON direct_messages(conversation_id, sender_id, read_at)
  WHERE read_at IS NULL;
