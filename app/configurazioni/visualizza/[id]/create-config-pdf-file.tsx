import {
  Document,
  Page,
  pdf,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import {
  hex,
  PdfFooter,
  PdfHeader,
  PdfMetaLine,
  pdfStyles,
  rowBg,
} from "@/components/pdf/scaffolding";
import {
  buildCompleteConfigViewSections,
  type ViewSection,
} from "@/lib/configuration/build-config-view-model";
import { COLORS } from "@/lib/excel/workbook-builder";
import type { UpdateConfigSchema } from "@/validation/config-schema";
import type { UpdateWashBaySchema } from "@/validation/wash-bay-schema";
import type { UpdateWaterTankSchema } from "@/validation/water-tank-schema";

export interface ConfigPdfMeta {
  confId: number;
  clientName: string;
  /** Pre-formatted DD/MM/YYYY HH:mm generation timestamp. */
  generatedAt: string;
  generatorEmail: string | null;
}

const styles = StyleSheet.create({
  groupTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: "#14529f",
    marginTop: 16,
    marginBottom: 4,
  },
  sectionTitle: {
    backgroundColor: hex(COLORS.sectionTitleBg),
    color: hex(COLORS.sectionTitleFont),
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  subSectionTitle: {
    backgroundColor: hex(COLORS.subSectionBg),
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 8,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  colLabel: { width: "55%", color: "#444444" },
  colValue: { width: "45%", fontFamily: "Helvetica-Bold" },
});

const SectionBlock = ({ section }: { section: ViewSection }) => (
  <View>
    <Text style={styles.sectionTitle} minPresenceAhead={60}>
      {section.title}
    </Text>
    {section.groups.map((group) => (
      <View key={group.title ?? "main"}>
        {group.title && (
          <Text style={styles.subSectionTitle} minPresenceAhead={40}>
            {group.title}
          </Text>
        )}
        {group.rows.map((field, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are static and positional; labels can repeat within a section
          <View key={index} style={[pdfStyles.row, rowBg(index)]} wrap={false}>
            <Text style={styles.colLabel}>{field.label}</Text>
            <Text style={styles.colValue}>{field.value}</Text>
          </View>
        ))}
      </View>
    ))}
  </View>
);

interface ConfigPdfDocumentProps {
  configuration: UpdateConfigSchema;
  waterTanks: UpdateWaterTankSchema[];
  washBays: UpdateWashBaySchema[];
  meta: ConfigPdfMeta;
}

export const ConfigPdfDocument = ({
  configuration,
  waterTanks,
  washBays,
  meta,
}: ConfigPdfDocumentProps) => {
  const groups = buildCompleteConfigViewSections(
    configuration,
    waterTanks,
    washBays,
  );

  const generatedLine = `Generato il ${meta.generatedAt}${
    meta.generatorEmail ? ` da ${meta.generatorEmail}` : ""
  }`;

  return (
    <Document title={`Configurazione ${meta.confId}`} author="ITECO SRL">
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Configurazione">
          <PdfMetaLine>Configurazione #{meta.confId}</PdfMetaLine>
          <PdfMetaLine>Cliente: {meta.clientName}</PdfMetaLine>
          <PdfMetaLine>{generatedLine}</PdfMetaLine>
        </PdfHeader>

        {groups.map((group) => (
          <View key={group.title ?? "config"}>
            {group.title && (
              <Text style={styles.groupTitle} minPresenceAhead={60}>
                {group.title}
              </Text>
            )}
            {group.sections.map((section) => (
              <SectionBlock key={section.title} section={section} />
            ))}
          </View>
        ))}

        <PdfFooter generatedLine={generatedLine} />
      </Page>
    </Document>
  );
};

export async function createConfigPdfFile(
  configuration: UpdateConfigSchema,
  waterTanks: UpdateWaterTankSchema[],
  washBays: UpdateWashBaySchema[],
  meta: ConfigPdfMeta,
): Promise<void> {
  const blob = await pdf(
    <ConfigPdfDocument
      configuration={configuration}
      waterTanks={waterTanks}
      washBays={washBays}
      meta={meta}
    />,
  ).toBlob();
  const date = new Date().toISOString().slice(0, 10);
  saveAs(blob, `Configurazione_${meta.confId}_${date}.pdf`);
}
