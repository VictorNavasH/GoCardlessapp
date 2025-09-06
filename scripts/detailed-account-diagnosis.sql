-- Diagnóstico detallado: cuentas por banco y sus transacciones
SELECT 
  i.name as banco,
  a.id as account_id,
  a.gocardless_id as account_gocardless_id,
  a.account_name,
  a.status,
  a.current_balance,
  COUNT(t.id) as total_transacciones,
  MAX(t.created_at) as ultima_transaccion_sincronizada
FROM gocardless_institutions i
LEFT JOIN gocardless_accounts a ON i.id = a.institution_id
LEFT JOIN gocardless_transactions t ON a.id = t.account_id
WHERE i.name IN ('Banco de Sabadell', 'BBVA', 'CaixaBank')
GROUP BY i.name, a.id, a.gocardless_id, a.account_name, a.status, a.current_balance
ORDER BY i.name, a.account_name;
