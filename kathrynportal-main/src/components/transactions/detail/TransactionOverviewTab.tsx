import { Link } from "react-router-dom";
import { Calendar, CheckSquare, ChevronRight, FileText, Paperclip } from "lucide-react";
import { motion } from "framer-motion";
import type { Project } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { dueDateBucket, dueDateClass, isBuyerTransaction, transactionTypeLabel } from "@/lib/transactionListUtils";
import type { PartyGroup } from "@/lib/transactionMetadataParties";
import DetailRow from "./DetailRow";
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
      className="group flex flex-col rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/20"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="font-display text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {sub ? <p className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</p> : null}
      {progress !== undefined ? <Progress value={progress} className="mt-3 h-1.5" /> : null}
    </button>
  );
}

type Props = {
  project: Project;
  docProgress: { done: number; total: number };
  sigCounts: SigCounts;
  tasksComplete: number;
  tasksTotal: number;
  deadlinesCount: number;
  filesCount: number;
  nextDeadline: { title: string; date: string } | null;
  partyGroups: PartyGroup[];
  effectiveSellerMatch: string;
  rpaSeller: string;
  prelimSeller: string;
  sellerMismatchNotes: string;
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
  docProgress,
  sigCounts,
  tasksComplete,
  tasksTotal,
  deadlinesCount,
  filesCount,
  nextDeadline,
  partyGroups,
  effectiveSellerMatch,
  rpaSeller,
  prelimSeller,
  sellerMismatchNotes,
  assignmentOptions,
  canAssignMembers,
  apiOn,
  savingAssignments,
  onNavigateTab,
  onAssignmentsChange,
  onEmailParty,
}: Props) {
  const docPct = docProgress.total > 0 ? Math.round((docProgress.done / docProgress.total) * 100) : 0;
  const taskPct = tasksTotal > 0 ? Math.round((tasksComplete / tasksTotal) * 100) : 0;
  const isListing = !isBuyerTransaction(project.type);
  const nextDueBucket = nextDeadline ? dueDateBucket(nextDeadline.date) : "none";

  const matchBadgeVariant =
    effectiveSellerMatch === "Yes" ? "default" : effectiveSellerMatch === "No" ? "destructive" : "secondary";

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Documents complete"
          value={`${docProgress.done}/${docProgress.total}`}
          progress={docPct}
          icon={FileText}
          onClick={() => onNavigateTab("documents")}
        />
        <StatTile
          label="Tasks complete"
          value={`${tasksComplete}/${tasksTotal}`}
          progress={taskPct}
          icon={CheckSquare}
          onClick={() => onNavigateTab("tasks")}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Property & transaction">
          <div className="space-y-3">
            <DetailRow label="Address" value={project.propertyAddress} />
            <DetailRow label="Type" value={project.propertyType || "—"} />
            <DetailRow label="Year built" value={project.yearBuilt || "—"} />
            <DetailRow label="Representation" value={project.representationSide || "—"} />
            <DetailRow label="List price" value={project.listPrice || "—"} />
            <DetailRow label="Transaction type" value={transactionTypeLabel(project.type)} />
          </div>
        </SectionCard>

        <SectionCard title="Escrow & stage">
          <div className="space-y-3">
            <DetailRow label="Escrow officer" value={project.escrowOfficer || "—"} />
            <DetailRow label="Escrow company" value={project.escrowCompany || "—"} />
            <DetailRow label="Stage" value={project.stage} />
            <DetailRow label="Created" value={project.createdAt || "—"} />
            <DetailRow label="Files stored" value={String(filesCount)} />
          </div>
          <Link
            to={`/clients/${project.clientId}`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            View contact profile <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </SectionCard>
      </div>

      <TransactionPartiesSection partyGroups={partyGroups} onEmailParty={onEmailParty} />

      {isListing ? (
        <SectionCard title="Seller identity check">
          <div className="space-y-3">
            <DetailRow label="RPA seller" value={rpaSeller || "Not provided"} />
            <DetailRow label="Prelim seller" value={prelimSeller || "Not provided"} />
            <DetailRow
              label="Seller name match?"
              value={<Badge variant={matchBadgeVariant}>{effectiveSellerMatch}</Badge>}
            />
          </div>
          {effectiveSellerMatch === "No" ? (
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Mismatch notes</p>
              <p className="mt-1 text-sm text-foreground">{sellerMismatchNotes || "No notes added."}</p>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard title="Team assignments">
        {(project.assignees ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No team members assigned.</p>
        ) : (
          <div className="mb-4 flex flex-wrap gap-2">
            {(project.assignees ?? []).map((a) => (
              <span key={a.userId} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground">
                {a.name}
                {a.designation ? ` · ${a.designation}` : ""}
              </span>
            ))}
          </div>
        )}
        {canAssignMembers && apiOn ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Select assignees for this transaction</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {assignmentOptions.map((member) => {
                const checked = (project.assignees ?? []).some((a) => a.userId === member.id);
                return (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm"
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
        {nextDeadline ? (
          <p className={cn("mt-4 border-t border-border pt-3 text-xs", dueDateClass(nextDueBucket))}>
            Next deadline: <span className="font-medium">{nextDeadline.title}</span> on {nextDeadline.date}
          </p>
        ) : null}
      </SectionCard>
    </motion.div>
  );
}
