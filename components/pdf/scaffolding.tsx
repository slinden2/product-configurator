import { StyleSheet, Text, View } from "@react-pdf/renderer";
import ItecoLogo from "@/components/pdf/iteco-logo";
import { COLORS } from "@/lib/excel/workbook-builder";

export const hex = (color: string) => `#${color}`;

/**
 * Style entries shared verbatim by the offer and config PDF generators.
 * Document-specific entries (section titles, column widths) stay local to
 * each generator.
 */
export const pdfStyles = StyleSheet.create({
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
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
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

/** Zebra background for positional table rows. */
export const rowBg = (index: number) => ({
  backgroundColor: hex(index % 2 === 0 ? COLORS.white : COLORS.lightGray),
});

/** Document title block + ITECO logo; children are the PdfMetaLine rows. */
export const PdfHeader = ({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) => (
  <View style={pdfStyles.header}>
    <View>
      <Text style={pdfStyles.title}>{title}</Text>
      {children}
    </View>
    <ItecoLogo width={120} />
  </View>
);

export const PdfMetaLine = ({ children }: { children: React.ReactNode }) => (
  <Text style={pdfStyles.metaLine}>{children}</Text>
);

/** Fixed "Generato il ... / Pagina X di Y" footer. */
export const PdfFooter = ({ generatedLine }: { generatedLine: string }) => (
  <View style={pdfStyles.footer} fixed>
    <Text>{generatedLine}</Text>
    <Text
      render={({ pageNumber, totalPages }) =>
        `Pagina ${pageNumber} di ${totalPages}`
      }
    />
  </View>
);
