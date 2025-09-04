-- Add missing fields to institutions table for full GoCardless compliance
ALTER TABLE gocardless_institutions ADD COLUMN IF NOT EXISTS transaction_total_days INTEGER DEFAULT 90;
ALTER TABLE gocardless_institutions ADD COLUMN IF NOT EXISTS max_access_valid_for_days INTEGER DEFAULT 90;
ALTER TABLE gocardless_institutions ADD COLUMN IF NOT EXISTS max_access_valid_for_days_reconfirmation INTEGER DEFAULT 730;

-- Add missing fields to accounts table for complete account data
ALTER TABLE gocardless_accounts ADD COLUMN IF NOT EXISTS account_type VARCHAR(50);
ALTER TABLE gocardless_accounts ADD COLUMN IF NOT EXISTS product VARCHAR(100);
ALTER TABLE gocardless_accounts ADD COLUMN IF NOT EXISTS cash_account_type VARCHAR(50);
ALTER TABLE gocardless_accounts ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE gocardless_accounts ADD COLUMN IF NOT EXISTS owner_address JSONB;

-- Add missing fields to transactions table for complete transaction data
ALTER TABLE gocardless_transactions ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255);
ALTER TABLE gocardless_transactions ADD COLUMN IF NOT EXISTS end_to_end_id VARCHAR(255);
ALTER TABLE gocardless_transactions ADD COLUMN IF NOT EXISTS mandate_id VARCHAR(255);
ALTER TABLE gocardless_transactions ADD COLUMN IF NOT EXISTS creditor_id VARCHAR(255);
ALTER TABLE gocardless_transactions ADD COLUMN IF NOT EXISTS ultimate_creditor VARCHAR(255);
ALTER TABLE gocardless_transactions ADD COLUMN IF NOT EXISTS ultimate_debtor VARCHAR(255);
ALTER TABLE gocardless_transactions ADD COLUMN IF NOT EXISTS bank_transaction_code VARCHAR(50);
ALTER TABLE gocardless_transactions ADD COLUMN IF NOT EXISTS proprietary_bank_transaction_code VARCHAR(50);
ALTER TABLE gocardless_transactions ADD COLUMN IF NOT EXISTS balance_after_transaction JSONB;

-- Add updated_at column to requisitions if missing
ALTER TABLE gocardless_requisitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_gocardless_transactions_transaction_id ON gocardless_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_gocardless_transactions_end_to_end_id ON gocardless_transactions(end_to_end_id);
CREATE INDEX IF NOT EXISTS idx_gocardless_accounts_account_type ON gocardless_accounts(account_type);

-- End of script
