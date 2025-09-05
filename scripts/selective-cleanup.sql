-- Limpieza selectiva: mantener instituciones y requisitions, limpiar datos problemáticos

-- 1. Limpiar todas las transacciones (datos con formato incorrecto)
DELETE FROM gocardless_transactions;

-- 2. Limpiar rate limits (no hay datos registrados correctamente)
DELETE FROM gocardless_rate_limits;

-- 3. Limpiar sync logs (empezar historial limpio)
DELETE FROM gocardless_sync_logs;

-- 4. MANTENER: instituciones, cuentas, requisitions (conexiones válidas)
-- No tocar: gocardless_institutions, gocardless_accounts, gocardless_requisitions

-- Verificar estado después de limpieza
SELECT 'Instituciones' as tabla, COUNT(*) as registros FROM gocardless_institutions
UNION ALL
SELECT 'Cuentas' as tabla, COUNT(*) as registros FROM gocardless_accounts  
UNION ALL
SELECT 'Requisitions' as tabla, COUNT(*) as registros FROM gocardless_requisitions
UNION ALL
SELECT 'Transacciones' as tabla, COUNT(*) as registros FROM gocardless_transactions
UNION ALL
SELECT 'Rate Limits' as tabla, COUNT(*) as registros FROM gocardless_rate_limits;
