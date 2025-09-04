-- Crear tabla para logs de sincronización
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  total_accounts INTEGER NOT NULL DEFAULT 0,
  successful_accounts INTEGER NOT NULL DEFAULT 0,
  failed_accounts INTEGER NOT NULL DEFAULT 0,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_sync_logs_executed_at ON sync_logs(executed_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);

-- RLS policies
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on sync_logs" ON sync_logs
  FOR ALL USING (true);
