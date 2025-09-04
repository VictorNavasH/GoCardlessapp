-- Habilitar Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gocardless_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gocardless_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gocardless_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios (solo pueden ver sus propios datos)
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para requisitions
CREATE POLICY "Users can view own requisitions" ON gocardless_requisitions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create requisitions" ON gocardless_requisitions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requisitions" ON gocardless_requisitions
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para cuentas
CREATE POLICY "Users can view own accounts" ON gocardless_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create accounts" ON gocardless_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts" ON gocardless_accounts
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para transacciones
CREATE POLICY "Users can view own transactions" ON gocardless_transactions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM gocardless_accounts WHERE id = gocardless_transactions.account_id
        )
    );

CREATE POLICY "Users can create transactions" ON gocardless_transactions
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM gocardless_accounts WHERE id = gocardless_transactions.account_id
        )
    );

-- Las instituciones son públicas (solo lectura)
ALTER TABLE gocardless_institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Institutions are viewable by everyone" ON gocardless_institutions
    FOR SELECT USING (true);
