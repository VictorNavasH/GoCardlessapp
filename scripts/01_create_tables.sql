-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de instituciones bancarias
CREATE TABLE IF NOT EXISTS gocardless_institutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gocardless_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  bic VARCHAR(11),
  transaction_total_days INTEGER DEFAULT 90,
  countries JSONB DEFAULT '[]',
  logo_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de requisiciones (solicitudes de acceso)
CREATE TABLE IF NOT EXISTS gocardless_requisitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES gocardless_institutions(id),
  gocardless_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'created',
  redirect_url TEXT,
  agreement_id VARCHAR(255),
  reference VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de cuentas bancarias
CREATE TABLE IF NOT EXISTS gocardless_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requisition_id UUID REFERENCES gocardless_requisitions(id) ON DELETE CASCADE,
  gocardless_id VARCHAR(255) UNIQUE,
  iban VARCHAR(34),
  name VARCHAR(255),
  currency VARCHAR(3) DEFAULT 'EUR',
  account_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  balance_amount DECIMAL(15,2) DEFAULT 0,
  balance_date TIMESTAMP WITH TIME ZONE,
  institution_id UUID REFERENCES gocardless_institutions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de transacciones
CREATE TABLE IF NOT EXISTS gocardless_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES gocardless_accounts(id) ON DELETE CASCADE,
  gocardless_id VARCHAR(255) UNIQUE,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  description TEXT,
  reference VARCHAR(255),
  category VARCHAR(100),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  booking_date TIMESTAMP WITH TIME ZONE,
  value_date TIMESTAMP WITH TIME ZONE,
  creditor_name VARCHAR(255),
  debtor_name VARCHAR(255),
  creditor_account VARCHAR(34),
  debtor_account VARCHAR(34),
  transaction_code VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_gocardless_accounts_user_id ON gocardless_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_gocardless_accounts_requisition_id ON gocardless_accounts(requisition_id);
CREATE INDEX IF NOT EXISTS idx_gocardless_transactions_account_id ON gocardless_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_gocardless_transactions_date ON gocardless_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_gocardless_requisitions_user_id ON gocardless_requisitions(user_id);
CREATE INDEX IF NOT EXISTS idx_gocardless_requisitions_status ON gocardless_requisitions(status);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gocardless_requisitions_updated_at BEFORE UPDATE ON gocardless_requisitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gocardless_accounts_updated_at BEFORE UPDATE ON gocardless_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
