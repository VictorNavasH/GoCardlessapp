-- Fix missing current_balance column in accounts table
ALTER TABLE gocardless_accounts ADD COLUMN IF NOT EXISTS current_balance JSONB;

-- Ensure proper foreign key relationship between transactions and accounts
-- First, check if account_id column exists in transactions table
ALTER TABLE gocardless_transactions ADD COLUMN IF NOT EXISTS account_id UUID;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_gocardless_transactions_account_id'
    ) THEN
        ALTER TABLE gocardless_transactions 
        ADD CONSTRAINT fk_gocardless_transactions_account_id 
        FOREIGN KEY (account_id) REFERENCES gocardless_accounts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gocardless_transactions_account_id ON gocardless_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_gocardless_accounts_current_balance ON gocardless_accounts USING GIN (current_balance);

-- Update existing accounts with default balance structure if current_balance is null
UPDATE gocardless_accounts 
SET current_balance = jsonb_build_object(
    'amount', '0.00',
    'currency', 'EUR'
)
WHERE current_balance IS NULL;
