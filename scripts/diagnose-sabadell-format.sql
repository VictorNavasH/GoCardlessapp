-- Separando consultas incompatibles para evitar error de UNION
-- Diagnóstico específico para entender el formato de datos de Banco de Sabadell vs CaixaBank

-- 1. Verificar transacciones con campos vacíos por banco
SELECT 
    'Banco de Sabadell' as banco,
    COUNT(*) as total_transacciones,
    COUNT(CASE WHEN creditor_name IS NULL THEN 1 END) as creditor_name_null,
    COUNT(CASE WHEN remittance_information_unstructured IS NULL THEN 1 END) as remittance_null
FROM gocardless_transactions gt
JOIN gocardless_accounts ga ON gt.account_id = ga.id
JOIN gocardless_institutions gi ON ga.institution_id = gi.id
WHERE gi.name ILIKE '%sabadell%'

UNION ALL

SELECT 
    'CaixaBank' as banco,
    COUNT(*) as total_transacciones,
    COUNT(CASE WHEN creditor_name IS NULL THEN 1 END) as creditor_name_null,
    COUNT(CASE WHEN remittance_information_unstructured IS NULL THEN 1 END) as remittance_null
FROM gocardless_transactions gt
JOIN gocardless_accounts ga ON gt.account_id = ga.id
JOIN gocardless_institutions gi ON ga.institution_id = gi.id
WHERE gi.name ILIKE '%caixa%';

-- 2. Ejemplos de raw_data de Banco de Sabadell (ejecutar por separado)
/*
SELECT 
    'Banco de Sabadell' as banco,
    raw_data::text as ejemplo_raw_data
FROM gocardless_transactions gt
JOIN gocardless_accounts ga ON gt.account_id = ga.id
JOIN gocardless_institutions gi ON ga.institution_id = gi.id
WHERE gi.name ILIKE '%sabadell%'
  AND raw_data IS NOT NULL
  AND raw_data::text != '{}'
  AND raw_data::text != 'null'
  AND creditor_name IS NULL
LIMIT 3;
*/

-- 3. Ejemplos de raw_data de CaixaBank (ejecutar por separado)
/*
SELECT 
    'CaixaBank' as banco,
    raw_data::text as ejemplo_raw_data
FROM gocardless_transactions gt
JOIN gocardless_accounts ga ON gt.account_id = ga.id
JOIN gocardless_institutions gi ON ga.institution_id = gi.id
WHERE gi.name ILIKE '%caixa%'
  AND raw_data IS NOT NULL
  AND raw_data::text != '{}'
  AND raw_data::text != 'null'
  AND creditor_name IS NULL
LIMIT 3;
*/
