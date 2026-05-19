import { Mail, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { PartyGroup } from "@/lib/transactionMetadataParties";
import SectionCard from "./SectionCard";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

type Props = {
  partyGroups: PartyGroup[];
  onEmailParty: (email: string, name: string) => void;
};

export default function TransactionPartiesSection({ partyGroups, onEmailParty }: Props) {
  if (partyGroups.length === 0) return null;

  const totalWithEmail = partyGroups.reduce(
    (n, g) => n + g.rows.filter((r) => r.email?.trim()).length,
    0,
  );

  return (
    <SectionCard
      title="Parties"
      action={
        <span className="text-xs text-muted-foreground">
          {totalWithEmail} with email
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {partyGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {group.title}
            </p>
            <ul className="space-y-2">
              {group.rows.map((row, i) => (
                <li
                  key={`${group.title}-${row.email ?? row.name}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-sm transition-colors hover:border-primary/25"
                >
                  <Avatar className="h-10 w-10 shrink-0 border border-border">
                    <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                      {initialsFromName(row.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.role}</p>
                    {row.email ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.email}</p>
                    ) : (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">No email on file</p>
                    )}
                  </div>
                  {row.email ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 gap-1.5"
                      onClick={() => onEmailParty(row.email!, row.name)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Email</span>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
