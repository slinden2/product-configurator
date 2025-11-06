WITH LatestCosts AS (
    -- Get the most recent cost for each part number
    -- This is used as a "fallback" for assemblies as they do not have supplier prices.
    -- This uses the "ITECO_VW_REBPD_0004" view which is updated with the data from "calcolo costi"
    SELECT
        Figlio AS part_number,  -- Part number
        Totale                   -- Total cost
    FROM (
        SELECT
            Figlio,              -- Part number
            Totale,              -- Total cost
            -- Rank costs by date (newest first) for each part
            ROW_NUMBER() OVER (PARTITION BY Figlio ORDER BY PD75_IDCOSTO DESC) as rn
        FROM [ITECO_VW_REBPD_0004]
        WHERE Padre = Figlio     -- Only include parts where parent = child (final products, primo livello)
    ) ranked_costs
    WHERE rn = 1  -- Only keep the most recent cost for each part
),

PreferredSupplier AS (
    -- Get the preferred supplier for each part
    -- This is used to match parts with their preferred supplier's pricing
    SELECT
        MG73_CODART_MG66 AS part_number,    -- Part number
        MG73_CLIFOR_CG44 AS supplier        -- Supplier code
    FROM MG73_ARTCLIFOR
    WHERE MG73_FLGFORPREF = 1  -- Only include preferred suppliers
),

LatestPrices AS (
    -- Get the latest pricing information from preferred suppliers
    -- This includes base price and calculates final price with discounts/increases
    SELECT
        LI16_CODART_MG66 AS part_number,    -- Part number
        LI16_CLIFOR_CG44 AS supplier,       -- Supplier code
        LI16_PREZZO AS price,               -- Base price
        LI16_SC1PER AS discount1pct,        -- First discount percentage
        LI16_SC2PER AS discount2pct,        -- Second discount percentage
        LI16_SC3PER AS discount3pct,        -- Third discount percentage
        LI16_MAG1PER AS incr1pct,           -- First price increase percentage
        LI16_MAG2PER AS incr2pct,           -- Second price increase percentage
        -- Calculate final price by applying discounts then increases to base price
        LI16_PREZZO *
        (1 - ISNULL(LI16_SC1PER, 0)/100.0) *  -- Apply first discount
        (1 - ISNULL(LI16_SC2PER, 0)/100.0) *  -- Apply second discount
        (1 - ISNULL(LI16_SC3PER, 0)/100.0) *  -- Apply third discount
        (1 + ISNULL(LI16_MAG1PER, 0)/100.0) *  -- Apply first increase
        (1 + ISNULL(LI16_MAG2PER, 0)/100.0) AS final_price  -- Apply second increase
    FROM (
        -- Get all pricing information and rank by effective date (newest first)
        SELECT
            LI16_CODART_MG66,
            LI16_CLIFOR_CG44,
            LI16_PREZZO,
            LI16_SC1PER,
            LI16_SC2PER,
            LI16_SC3PER,
            LI16_MAG1PER,
            LI16_MAG2PER,
            ROW_NUMBER() OVER (PARTITION BY LI16_CODART_MG66 ORDER BY LI16_DATAINIZIOVAL DESC) as rn
        FROM LI16_LISTARTCF
    ) ranked_prices
    WHERE rn = 1  -- Only keep the most recent pricing for each part
)

-- Main query to get part information with calculated costs
SELECT
    parts.MG66_CODART AS pn,                     -- Part number
    parts_desc.MG87_DESCART AS description,      -- Part description
    CAST(production_data.PD18_CODPROV_PD21 AS INT) AS pn_type,  -- Part type (1 or 2 from dati produzione)
    production_data.PD18_FLGFANTASMA AS is_phantom,  -- Flag for phantom parts
    -- Use supplier price if available (for type 2 parts), otherwise use latest cost
    COALESCE(
        CASE WHEN CAST(production_data.PD18_CODPROV_PD21 AS INT) = 2 
             THEN latest_prices.final_price  -- Use calculated price for type 2 parts
             ELSE NULL  -- No price for non-type 2 parts
        END,
        lc.Totale  -- Fallback to latest cost if no supplier price
    ) AS cost
FROM MG66_ANAGRART AS parts
-- Join with part descriptions
INNER JOIN MG87_ARTDESC AS parts_desc ON parts.MG66_CODART = parts_desc.MG87_CODART_MG66
-- Join with production data
INNER JOIN PD18_ARTPROD AS production_data ON PD18_CODART_MG66 = parts.MG66_CODART
-- Join with latest costs (for fallback pricing)
LEFT JOIN LatestCosts lc ON parts.MG66_CODART = lc.part_number
-- Join with preferred suppliers
LEFT JOIN PreferredSupplier ps ON parts.MG66_CODART = ps.part_number
-- Join with latest prices from preferred suppliers
LEFT JOIN LatestPrices latest_prices ON ps.supplier = latest_prices.supplier
  AND latest_prices.part_number = parts.MG66_CODART
-- Filter to only include parts with empty language and option fields
WHERE (parts_desc.MG87_LINGUA_MG52 IS NULL OR parts_desc.MG87_LINGUA_MG52 = '')
  AND (parts_desc.MG87_OPZIONE_MG5E IS NULL OR parts_desc.MG87_OPZIONE_MG5E = '')
