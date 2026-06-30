import { Link } from "react-router-dom";
import { Calendar, CheckSquare, ChevronRight, FileText, Paperclip } from "lucide-react";
import { motion } from "framer-motion";
import type { Project } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { dueDateBucket, dueDateClass, isBuyerTransaction, transactionTypeLabel } from "@/lib/transactionListUtils";
import type { PartyGroup } from "@/lib/transactionMetadataParties";
import { resolveProjectEscrowOfficer } from "@/lib/transactionMetadataParties";
import {
  getListingDetailRows,
  getPropertyDetailRows,
  getTransactionDetailRows,
  getTransactionTimelineRows,
  type OverviewDetailRow,
} from "@/lib/transactionOverviewMetadata";
import DetailRow from "./DetailRow";
import CollapsibleSectionCard from "./CollapsibleSectionCard";
import SectionCard from "./SectionCard";
import TransactionPartiesSection from "./TransactionPartiesSection";
import type { TransactionDetailTabId } from "./transactionDetailTabs";

type SigCounts = { out: number; signed: number; awaiting: number };

type StatTileProps = {
  label: string;
  value: string;
  sub?: string;
  progress?: number;
  icon: typeof FileText;
  onClick: () => void;
};

function StatTile({ label, value, sub, progress, icon: Icon, onClick }: StatTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/20"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="font-display text-xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {sub ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p> : null}
      {progress !== undefined ? <Progress value={progress} className="mt-2 h-1" /> : null}
    </button>
  );
}

function DetailRows({ rows, className, columns = 2 }: { rows: OverviewDetailRow[]; className?: string; columns?: 1 | 2 }) {
  return (
    <div
      className={cn(
        columns === 2 ? "grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2" : "space-y-2",
        className,
      )}
    >
      {rows.map((r) => (
        <DetailRow key={r.label} label={r.label} value={r.value} className="text-xs" />
      ))}
    </div>
  );
}

type Props = {
  project: Project;
  metadata: Record<string, unknown> | undefined;
  docProgress: { done: number; total: number };
  sigCounts: SigCounts;
  deadlinesCount: number;
  filesCount: number;
  nextDeadline: { title: string; date: string } | null;
  partyGroups: PartyGroup[];
  effectiveSellerMatch: string;
  assignmentOptions: Array<{ id: string; name: string; email: string; designation?: string | null }>;
  canAssignMembers: boolean;
  apiOn: boolean;
  savingAssignments: boolean;
  onNavigateTab: (tab: TransactionDetailTabId) => void;
  onAssignmentsChange: (userIds: string[]) => void;
  onEmailParty: (email: string, name: string) => void;
};

