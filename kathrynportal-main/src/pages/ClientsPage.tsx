import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Pencil,
  FolderOpen,
  Archive,
  RotateCcw,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { archiveClientApi, listClientsFromApi, unarchiveClientApi } from "@/api/clients";
import { listProjectsFromApi, type ProjectListItem } from "@/api/projects";
import LinkedTransactionsCell from "@/components/clients/LinkedTransactionsCell";
import { useAppStore } from "@/store/appStore";
import { isTransactionProject } from "@/data/mockData";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { listPageBodyClass, listPageRootClass, listPageShellClass } from "@/lib/listPageLayout";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";
import type { Client } from "@/data/mockData";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

const STATUS_TABS = ["All", "Active", "Inactive", "Prospect"] as const;

const LINKED_TRANSACTIONS_TOOLTIP =
  "Property address of each active listing or buyer file for this contact. Click to open the deal.";

function LinkedTransactionsTableHeader() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help border-b border-dotted border-muted-foreground/60">Linked transactions</span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="end"
        collisionPadding={16}
        className="max-w-[min(20rem,calc(100vw-2rem))] whitespace-normal text-left leading-snug"
      >
        {LINKED_TRANSACTIONS_TOOLTIP}
      </TooltipContent>
    </Tooltip>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24 rounded-md" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell className="w-12">
            <Skeleton className="h-8 w-8 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(getApiBaseUrl()));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [apiProjects, setApiProjects] = useState<ProjectListItem[]>([]);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clients = useAppStore((s) => s.clients);
  const storeProjects = useAppStore((s) => s.projects);
  const setClients = useAppStore((s) => s.setClients);
  const { confirm, ConfirmDialogHost } = useConfirmDialog();

  const refresh = useCallback(async () => {
    if (!getApiBaseUrl()) return;
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listClientsFromApi({ archived: showArchived });
      setClients(rows);
      const canViewProjects = hasPermission(user, "projects.view");
      if (canViewProjects) {
        try {
          setApiProjects(await listProjectsFromApi());
        } catch {
          setApiProjects([]);
        }
      } else {
        setApiProjects([]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load contacts.";
      setLoadError(msg);
      toast.error("Could not load contacts", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [setClients, showArchived, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const apiOn = Boolean(getApiBaseUrl());
  const canCreate = !apiOn || hasPermission(user, "clients.create");
  const canArchive = !apiOn || hasPermission(user, "clients.archive");
  const canEdit = !apiOn || hasPermission(user, "clients.edit");
  const canViewProjects = !apiOn || hasPermission(user, "projects.view");

  const transactionsByClientId = useMemo(() => {
    const map = new Map<string, { id: string; propertyAddress: string; name: string }[]>();
    const rows: Array<{ id: string; clientId: string; propertyAddress: string; name: string }> = apiOn
      ? apiProjects.map((p) => ({
          id: p.id,
          clientId: p.clientId,
          propertyAddress: p.propertyAddress,
          name: p.name,
        }))
      : storeProjects
          .filter(isTransactionProject)
          .map((p) => ({
            id: p.id,
            clientId: p.clientId,
            propertyAddress: p.propertyAddress,
            name: p.name,
          }));
    for (const p of rows) {
      const list = map.get(p.clientId) ?? [];
      list.push({ id: p.id, propertyAddress: p.propertyAddress, name: p.name });
      map.set(p.clientId, list);
    }
    return map;
  }, [apiOn, apiProjects, storeProjects]);

  const linkedTransactionsFor = (clientId: string) => transactionsByClientId.get(clientId) ?? [];

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const pref = (c.preferredName ?? "").toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      pref.includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.propertyAddress.toLowerCase().includes(q);
    const matchStatus = showArchived || filterStatus === "All" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleArchive = async (client: Client) => {
    if (!apiOn || !canArchive) {
      toast.error("You do not have permission to archive contacts.");
      return;
    }
    const linkCount = Math.max(linkedTransactionsFor(client.id).length, client.projectCount ?? 0);
    if (linkCount > 0) {
      toast.error(
        "This contact is linked to active transactions. Reassign the primary contact or archive those transactions first."
      );
      return;
    }
    if (
      !(await confirm({
        title: "Archive contact",
        description: `Archive ${client.name}? They will be hidden from the active contact list.`,
        confirmLabel: "Archive",
      }))
    ) {
      return;
    }
    setRowBusyId(client.id);
    try {
      await archiveClientApi(client.id);
      toast.success("Contact archived.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not archive contact.");
    } finally {
      setRowBusyId(null);
    }
  };

  const handleRestore = async (client: Client) => {
    if (!canArchive) {
      toast.error("You do not have permission to restore contacts.");
      return;
    }
    setRowBusyId(client.id);
    try {
      await unarchiveClientApi(client.id);
      toast.success("Contact restored.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not restore client.");
    } finally {
      setRowBusyId(null);
    }
  };

  const renderRowActions = (client: Client) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          disabled={rowBusyId === client.id}
          aria-label={`Actions for ${client.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to={`/clients/${client.id}`} className="flex cursor-pointer items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Open
          </Link>
        </DropdownMenuItem>
        {canEdit && !showArchived ? (
          <DropdownMenuItem asChild>
            <Link to={`/clients/${client.id}/edit`} className="flex cursor-pointer items-center gap-2">
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link to={`/email?to=${encodeURIComponent(client.email)}`} className="flex cursor-pointer items-center gap-2">
            <Mail className="h-4 w-4" /> Email
          </Link>
        </DropdownMenuItem>
        {showArchived ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2"
              disabled={!canArchive}
              onClick={() => void handleRestore(client)}
            >
              <RotateCcw className="h-4 w-4" /> Restore
            </DropdownMenuItem>
          </>
        ) : apiOn && canArchive ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              disabled={Math.max(linkedTransactionsFor(client.id).length, client.projectCount ?? 0) > 0}
              onClick={() => void handleArchive(client)}
            >
              <Archive className="h-4 w-4" /> Archive
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const contactCard = (client: Client) => (
    <div
      key={client.id}
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 gap-3">
          <Avatar className="h-10 w-10 shrink-0 border border-border">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initialsFromName(client.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link to={`/clients/${client.id}`} className="font-medium text-foreground hover:text-primary">
              {client.name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{client.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={client.status} type="client" />
              <Badge variant="secondary" className="max-w-[200px] truncate font-normal">
                {client.role}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{client.company || "—"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{client.phone || "—"}</p>
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Linked transactions</p>
              {canViewProjects ? (
                <LinkedTransactionsCell transactions={linkedTransactionsFor(client.id)} />
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>
        {renderRowActions(client)}
      </div>
    </div>
  );

  return (
    <div className={listPageRootClass}>
      <div className="shrink-0">
        <PageHeader
          title="Contacts"
          subtitle={loading ? "Loading…" : `${clients.length} ${showArchived ? "archived" : "total"} contacts`}
          actions={
            canCreate ? (
              <Button onClick={() => navigate("/clients/new")} className="gap-2" disabled={showArchived}>
                <Plus className="h-4 w-4" /> Add contact
              </Button>
            ) : undefined
          }
        />
      </div>

      <div className={listPageShellClass}>
        <div className="shrink-0 border-b border-border">
          <div className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, company…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  aria-label="Search contacts"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                <div className="flex items-center gap-2">
                  <Switch
                    id="contacts-archived"
                    checked={showArchived}
                    onCheckedChange={(checked) => {
                      setShowArchived(Boolean(checked));
                      setFilterStatus("All");
                    }}
                  />
                  <Label htmlFor="contacts-archived" className="cursor-pointer text-sm font-normal text-muted-foreground">
                    Show archived
                  </Label>
                </div>
              </div>
            </div>

            {showArchived ? (
              <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                Archived contacts are hidden from active workflows. Use <strong className="text-foreground">Restore</strong> from the
                row menu to move them back.
              </p>
            ) : null}

            {!showArchived ? (
              <div
                className="flex items-center gap-1 overflow-x-auto border-t border-border/60 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Filter by status"
              >
                {STATUS_TABS.map((s) => {
                  const active = filterStatus === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFilterStatus(s)}
                      className={cn(
                        "shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
                        active
                          ? "border-primary font-medium text-foreground"
                          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {!showArchived ? (
              <p className="text-xs text-muted-foreground">
                Linked transactions show property addresses for active deals where this contact is the primary client.
              </p>
            ) : null}
          </div>

          {loadError && (
            <div className="border-t border-destructive/30 bg-destructive/5 px-4 py-4 sm:px-5">
              <p className="text-sm font-medium text-destructive">Could not load contacts from API.</p>
              <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void refresh()}>
                Retry
              </Button>
            </div>
          )}
        </div>

        <div className={listPageBodyClass}>
        {loading ? (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[200px]">Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden xl:table-cell">Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[180px] whitespace-nowrap">
                      <LinkedTransactionsTableHeader />
                    </TableHead>
                    <TableHead className="w-12 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableSkeletonRows />
                </TableBody>
              </Table>
            </div>
            <div className="space-y-3 p-4 md:hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">{showArchived ? "No archived contacts" : "No contacts match"}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {showArchived
                ? "Switch off “Show archived” to return to your active list."
                : "Try adjusting search or status filters, or add a new contact."}
            </p>
            {canCreate && !showArchived ? (
              <Button className="mt-6 gap-2" onClick={() => navigate("/clients/new")}>
                <Plus className="h-4 w-4" /> Add contact
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[200px]">Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden xl:table-cell">Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[180px] whitespace-nowrap">
                      <LinkedTransactionsTableHeader />
                    </TableHead>
                    <TableHead className="w-12 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0 border border-border">
                            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                              {initialsFromName(client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link
                              to={`/clients/${client.id}`}
                              className="block truncate font-medium text-foreground hover:text-primary"
                              title={client.name}
                            >
                              {client.name}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground" title={client.email}>
                              {client.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="line-clamp-2 text-muted-foreground">{client.company || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="max-w-[160px] truncate font-normal xl:max-w-[200px]" title={client.role}>
                          {client.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">{client.phone || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={client.status} type="client" />
                      </TableCell>
                      <TableCell className="align-top">
                        {canViewProjects ? (
                          <LinkedTransactionsCell transactions={linkedTransactionsFor(client.id)} />
                        ) : (
                          <span className="text-sm text-muted-foreground" title="No permission to view transactions">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{renderRowActions(client)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="space-y-3 p-4 md:hidden">{filtered.map((client) => contactCard(client))}</div>
          </>
        )}
        </div>
      </div>
      <ConfirmDialogHost />
    </div>
  );
}
