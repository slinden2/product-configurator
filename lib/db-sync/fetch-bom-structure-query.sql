-- Fetch all direct parent -> child BOM pairs from TSE.
SELECT
    RTRIM(hdr.PD95_CODART_MG66)   AS parent_pn,
    RTRIM(rows.PD96_COMPON)       AS child_pn,
    rows.PD96_QUANT_1             AS qty,
    rows.PD96_SEQCOMP             AS sort_order
FROM PD95_DISBA hdr
INNER JOIN PD96_LEGAMIDISBA rows
    ON rows.PD96_IDDISBA_PD95 = hdr.PD95_IDDISBA
WHERE hdr.PD95_TIPO_DISTINTA = 0
  AND hdr.PD95_OPZIONE = ''
  -- 99 = standard explodable BOM; 0 = "do not explode" in the ERP (set on
  -- subcontract-treated parts and a few internally finished parts). Both are
  -- synced so bom_lines holds the full BOM truth — explosion stop rules are
  -- applied downstream (is_subcontract early stop in lib/BOM/explode-bom.ts).
  AND hdr.PD95_INDTIPOESPL IN (0, 99);
