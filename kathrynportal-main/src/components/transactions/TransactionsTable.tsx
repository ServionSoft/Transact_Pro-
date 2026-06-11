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
    <div className="min-w-0 overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="min-w-[160px]">Property</TableHead>
          <TableHead className="hidden md:table-cell">Contact</TableHead>
          <TableHead className="hidden lg:table-cell">Type</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead className="hidden xl:table-cell">List price</TableHead>
          <TableHead className="hidden lg:table-cell min-w-[100px]">Documents</TableHead>
          <TableHead className="hidden xl:table-cell min-w-[120px]">Next step</TableHead>
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
                <TableCell className="hidden text-sm text-foreground md:table-cell">{project.clientName}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{project.type}</TableCell>
                <TableCell>
                  <StatusBadge status={project.stage} type="stage" />
                </TableCell>
                <TableCell className="hidden text-sm font-medium tabular-nums xl:table-cell">
                  {project.listPrice || "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="min-w-[100px] space-y-1.5">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {project.documentsCompleteCount}/{project.documentsTotalCount}
                    </span>
                    <Progress value={docPct} className="h-1.5" />
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
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
    </div>
  );
}
