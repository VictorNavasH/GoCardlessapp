-- Diagnóstico específico de las cuentas de Banco de Sabadell
-- Para entender por qué no tiene transacciones

-- 1. Mostrar todas las cuentas de Banco de Sabadell
SELECT 
    'Cuentas de Banco de Sabadell' as seccion,
    a.id,
    a.gocardless_id,
    a.account_name,
    a.account_type,
    a.status,
    a.current_balance,
    a.currency,
    a.created_at,
    a.updated_at
FROM gocardless_accounts a
JOIN gocardless_institutions i ON a.institution_id = i.id
WHERE i.name ILIKE '%sabadell%'
ORDER BY a.created_at;

-- Separador visual
SELECT '---' as separador, 'Resumen por institución' as descripcion;

-- 2. Resumen de todas las instituciones con sus cuentas
SELECT 
    i.name as institution_name,
    COUNT(a.id) as total_cuentas,
    COUNT(CASE WHEN a.status = 'ACTIVE' THEN 1 END) as cuentas_activas,
    COUNT(CASE WHEN a.status = 'READY' THEN 1 END) as cuentas_ready,
    SUM(CAST(a.current_balance AS DECIMAL)) as balance_total,
    COUNT(t.id) as total_transacciones
FROM gocardless_institutions i
LEFT JOIN gocardless_accounts a ON i.id = a.institution_id
LEFT JOIN gocardless_transactions t ON a.id = t.account_id
GROUP BY i.name, i.id
HAVING COUNT(a.id) > 0
ORDER BY total_transacciones DESC;
