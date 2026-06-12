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
import { sumSurchargeTotal } from "@/lib/offer-surcharges";
import { formatDiscountPctLabel, formatEur } from "@/lib/utils";
import type { ExportOfferData } from "./create-offer-excel-file";

export interface OfferPdfMeta {
  confId: number;
  clientName: string;
  /** Pre-formatted DD/MM/YYYY HH:mm snapshot generation timestamp. */
  generatedAt: string;
  generatorEmail: string | null;
  /** Italian source label: "distinta di commessa" | "calcolo automatico". */
  sourceLabel: string;
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

const ColumnHeaderRow = () => (
  <View style={[styles.row, styles.headerRow]} wrap={false}>
    <Text style={styles.colPn}>Codice</Text>
    <Text style={styles.colDescription}>Descrizione</Text>
    <Text style={styles.colQty}>Qta</Text>
    <Text style={styles.colPrice}>Prezzo Listino</Text>
  </View>
);

const ItemRow = ({ item, index }: { item: PdfRowItem; index: number }) => (
  <View style={[styles.row, rowBg(index)]} wrap={false}>
    <Text style={styles.colPn}>{item.pn}</Text>
    <Text style={styles.colDescription}>{item.description}</Text>
    <Text style={styles.colQty}>{item.qty}</Text>
    <Text style={styles.colPrice}>
      {item.price === null ? "" : formatEur(item.price)}
    </Text>
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
}: {
  title: string;
  items: PdfRowItem[];
  subtotalLabel: string;
  total: number;
}) => (
  <View>
    <Text style={styles.subSectionTitle} minPresenceAhead={40}>
      {title}
    </Text>
    <ColumnHeaderRow />
    {items.map((item, i) => (
      <ItemRow key={item.pn} item={item} index={i} />
    ))}
    <SubtotalRow label={subtotalLabel} total={total} />
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
  total: number;
  style: PdfStyle;
}) => (
  <View style={[styles.row, style]} wrap={false}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.colPrice}>{formatEur(total)}</Text>
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

interface OfferPdfDocumentProps {
  data: ExportOfferData;
  meta: OfferPdfMeta;
  discountPct: number;
}

export const OfferPdfDocument = ({
  data,
  meta,
  discountPct,
}: OfferPdfDocumentProps) => {
  const hasDiscount = discountPct > 0;
  const surchargeTotal = sumSurchargeTotal(data.surcharges);
  const discountAmount =
    Math.round((data.total_list_price - data.discounted_total) * 100) / 100;

  const summarySections = [
    {
      name: "Distinta generale",
      total: data.general.reduce((s, g) => s + g.total, 0),
    },
    {
      name: "Serbatoi",
      total: data.waterTanks.reduce((s, t) => s + t.total, 0),
    },
    { name: "Piste", total: data.washBays.reduce((s, b) => s + b.total, 0) },
    { name: "Maggiorazioni", total: surchargeTotal },
  ];

  const generatedLine = `Offerta generata il ${meta.generatedAt}${
    meta.generatorEmail ? ` da ${meta.generatorEmail}` : ""
  }`;

  return (
    <Document
      title={`Offerta configurazione ${meta.confId}`}
      author="ITECO SRL"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Offerta</Text>
            <Text style={styles.metaLine}>Configurazione #{meta.confId}</Text>
            <Text style={styles.metaLine}>Cliente: {meta.clientName}</Text>
            <Text style={styles.metaLine}>{generatedLine}</Text>
            <Text style={styles.metaLine}>Fonte: {meta.sourceLabel}</Text>
          </View>
          <ItecoLogo width={120} />
        </View>

        <SectionTitle title="Riepilogo offerta" />
        <View style={[styles.row, styles.headerRow]} wrap={false}>
          <Text style={styles.summaryLabel}>Sezione</Text>
          <Text style={styles.colPrice}>Prezzo Listino</Text>
        </View>
        {summarySections.map((section, i) => (
          <SummaryRow
            key={section.name}
            label={section.name}
            total={section.total}
            style={rowBg(i)}
          />
        ))}
        <SummaryRow
          label="TOTALE LISTINO"
          total={data.total_list_price}
          style={styles.grandTotalRow}
        />
        {hasDiscount && (
          <>
            <SummaryRow
              label={`Sconto (${formatDiscountPctLabel(discountPct)}%)`}
              total={-discountAmount}
              style={styles.subtotalRow}
            />
            <SummaryRow
              label="TOTALE SCONTATO"
              total={data.discounted_total}
              style={styles.grandTotalRow}
            />
          </>
        )}

        {data.general.length > 0 && (
          <View>
            <SectionTitle title="Distinta generale" />
            {data.general.map((group) => (
              <SubSection
                key={group.tag}
                title={group.label}
                items={group.items.map(toRowItem)}
                subtotalLabel={`Subtotale ${group.label}`}
                total={group.total}
              />
            ))}
          </View>
        )}

        {data.waterTanks.length > 0 && (
          <View>
            <SectionTitle title="Serbatoi" />
            {data.waterTanks.map((section) => (
              <SubSection
                key={section.index}
                title={`Serbatoio ${section.index + 1}`}
                items={section.items.map(toRowItem)}
                subtotalLabel={`Subtotale Serbatoio ${section.index + 1}`}
                total={section.total}
              />
            ))}
          </View>
        )}

        {data.washBays.length > 0 && (
          <View>
            <SectionTitle title="Piste" />
            {data.washBays.map((section) => (
              <SubSection
                key={section.index}
                title={`Pista ${section.index + 1}`}
                items={section.items.map(toRowItem)}
                subtotalLabel={`Subtotale Pista ${section.index + 1}`}
                total={section.total}
              />
            ))}
          </View>
        )}

        {data.surcharges.length > 0 && (
          <View>
            <SectionTitle title="Maggiorazioni" />
            <ColumnHeaderRow />
            {data.surcharges.map((item, i) => (
              <ItemRow
                key={item.surcharge_kind}
                item={{
                  pn: "",
                  description: item.description,
                  qty: item.qty,
                  price: item.line_total,
                }}
                index={i}
              />
            ))}
            <SubtotalRow
              label="Subtotale Maggiorazioni"
              total={surchargeTotal}
            />
          </View>
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
  data: ExportOfferData,
  meta: OfferPdfMeta,
  discountPct: number,
): Promise<void> {
  const blob = await pdf(
    <OfferPdfDocument data={data} meta={meta} discountPct={discountPct} />,
  ).toBlob();
  const date = new Date().toISOString().slice(0, 10);
  saveAs(blob, `Offerta_${meta.confId}_${date}.pdf`);
}
