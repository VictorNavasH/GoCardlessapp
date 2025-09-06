-- Análisis específico del formato de transacciones por banco
-- Para identificar por qué Banco de Sabadell no se corrige ni con el script

-- 1. Distribución de transacciones por banco
SELECT 
  i.name as banco,
  COUNT(t.id) as total_transacciones,
  COUNT(CASE WHEN t.creditor_name IS NULL THEN 1 END) as creditor_name_null,
  COUNT(CASE WHEN t.debtor_name IS NULL THEN 1 END) as debtor_name_null,
  COUNT(CASE WHEN t.remittance_information_unstructured IS NULL THEN 1 END) as remittance_null
FROM gocardless_transactions t
JOIN gocardless_accounts a ON t.account_id = a.id
JOIN gocardless_institutions i ON a.institution_id = i.id
GROUP BY i.name
ORDER BY total_transacciones DESC;

-- 2. Ejemplos específicos de raw_data por banco
SELECT 
  'Banco de Sabadell' as banco,
  LEFT(t.raw_data::text, 200) as ejemplo_raw_data,
  t.creditor_name,
  t.debtor_name,
  t.remittance_information_unstructured
FROM gocardless_transactions t
JOIN gocardless_accounts a ON t.account_id = a.id
JOIN gocardless_institutions i ON a.institution_id = i.id
WHERE i.name = 'Banco de Sabadell'
LIMIT 3;

-- 3. Comparación de estructura de raw_data entre bancos
SELECT 
  i.name as banco,
  COUNT(*) as total,
  COUNT(CASE WHEN t.raw_data::text LIKE '%remittanceInformationUnstructuredArray%' THEN 1 END) as tiene_remittance_array,
  COUNT(CASE WHEN t.raw_data::text LIKE '%transactionAmount%' THEN 1 END) as tiene_transaction_amount,
  COUNT(CASE WHEN t.raw_data::text LIKE '%bookingDate%' THEN 1 END) as tiene_booking_date
FROM gocardless_transactions t
JOIN gocardless_accounts a ON t.account_id = a.id
JOIN gocardless_institutions i ON a.institution_id = i.id
GROUP BY i.name
ORDER BY total DESC;