export default function TransactionOverviewTab({
  project,
  metadata,
  docProgress,
  sigCounts,
  deadlinesCount,
  filesCount,
  nextDeadline,
  partyGroups,
  effectiveSellerMatch,
  assignmentOptions,
  canAssignMembers,
  apiOn,
  savingAssignments,
  onNavigateTab,
  onAssignmentsChange,
  onEmailParty,
}: Props) {
  const docPct = docProgress.total > 0 ? Math.round((docProgress.done / docProgress.total) * 100) : 0;
  const isListing = !isBuyerTransaction(project.type);
  const nextDueBucket = nextDeadline ? dueDateBucket(nextDeadline.date) : "none";

  const propertyRows = getPropertyDetailRows(metadata, project);
  const transactionRows = getTransactionDetailRows(metadata);
  const listingRows = getListingDetailRows(metadata);
  const timelineRows = getTransactionTimelineRows(metadata, project.deadlines ?? []);

  const escrowStageRows = [
    { label: "Escrow officer", value: resolveProjectEscrowOfficer(project) || "—" },
    { label: "Escrow company", value: project.escrowCompany || "—" },
    { label: "Stage", value: project.stage },
    { label: "Transaction type", value: transactionTypeLabel(project.type) },
    { label: "Created", value: project.createdAt || "—" },
    { label: "Files stored", value: String(filesCount) },
  ];

  const matchBadgeVariant =
    effectiveSellerMatch === "Yes" ? "default" : effectiveSellerMatch === "No" ? "destructive" : "secondary";

  const showDetails =
    propertyRows.length > 0 ||
    transactionRows.length > 0 ||
    listingRows.length > 0 ||
    escrowStageRows.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Documents complete"
          value={`${docProgress.done}/${docProgress.total}`}
          progress={docPct}
          icon={FileText}
          onClick={() => onNavigateTab("documents")}
        />
        <StatTile
          label="Next step"
          value={project.nextStepDate?.trim() || "No date"}
          sub={project.nextStep?.trim() || "No next step set"}
          icon={CheckSquare}
          onClick={() => onNavigateTab("notes")}
        />
        <StatTile
          label="Deadlines"
          value={String(deadlinesCount)}
          sub={nextDeadline ? `${nextDeadline.title} · ${nextDeadline.date}` : "No upcoming"}
          icon={Calendar}
          onClick={() => onNavigateTab("calendar")}
        />
        <StatTile
          label="DocuSign"
          value={`${sigCounts.signed} signed`}
          sub={`${sigCounts.out} out · ${sigCounts.awaiting} awaiting`}
          icon={Paperclip}
          onClick={() => onNavigateTab("documents")}
        />
      </div>

      {showDetails && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <CollapsibleSectionCard
            title="Property details"
            defaultOpen
            action={`${propertyRows.length + escrowStageRows.length} fields`}
          >
            <DetailRows rows={propertyRows} />
            <div className="mt-2 border-t border-border pt-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Escrow & stage
              </p>
              <DetailRows
                rows={escrowStageRows.map((r) => ({ label: r.label, value: r.value }))}
                columns={2}
              />
            </div>
            <Link
              to={`/clients/${project.clientId}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              View contact profile <ChevronRight className="h-3 w-3" />
            </Link>
          </CollapsibleSectionCard>

          <CollapsibleSectionCard
            title="Transaction details"
            defaultOpen
            action={`${transactionRows.length + (isListing && listingRows.length > 0 ? listingRows.length : 0)} fields`}
          >
            <DetailRows rows={transactionRows} />
            {isListing ? (
              <DetailRow
                label="Seller name match?"
                value={<Badge variant={matchBadgeVariant}>{effectiveSellerMatch}</Badge>}
                className="text-xs"
              />
            ) : null}
            {isListing && listingRows.length > 0 ? (
              <div className="mt-2 border-t border-border pt-2">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Listing details
                </p>
                <DetailRows rows={listingRows} />
              </div>
            ) : null}
          </CollapsibleSectionCard>
        </div>
      )}

      {timelineRows.length > 0 && (
        <CollapsibleSectionCard
          title="Timeline"
          defaultOpen
          action={`${timelineRows.length} items`}
        >
          <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-3">
            {timelineRows.map((row) => {
              const bucket = row.isTextField ? "none" : dueDateBucket(row.value);
              return (
                <li
                  key={row.title}
                  className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs"
                >
                  <span className="min-w-0 text-muted-foreground">{row.title}</span>
                  <span
                    className={cn(
                      "shrink-0 text-right font-medium tabular-nums",
                      row.isTextField ? "text-foreground" : dueDateClass(bucket),
                    )}
                  >
                    {row.value}
                  </span>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => onNavigateTab("calendar")}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            Open Timeline tab <ChevronRight className="h-3 w-3" />
          </button>
        </CollapsibleSectionCard>
      )}

      <TransactionPartiesSection partyGroups={partyGroups} onEmailParty={onEmailParty} />

      <SectionCard title="Team assignments" className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            {(project.assignees ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(project.assignees ?? []).map((a) => (
                  <span key={a.userId} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground">
                    {a.name}
                    {a.designation ? ` · ${a.designation}` : ""}
                  </span>
                ))}
              </div>
            )}
            {canAssignMembers && apiOn ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">Select assignees</p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {assignmentOptions.map((member) => {
                    const checked = (project.assignees ?? []).some((a) => a.userId === member.id);
                    return (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={savingAssignments}
                          onChange={(e) => {
                            const current = project.assignees ?? [];
                            const nextIds = e.target.checked
                              ? [...current.map((a) => a.userId), member.id]
                              : current.map((a) => a.userId).filter((uid) => uid !== member.id);
                            onAssignmentsChange([...new Set(nextIds)]);
                          }}
                        />
                        <span className="min-w-0 truncate">{member.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          {nextDeadline ? (
            <p className={cn("shrink-0 text-xs lg:text-right", dueDateClass(nextDueBucket))}>
              Next deadline: <span className="font-medium">{nextDeadline.title}</span> on {nextDeadline.date}
            </p>
          ) : null}
        </div>
      </SectionCard>
    </motion.div>
  );
}
