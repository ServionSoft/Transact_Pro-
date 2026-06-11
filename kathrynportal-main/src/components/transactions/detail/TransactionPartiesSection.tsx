import { Mail, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PartyGroup, PartyRow } from "@/lib/transactionMetadataParties";
import CollapsibleSectionCard from "./CollapsibleSectionCard";

const LEFT_PARTY_ORDER = ["Sellers", "Buyers", "Lender"] as const;
const RIGHT_PARTY_ORDER = ["Escrow & team", "Buyer's agents", "Listing agents"] as const;
const LEFT_PARTY_TITLES = new Set<string>(LEFT_PARTY_ORDER);
const RIGHT_PARTY_TITLES = new Set<string>(RIGHT_PARTY_ORDER);

function sortGroups(groups: PartyGroup[], order: readonly string[]): PartyGroup[] {
  const rank = new Map(order.map((title, i) => [title, i]));
  return [...groups].sort((a, b) => (rank.get(a.title) ?? 99) - (rank.get(b.title) ?? 99));
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

function displayName(row: PartyRow): string {
  if (row.preferredName?.trim() && row.preferredName !== row.name) return row.preferredName;
  return row.name;
}

function legalNameSubtitle(row: PartyRow): string | null {
  if (row.preferredName?.trim() && row.preferredName !== row.name) return row.name;
  return null;
}

function PartyRowCard({
  row,
  groupTitle,
  index,
  onEmailParty,
}: {
  row: PartyRow;
  groupTitle: string;
  index: number;
  onEmailParty: (email: string, name: string) => void;
}) {
  const primary = displayName(row);
  const legal = legalNameSubtitle(row);

  return (
    <li
      key={`${groupTitle}-${row.email ?? row.name}-${index}`}
      className="flex items-center gap-2 rounded-md border border-border/70 bg-card px-2.5 py-2 transition-colors hover:border-primary/25"
    >
      <Avatar className="h-8 w-8 shrink-0 border border-border">
        <AvatarFallback className="bg-muted text-[10px] font-semibold text-foreground">
          {initialsFromName(primary)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{primary}</p>
        {legal ? <p className="truncate text-[11px] text-muted-foreground">Legal: {legal}</p> : null}
        <p className="truncate text-[11px] text-muted-foreground">{row.role}</p>
        {row.email ? (
          <p className="truncate text-[11px] text-muted-foreground">{row.email}</p>
        ) : (
          <p className="text-[11px] italic text-muted-foreground">No email</p>
        )}
      </div>
      {row.email ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 gap-1.5 px-2.5"
          onClick={() => onEmailParty(row.email!, primary)}
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </Button>
      ) : null}
    </li>
  );
}

function PartyColumn({
  groups,
  onEmailParty,
}: {
  groups: PartyGroup[];
  onEmailParty: (email: string, name: string) => void;
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No parties in this column.</p>;
  }

  return (
    <Accordion type="multiple" className="w-full">
      {groups.map((group) => (
        <AccordionItem key={group.title} value={group.title} className="border-border/70">
          <AccordionTrigger className="py-2 text-sm hover:no-underline">
            <span className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">{group.title}</span>
              <span className="text-xs font-normal text-muted-foreground">({group.rows.length})</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-2 pt-0">
            <ul className="space-y-1.5">
              {group.rows.map((row, i) => (
                <PartyRowCard
                  key={`${group.title}-${row.email ?? row.name}-${i}`}
                  row={row}
                  groupTitle={group.title}
                  index={i}
                  onEmailParty={onEmailParty}
                />
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

type Props = {
  partyGroups: PartyGroup[];
  onEmailParty: (email: string, name: string) => void;
};

export default function TransactionPartiesSection({ partyGroups, onEmailParty }: Props) {
  if (partyGroups.length === 0) return null;

  const leftGroups = sortGroups(
    partyGroups.filter((g) => LEFT_PARTY_TITLES.has(g.title)),
    LEFT_PARTY_ORDER,
  );
  const rightGroups = sortGroups(
    partyGroups.filter((g) => RIGHT_PARTY_TITLES.has(g.title)),
    RIGHT_PARTY_ORDER,
  );
  const otherGroups = partyGroups.filter(
    (g) => !LEFT_PARTY_TITLES.has(g.title) && !RIGHT_PARTY_TITLES.has(g.title),
  );

  const totalWithEmail = partyGroups.reduce(
    (n, g) => n + g.rows.filter((r) => r.email?.trim()).length,
    0,
  );

  const totalParties = partyGroups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <CollapsibleSectionCard
      title="Parties"
      defaultOpen
      action={`${totalParties} contacts · ${totalWithEmail} with email`}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PartyColumn groups={[...leftGroups, ...otherGroups]} onEmailParty={onEmailParty} />
        <PartyColumn groups={rightGroups} onEmailParty={onEmailParty} />
      </div>
    </CollapsibleSectionCard>
  );
}
