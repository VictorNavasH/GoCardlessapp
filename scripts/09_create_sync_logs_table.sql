-- Corrigiendo nombre de tabla para coincidir con el código de la aplicación
CREATE TABLE IF NOT EXISTS gocardless_sync_logs (
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

-- Actualizando nombres de índices para coincidir con la tabla corregida
CREATE INDEX IF NOT EXISTS idx_gocardless_sync_logs_executed_at ON gocardless_sync_logs(executed_at);
CREATE INDEX IF NOT EXISTS idx_gocardless_sync_logs_sync_type ON gocardless_sync_logs(sync_type);

-- Actualizando políticas RLS para la tabla corregida
ALTER TABLE gocardless_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on gocardless_sync_logs" ON gocardless_sync_logs
  FOR ALL USING (true);
