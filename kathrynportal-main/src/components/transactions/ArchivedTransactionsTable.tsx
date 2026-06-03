import { Link } from "react-router-dom";
import type { ProjectListItem } from "@/api/projects";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { propertyStreet, propertySubline } from "@/lib/transactionListUtils";

type Props = {
  rows: ProjectListItem[];
  busyId: string | null;
  canRestore: boolean;
  canPurge: boolean;
  onRestore: (projectId: string) => void;
  onPurge: (projectId: string, label: string) => void;
};

export default function ArchivedTransactionsTable({
  rows,
  busyId,
  canRestore,
  canPurge,
  onRestore,
  onPurge,
}: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="min-w-[200px]">Property</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead className="text-right min-w-[200px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((project) => {
          const label = propertyStreet(project.propertyAddress);
          const busy = busyId === project.id;
          return (
            <TableRow key={project.id}>
              <TableCell>
                <p className="font-medium text-foreground">{label}</p>
                {propertySubline(project.propertyAddress) ? (
                  <p className="text-xs text-muted-foreground">{propertySubline(project.propertyAddress)}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <Link
                  to={`/clients/${project.clientId}`}
                  className="text-sm text-foreground hover:text-accent"
                  onClick={(e) => e.stopPropagation()}
                >
                  {project.clientName}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{project.type}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{project.stage}</TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {canRestore ? (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => onRestore(project.id)}>
                      Restore
                    </Button>
                  ) : null}
                  {canPurge ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => onPurge(project.id, label)}
                    >
                      Remove permanently
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
