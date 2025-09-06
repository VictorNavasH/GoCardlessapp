-- Buscar todas las variaciones posibles del nombre de Sabadell
-- para encontrar dónde están realmente las transacciones

-- 1. Buscar todos los nombres de instituciones que contengan "Sabadell"
SELECT DISTINCT 
    i.name as institution_name,
    COUNT(a.id) as cuentas,
    COUNT(t.id) as transacciones
FROM gocardless_institutions i
LEFT JOIN gocardless_accounts a ON i.id = a.institution_id
LEFT JOIN gocardless_transactions t ON a.id = t.account_id
WHERE LOWER(i.name) LIKE '%sabadell%'
GROUP BY i.name
ORDER BY transacciones DESC;

-- Eliminada consulta con columna inexistente institution_name
-- 2. Buscar todas las instituciones únicas para ver todos los nombres y transacciones
SELECT DISTINCT 
    i.name as institution_name,
    COUNT(a.id) as cuentas,
    COUNT(t.id) as transacciones
FROM gocardless_institutions i
LEFT JOIN gocardless_accounts a ON i.id = a.institution_id
LEFT JOIN gocardless_transactions t ON a.id = t.account_id
GROUP BY i.name
HAVING COUNT(t.id) > 0
ORDER BY transacciones DESC;
