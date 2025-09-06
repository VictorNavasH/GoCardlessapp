-- Script SQL para procesar transacciones existentes de CaixaBank y Sabadell
-- Extrae información útil del campo raw_data y actualiza campos principales vacíos

UPDATE gocardless_transactions 
SET 
  remittance_information_unstructured = CASE 
    WHEN raw_data::json->'remittanceInformationUnstructuredArray'->0 IS NOT NULL 
    THEN raw_data::json->'remittanceInformationUnstructuredArray'->>0
    ELSE remittance_information_unstructured
  END,
  
  creditor_name = CASE 
    WHEN creditor_name IS NULL AND raw_data::json->>'creditorName' IS NOT NULL 
    THEN raw_data::json->>'creditorName'
    ELSE creditor_name
  END,
  
  debtor_name = CASE 
    WHEN debtor_name IS NULL AND raw_data::json->>'debtorName' IS NOT NULL 
    THEN raw_data::json->>'debtorName'
    ELSE debtor_name
  END,
  
  updated_at = NOW()

WHERE 
  -- Solo transacciones con campos principales vacíos pero con raw_data
  (remittance_information_unstructured IS NULL OR creditor_name IS NULL OR debtor_name IS NULL)
  AND raw_data IS NOT NULL 
  -- Corregida sintaxis JSON para PostgreSQL
  AND raw_data::text != '{}'
  AND raw_data::text != 'null'
  AND raw_data::json IS NOT NULL;

-- Mostrar resultados
SELECT 
  'Transacciones procesadas' as resultado,
  COUNT(*) as cantidad
FROM gocardless_transactions 
WHERE updated_at >= NOW() - INTERVAL '1 minute';
