-- Crear tabla para tracking real de rate limits de GoCardless
CREATE TABLE IF NOT EXISTS gocardless_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES gocardless_accounts(id) ON DELETE CASCADE,
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('details', 'balances', 'transactions')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  limit_per_day INTEGER NOT NULL DEFAULT 10,
  remaining_calls INTEGER NOT NULL DEFAULT 10,
  reset_time TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índice único para evitar duplicados por cuenta/scope/fecha
  UNIQUE(account_id, scope, date)
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_gocardless_rate_limits_account_scope ON gocardless_rate_limits(account_id, scope);
CREATE INDEX IF NOT EXISTS idx_gocardless_rate_limits_date ON gocardless_rate_limits(date);

-- RLS policies
ALTER TABLE gocardless_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON gocardless_rate_limits
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON gocardless_rate_limits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON gocardless_rate_limits
  FOR UPDATE USING (true);
