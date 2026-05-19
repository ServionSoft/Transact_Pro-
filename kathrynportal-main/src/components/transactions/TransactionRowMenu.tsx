import { Link } from "react-router-dom";
import { FolderOpen, Mail, MoreHorizontal } from "lucide-react";
import type { ProjectListItem } from "@/api/projects";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  project: ProjectListItem;
  clientEmail?: string;
};

export default function TransactionRowMenu({ project, clientEmail }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          aria-label={`Actions for ${propertyStreet(project.propertyAddress)}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to={`/projects/${project.id}`} className="flex cursor-pointer items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Open file
          </Link>
        </DropdownMenuItem>
        {clientEmail ? (
          <DropdownMenuItem asChild>
            <Link
              to={`/email?to=${encodeURIComponent(clientEmail)}`}
              className="flex cursor-pointer items-center gap-2"
            >
              <Mail className="h-4 w-4" /> Email contact
            </Link>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function propertyStreet(address: string): string {
  return address.split(",")[0]?.trim() || address;
}
