import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BOMItemWithDescription } from "@/lib/BOM/BOM";

interface BOMDataTableProps {
  items: BOMItemWithDescription[];
}

const BOMDataTable = ({ items }: BOMDataTableProps) => {
  return (
    <Table className="mb-3 rounded-lg font-mono">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="table-cell w-32 py-2">Codice</TableHead>
          <TableHead className="table-cell flex-1 py-2">Descrizione</TableHead>
          <TableHead className="table-cell w-24 py-2 text-center">
            Qtà
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="text-sm">
        {items.map((item, key) => (
          <TableRow key={key}>
            <TableCell className="table-cell w-24 py-2">{item.pn}</TableCell>
            <TableCell className="table-cell flex-1 py-2">
              {item.description}
            </TableCell>
            <TableCell className="table-cell w-24 py-2 text-center">
              {item.qty}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default BOMDataTable;
