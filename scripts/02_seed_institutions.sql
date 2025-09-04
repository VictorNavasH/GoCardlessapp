-- Updated table name from institutions to gocardless_institutions and added gocardless_id column
INSERT INTO gocardless_institutions (gocardless_id, name, bic, countries, logo_url) VALUES
('BBVA_BBVAESMM', 'BBVA', 'BBVAESMM', '["ES"]', 'https://cdn.nordigen.com/ais/BBVA_BBVAESMM.png'),
('SANTANDER_BSCHESMM', 'Banco Santander', 'BSCHESMM', '["ES"]', 'https://cdn.nordigen.com/ais/SANTANDER_BSCHESMM.png'),
('CAIXABANK_CAIXESBB', 'CaixaBank', 'CAIXESBB', '["ES"]', 'https://cdn.nordigen.com/ais/CAIXABANK_CAIXESBB.png'),
('BANKIA_CAHMESMMXXX', 'Bankia', 'CAHMESMM', '["ES"]', 'https://cdn.nordigen.com/ais/BANKIA_CAHMESMMXXX.png'),
('SABADELL_BSABESBB', 'Banco Sabadell', 'BSABESBB', '["ES"]', 'https://cdn.nordigen.com/ais/SABADELL_BSABESBB.png'),
('ING_INGDESMMXXX', 'ING', 'INGDESMM', '["ES"]', 'https://cdn.nordigen.com/ais/ING_INGDESMMXXX.png'),
('OPENBANK_OPENESMM', 'Openbank', 'OPENESMM', '["ES"]', 'https://cdn.nordigen.com/ais/OPENBANK_OPENESMM.png'),
('UNICAJA_UCJAES2M', 'Unicaja Banco', 'UCJAES2M', '["ES"]', 'https://cdn.nordigen.com/ais/UNICAJA_UCJAES2M.png'),
('SANDBOXFINANCE_SFIN0000', 'Sandbox Finance', 'SFIN0000', '["GB"]', 'https://cdn.nordigen.com/ais/SANDBOXFINANCE_SFIN0000.png')
ON CONFLICT (gocardless_id) DO NOTHING;
