-- Creating all necessary tables with correct names
-- Execute table creation
CREATE TABLE IF NOT EXISTS gocardless_institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gocardless_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    bic VARCHAR(11),
    transaction_total_days INTEGER DEFAULT 90,
    countries TEXT[] DEFAULT '{}',
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gocardless_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gocardless_id VARCHAR(255) UNIQUE NOT NULL,
    reference VARCHAR(255) UNIQUE NOT NULL,
    institution_id UUID REFERENCES gocardless_institutions(id),
    status VARCHAR(50) DEFAULT 'CR',
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gocardless_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gocardless_id VARCHAR(255) UNIQUE NOT NULL,
    requisition_id UUID REFERENCES gocardless_requisitions(id),
    iban VARCHAR(34),
    name VARCHAR(255),
    currency VARCHAR(3) DEFAULT 'EUR',
    account_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ready',
    balance_amount DECIMAL(15,2) DEFAULT 0,
    balance_currency VARCHAR(3) DEFAULT 'EUR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gocardless_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gocardless_id VARCHAR(255) UNIQUE NOT NULL,
    account_id UUID REFERENCES gocardless_accounts(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    date DATE NOT NULL,
    description TEXT,
    creditor_name VARCHAR(255),
    debtor_name VARCHAR(255),
    transaction_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'booked',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Sandbox Finance institution
INSERT INTO gocardless_institutions (gocardless_id, name, bic, logo_url) 
VALUES ('SANDBOXFINANCE_SFIN0000', 'Sandbox Finance', 'SFIN0000', 'https://cdn.gocardless.com/institutions/SANDBOXFINANCE_SFIN0000.png')
ON CONFLICT (gocardless_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gocardless_accounts_requisition_id ON gocardless_accounts(requisition_id);
CREATE INDEX IF NOT EXISTS idx_gocardless_transactions_account_id ON gocardless_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_gocardless_transactions_date ON gocardless_transactions(date);
