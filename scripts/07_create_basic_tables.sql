-- Create basic tables needed for GoCardless integration
-- This script creates the minimum required tables with correct schema

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS gocardless_transactions CASCADE;
DROP TABLE IF EXISTS gocardless_accounts CASCADE;
DROP TABLE IF EXISTS gocardless_requisitions CASCADE;
DROP TABLE IF EXISTS gocardless_institutions CASCADE;

-- Create institutions table
CREATE TABLE gocardless_institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gocardless_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    bic VARCHAR(50),
    country VARCHAR(2) NOT NULL,
    logo_url TEXT,
    supported_features JSONB,
    is_active BOOLEAN DEFAULT true,
    transaction_total_days INTEGER DEFAULT 90,
    max_access_valid_for_days INTEGER DEFAULT 90,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create requisitions table
CREATE TABLE gocardless_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gocardless_id VARCHAR(255) UNIQUE NOT NULL,
    institution_id UUID NOT NULL REFERENCES gocardless_institutions(id),
    reference VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    redirect_url TEXT NOT NULL,
    link TEXT NOT NULL,
    agreement_id VARCHAR(255),
    accounts JSONB DEFAULT '[]'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create accounts table
CREATE TABLE gocardless_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gocardless_id VARCHAR(255) UNIQUE NOT NULL,
    requisition_id UUID NOT NULL REFERENCES gocardless_requisitions(id),
    institution_id UUID NOT NULL REFERENCES gocardless_institutions(id),
    iban VARCHAR(50),
    name VARCHAR(255),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    account_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'READY',
    current_balance DECIMAL(15,2) DEFAULT 0,
    available_balance DECIMAL(15,2) DEFAULT 0,
    credit_limit DECIMAL(15,2),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE gocardless_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gocardless_id VARCHAR(255) UNIQUE NOT NULL,
    account_id UUID NOT NULL REFERENCES gocardless_accounts(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    date DATE NOT NULL,
    booking_date DATE,
    value_date DATE,
    reference VARCHAR(500),
    remittance_information TEXT,
    transaction_code VARCHAR(50),
    bank_transaction_code VARCHAR(50),
    creditor_name VARCHAR(255),
    creditor_account VARCHAR(255),
    debtor_name VARCHAR(255),
    debtor_account VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_gocardless_institutions_gocardless_id ON gocardless_institutions(gocardless_id);
CREATE INDEX idx_gocardless_requisitions_gocardless_id ON gocardless_requisitions(gocardless_id);
CREATE INDEX idx_gocardless_requisitions_reference ON gocardless_requisitions(reference);
CREATE INDEX idx_gocardless_accounts_gocardless_id ON gocardless_accounts(gocardless_id);
CREATE INDEX idx_gocardless_accounts_requisition_id ON gocardless_accounts(requisition_id);
CREATE INDEX idx_gocardless_transactions_account_id ON gocardless_transactions(account_id);
CREATE INDEX idx_gocardless_transactions_date ON gocardless_transactions(date);

-- Insert Sandbox Finance institution
INSERT INTO gocardless_institutions (
    gocardless_id,
    name,
    bic,
    country,
    supported_features,
    is_active
) VALUES (
    'SANDBOXFINANCE_SFIN0000',
    'Sandbox Finance',
    'SFIN0000',
    'GB',
    '["transactions", "balances", "details"]'::jsonb,
    true
) ON CONFLICT (gocardless_id) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE gocardless_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gocardless_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gocardless_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gocardless_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on institutions" ON gocardless_institutions FOR ALL USING (true);
CREATE POLICY "Allow all operations on requisitions" ON gocardless_requisitions FOR ALL USING (true);
CREATE POLICY "Allow all operations on accounts" ON gocardless_accounts FOR ALL USING (true);
CREATE POLICY "Allow all operations on transactions" ON gocardless_transactions FOR ALL USING (true);
