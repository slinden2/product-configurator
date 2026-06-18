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

const rowBg = (index: number) => ({
  backgroundColor: hex(index % 2 === 0 ? COLORS.white : COLORS.lightGray),
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
          <View key={index} style={[styles.row, rowBg(index)]} wrap={false}>
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
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Configurazione</Text>
            <Text style={styles.metaLine}>Configurazione #{meta.confId}</Text>
            <Text style={styles.metaLine}>Cliente: {meta.clientName}</Text>
            <Text style={styles.metaLine}>{generatedLine}</Text>
          </View>
          <ItecoLogo width={120} />
        </View>

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
