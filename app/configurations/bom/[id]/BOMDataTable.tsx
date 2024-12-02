import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BOMItem } from "@/lib/BOM/BOM";

interface BOMDataTableProps {
  items: BOMItem[];
}

const BOMDataTable = ({ items }: BOMDataTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Codice</TableHead>
          <TableHead>Descrizione</TableHead>
          <TableHead>Qtà</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, key) => (
          <TableRow key={key}>
            <TableCell>{item.pn}</TableCell>
            <TableCell>{item._description}</TableCell>
            <TableCell>{item.qty}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default BOMDataTable;
