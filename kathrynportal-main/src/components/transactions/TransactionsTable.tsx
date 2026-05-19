import { useNavigate } from "react-router-dom";
import type { ProjectListItem } from "@/api/projects";
import StatusBadge from "@/components/shared/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  docProgressPercent,
  dueDateBucket,
  dueDateClass,
  propertyStreet,
  propertySubline,
} from "@/lib/transactionListUtils";
import TransactionRowMenu from "./TransactionRowMenu";

type Props = {
  rows: ProjectListItem[];
  clientEmailById: Map<string, string>;
  loading?: boolean;
};

export function TransactionsTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-1 h-3 w-56" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-2 w-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function TransactionsTable({ rows, clientEmailById, loading }: Props) {
  const navigate = useNavigate();

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="min-w-[200px]">Property</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead className="hidden lg:table-cell">List price</TableHead>
          <TableHead className="min-w-[120px]">Documents</TableHead>
          <TableHead className="min-w-[140px]">Next step</TableHead>
          <TableHead className="w-12 text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TransactionsTableSkeleton />
        ) : (
          rows.map((project) => {
            const dueBucket = dueDateBucket(project.nextStepDate);
            const docPct = docProgressPercent(project);
            return (
              <TableRow
                key={project.id}
                className="cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <TableCell>
                  <p className="font-medium text-foreground">{propertyStreet(project.propertyAddress)}</p>
                  {propertySubline(project.propertyAddress) ? (
                    <p className="text-xs text-muted-foreground">{propertySubline(project.propertyAddress)}</p>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm text-foreground">{project.clientName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{project.type}</TableCell>
                <TableCell>
                  <StatusBadge status={project.stage} type="stage" />
                </TableCell>
                <TableCell className="hidden text-sm font-medium tabular-nums lg:table-cell">
                  {project.listPrice || "—"}
                </TableCell>
                <TableCell>
                  <div className="space-y-1.5 min-w-[100px]">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {project.documentsCompleteCount}/{project.documentsTotalCount}
                    </span>
                    <Progress value={docPct} className="h-1.5" />
                  </div>
                </TableCell>
                <TableCell>
                  <p className="max-w-[180px] truncate text-xs text-muted-foreground">{project.nextStep || "—"}</p>
                  <p className={cn("text-xs tabular-nums", dueDateClass(dueBucket))}>
                    {project.nextStepDate?.trim() || "—"}
                  </p>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <TransactionRowMenu
                    project={project}
                    clientEmail={clientEmailById.get(project.clientId)}
                  />
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
