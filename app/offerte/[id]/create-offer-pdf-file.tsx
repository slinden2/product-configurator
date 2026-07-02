import {
  Document,
  Page,
  pdf,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import ItecoLogo from "@/components/pdf/iteco-logo";
import { COLORS } from "@/lib/excel/workbook-builder";
import type {
  OfferExportLine,
  OfferRevisionExportData,
} from "@/lib/offer-export";
import { formatDiscountPctLabel, formatEur } from "@/lib/utils";

export interface OfferPdfMeta {
  offerNumber: string;
  customerName: string;
  /** Pre-formatted DD/MM/YYYY HH:mm export timestamp. */
  generatedAt: string;
  /** Initials of the user who triggered the export; empty hides the author. */
  generatorInitials: string;
}

const hex = (color: string) => `#${color}`;

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 36,
    paddingBottom: 56,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#14529f",
    marginBottom: 6,
  },
  metaLine: { marginBottom: 2, color: "#444444" },
  sectionTitle: {
    backgroundColor: hex(COLORS.sectionTitleBg),
    color: hex(COLORS.sectionTitleFont),
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 14,
    marginBottom: 4,
  },
  subSectionTitle: {
    backgroundColor: hex(COLORS.subSectionBg),
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  headerRow: {
    backgroundColor: hex(COLORS.lightGray),
    fontFamily: "Helvetica-Bold",
  },
  subtotalRow: {
    backgroundColor: hex(COLORS.subtotalBg),
    fontFamily: "Helvetica-Bold",
  },
  grandTotalRow: {
    backgroundColor: hex(COLORS.grandTotalBg),
    fontFamily: "Helvetica-Bold",
  },
  colPn: { width: "16%" },
  colDescription: { width: "54%" },
  /** Description width when the price column is hidden (net-total-only mode). */
  colDescriptionWide: { width: "76%" },
  colQty: { width: "8%", textAlign: "right" },
  colPrice: { width: "22%", textAlign: "right" },
  summaryLabel: { width: "78%" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#cccccc",
    paddingTop: 4,
    fontSize: 8,
    color: "#666666",
  },
});

interface PdfRowItem {
  pn: string;
  description: string;
  qty: number;
  /** null renders an empty price cell (BOM item rows, mirroring the Excel export). */
  price: number | null;
}

const rowBg = (index: number) => ({
  backgroundColor: hex(index % 2 === 0 ? COLORS.white : COLORS.lightGray),
});

const ColumnHeaderRow = ({ netOnly }: { netOnly: boolean }) => (
  <View style={[styles.row, styles.headerRow]} wrap={false}>
    <Text style={styles.colPn}>Codice</Text>
    <Text style={netOnly ? styles.colDescriptionWide : styles.colDescription}>
      Descrizione
    </Text>
    <Text style={styles.colQty}>Qta</Text>
    {!netOnly && <Text style={styles.colPrice}>Prezzo Listino</Text>}
  </View>
);

const ItemRow = ({
  item,
  index,
  netOnly,
}: {
  item: PdfRowItem;
  index: number;
  netOnly: boolean;
}) => (
  <View style={[styles.row, rowBg(index)]} wrap={false}>
    <Text style={styles.colPn}>{item.pn}</Text>
    <Text style={netOnly ? styles.colDescriptionWide : styles.colDescription}>
      {item.description}
    </Text>
    <Text style={styles.colQty}>{item.qty}</Text>
    {!netOnly && (
      <Text style={styles.colPrice}>
        {item.price === null ? "" : formatEur(item.price)}
      </Text>
    )}
  </View>
);

const SubtotalRow = ({ label, total }: { label: string; total: number }) => (
  <View style={[styles.row, styles.subtotalRow]} wrap={false}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.colPrice}>{formatEur(total)}</Text>
  </View>
);

const SectionTitle = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitle} minPresenceAhead={60}>
    {title}
  </Text>
);

const SubSection = ({
  title,
  items,
  subtotalLabel,
  total,
  netOnly,
}: {
  title: string;
  items: PdfRowItem[];
  subtotalLabel: string;
  total: number;
  netOnly: boolean;
}) => (
  <View>
    <Text style={styles.subSectionTitle} minPresenceAhead={40}>
      {title}
    </Text>
    <ColumnHeaderRow netOnly={netOnly} />
    {items.map((item, i) => (
      <ItemRow key={item.pn} item={item} index={i} netOnly={netOnly} />
    ))}
    {!netOnly && <SubtotalRow label={subtotalLabel} total={total} />}
  </View>
);

type PdfStyle = Exclude<
  NonNullable<React.ComponentProps<typeof View>["style"]>,
  readonly unknown[]
>;

const SummaryRow = ({
  label,
  total,
  style,
}: {
  label: string;
  /** null renders the label only (e.g. "Trasporto compreso"). */
  total: number | null;
  style: PdfStyle;
}) => (
  <View style={[styles.row, style]} wrap={false}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.colPrice}>
      {total === null ? "" : formatEur(total)}
    </Text>
  </View>
);

