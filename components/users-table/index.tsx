import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserWithStats } from "@/db/queries";
import UserRow from "./user-row";

interface UsersTableProps {
  users: UserWithStats[];
  currentUserId: string;
}

const headers = [
  "Email",
  "Ruolo",
  "Iniziali",
  "N. Configurazioni",
  "Ultima Attività",
  "Ultimo Login",
  "Azioni",
];

const UsersTable = ({ users, currentUserId }: UsersTableProps) => {
  return (
    <div className="rounded-md sm:border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {headers.map((header) => (
              <TableHead key={header} className="uppercase text-xs">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length > 0 ? (
            users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                currentUserId={currentUserId}
              />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={headers.length}>
                Nessun utente trovato.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default UsersTable;
