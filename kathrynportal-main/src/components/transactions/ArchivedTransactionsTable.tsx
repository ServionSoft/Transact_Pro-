import { Link } from "react-router-dom";
import type { ProjectListItem } from "@/api/projects";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { propertyStreet, propertySubline } from "@/lib/transactionListUtils";
import { cn } from "@/lib/utils";

type Props = {
  rows: ProjectListItem[];
  busyId: string | null;
  canRestore: boolean;
  canPurge: boolean;
  onRestore: (projectId: string) => void;
  onPurge: (projectId: string, label: string) => void;
};

function ArchivedRowActions({
  projectId,
  label,
  busy,
  canRestore,
  canPurge,
  onRestore,
  onPurge,
  stacked = false,
  className,
}: {
  projectId: string;
  label: string;
  busy: boolean;
  canRestore: boolean;
  canPurge: boolean;
  onRestore: (projectId: string) => void;
  onPurge: (projectId: string, label: string) => void;
  stacked?: boolean;
  className?: string;
}) {
  if (!canRestore && !canPurge) return null;
  return (
    <div
      className={cn(
        "flex gap-2",
        stacked ? "flex-col" : "flex-wrap justify-end",
        className,
      )}
    >
      {canRestore ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          className={cn("h-9", stacked && "w-full")}
          onClick={() => onRestore(projectId)}
        >
          Restore
        </Button>
      ) : null}
      {canPurge ? (
        <Button
          size="sm"
          variant="outline"
          className={cn(
            "h-9 text-destructive hover:text-destructive",
            stacked && "w-full",
          )}
          disabled={busy}
          onClick={() => onPurge(projectId, label)}
        >
          Remove permanently
        </Button>
      ) : null}
    </div>
  );
}

export default function ArchivedTransactionsTable({
  rows,
  busyId,
  canRestore,
  canPurge,
  onRestore,
  onPurge,
}: Props) {
  return (
    <>
      <ul className="touch-pan-y space-y-3 md:hidden">
        {rows.map((project) => {
          const label = propertyStreet(project.propertyAddress);
          const busy = busyId === project.id;
          return (
            <li
              key={project.id}
              className="touch-pan-y rounded-lg border border-border/80 bg-muted/10 p-4 shadow-sm"
            >
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="break-words text-sm font-medium text-foreground">{label}</p>
                  {propertySubline(project.propertyAddress) ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{propertySubline(project.propertyAddress)}</p>
                  ) : null}
                </div>
                <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Contact</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      <Link
                        to={`/clients/${project.clientId}`}
                        className="break-words hover:text-accent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.clientName}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{project.type}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Stage</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{project.stage}</dd>
                  </div>
                </dl>
                <ArchivedRowActions
                  projectId={project.id}
                  label={label}
                  busy={busy}
                  canRestore={canRestore}
                  canPurge={canPurge}
                  onRestore={onRestore}
                  onPurge={onPurge}
                  stacked
                  className="border-t border-border/60 pt-3"
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden min-w-0 md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[160px]">Property</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Type</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{project.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{project.stage}</TableCell>
                  <TableCell className="text-right">
                    <ArchivedRowActions
                      projectId={project.id}
                      label={label}
                      busy={busy}
                      canRestore={canRestore}
                      canPurge={canPurge}
                      onRestore={onRestore}
                      onPurge={onPurge}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