const toRowItem = (item: {
  pn: string;
  description: string;
  qty: number;
}): PdfRowItem => ({
  pn: item.pn,
  description: item.description,
  qty: item.qty,
  price: null,
});

const OfferLineSection = ({
  line,
  netOnly,
}: {
  line: OfferExportLine;
  netOnly: boolean;
}) => (
  <View>
    <SectionTitle title={line.title} />
    {line.data.general.map((group) => (
      <SubSection
        key={group.tag}
        title={group.label}
        items={group.items.map(toRowItem)}
        subtotalLabel={`Subtotale ${group.label}`}
        total={group.total}
        netOnly={netOnly}
      />
    ))}
    {line.data.waterTanks.map((section) => (
      <SubSection
        key={`tank-${section.index}`}
        title={`Serbatoio ${section.index + 1}`}
        items={section.items.map(toRowItem)}
        subtotalLabel={`Subtotale Serbatoio ${section.index + 1}`}
        total={section.total}
        netOnly={netOnly}
      />
    ))}
    {line.data.washBays.map((section) => (
      <SubSection
        key={`bay-${section.index}`}
        title={`Pista ${section.index + 1}`}
        items={section.items.map(toRowItem)}
        subtotalLabel={`Subtotale Pista ${section.index + 1}`}
        total={section.total}
        netOnly={netOnly}
      />
    ))}
    {line.surcharges.length > 0 && (
      <View>
        <Text style={styles.subSectionTitle} minPresenceAhead={40}>
          Maggiorazioni
        </Text>
        <ColumnHeaderRow netOnly={netOnly} />
        {line.surcharges.map((item, i) => (
          <ItemRow
            key={item.surcharge_kind}
            item={{
              pn: "",
              description: item.description,
              qty: item.qty,
              price: item.line_total,
            }}
            index={i}
            netOnly={netOnly}
          />
        ))}
      </View>
    )}
    {!netOnly && (
      <SubtotalRow
        label={`Totale ${line.title}`}
        total={line.unitListPrice * line.quantity}
      />
    )}
  </View>
);

interface OfferPdfDocumentProps {
  data: OfferRevisionExportData;
  meta: OfferPdfMeta;
}

export const OfferPdfDocument = ({ data, meta }: OfferPdfDocumentProps) => {
  const netOnly = !data.showPrices;
  const generatedLine = `Generato il ${meta.generatedAt}${
    meta.generatorInitials ? ` da ${meta.generatorInitials}` : ""
  }`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Offerta {meta.offerNumber}</Text>
            <Text style={styles.metaLine}>Revisione {data.revisionNo}</Text>
            <Text style={styles.metaLine}>{meta.customerName}</Text>
            {data.customerAddress && (
              <Text style={styles.metaLine}>{data.customerAddress}</Text>
            )}
            {data.customerEmail && (
              <Text style={styles.metaLine}>{data.customerEmail}</Text>
            )}
          </View>
          <ItecoLogo width={120} />
        </View>

        {data.lines.map((line) => (
          <OfferLineSection key={line.title} line={line} netOnly={netOnly} />
        ))}

        <SectionTitle title="Riepilogo offerta" />
        {data.showPrices && (
          <>
            <SummaryRow
              label="TOTALE LISTINO"
              total={data.totalListPrice}
              style={styles.grandTotalRow}
            />
            {data.discountPct > 0 && (
              <SummaryRow
                label={`Sconto (${formatDiscountPctLabel(data.discountPct)}%)`}
                total={-(data.totalListPrice - data.discountedTotal)}
                style={styles.subtotalRow}
              />
            )}
            {data.discountedTotal !== data.totalListPrice && (
              <SummaryRow
                label="TOTALE SCONTATO"
                total={data.discountedTotal}
                style={styles.grandTotalRow}
              />
            )}
          </>
        )}
        <SummaryRow
          label={data.extras.transportRow.label}
          total={data.extras.transportRow.amount}
          style={styles.subtotalRow}
        />
        <SummaryRow
          label={data.extras.installationRow.label}
          total={data.extras.installationRow.amount}
          style={styles.subtotalRow}
        />
        {(!data.showPrices || data.extras.hasNetAdjustments) && (
          <SummaryRow
            label="TOTALE NETTO"
            total={data.extras.net_total}
            style={styles.grandTotalRow}
          />
        )}

        <View style={styles.footer} fixed>
          <Text>{generatedLine}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} di ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export async function createOfferPdfFile(
  data: OfferRevisionExportData,
  meta: OfferPdfMeta,
  filename: string,
): Promise<void> {
  const blob = await pdf(<OfferPdfDocument data={data} meta={meta} />).toBlob();
  saveAs(blob, filename);
}
