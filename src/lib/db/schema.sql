-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (Clerk sync)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  corsair_connected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email Threads table
CREATE TABLE IF NOT EXISTS email_threads (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(512),
  snippet TEXT,
  priority VARCHAR(50) DEFAULT 'Normal', -- Critical, Important, Normal, Low
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Emails table
CREATE TABLE IF NOT EXISTS emails (
  id VARCHAR(255) PRIMARY KEY,
  thread_id VARCHAR(255) REFERENCES email_threads(id) ON DELETE CASCADE,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  sender VARCHAR(255) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(512),
  body TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  direction VARCHAR(50) DEFAULT 'incoming', -- incoming, outgoing
  is_read BOOLEAN DEFAULT FALSE
);

-- Calendar Events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(512) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(512),
  status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, tentative, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table (Realtime updates)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL, -- email, calendar, system
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Priorities & Action items
CREATE TABLE IF NOT EXISTS ai_priorities (
  id SERIAL PRIMARY KEY,
  email_id VARCHAR(255) REFERENCES emails(id) ON DELETE CASCADE,
  priority VARCHAR(50) NOT NULL, -- Critical, Important, Normal, Low
  reason TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Semantic Search Embeddings (pgvector)
CREATE TABLE IF NOT EXISTS search_embeddings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  content_id VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- email, event
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_user ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_user ON email_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_user_content ON search_embeddings(user_id, content_id);
