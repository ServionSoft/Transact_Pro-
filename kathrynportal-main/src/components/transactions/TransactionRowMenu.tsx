import { Link } from "react-router-dom";
import { FileText, FolderOpen, Mail, MoreHorizontal, Pencil } from "lucide-react";
import type { ProjectListItem } from "@/api/projects";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { projectDetailState } from "@/lib/projectDetailNavigation";

type Props = {
  project: ProjectListItem;
  clientEmail?: string;
  /** Next Steps hub — show edit next step before other actions. */
  showEditNextStep?: boolean;
};

export default function TransactionRowMenu({ project, clientEmail, showEditNextStep }: Props) {
  const emailState = projectDetailState(
    "emails",
    clientEmail?.trim() ? { composeEmail: clientEmail.trim() } : undefined,
  );

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
        {showEditNextStep ? (
          <DropdownMenuItem asChild>
            <Link
              to={`/projects/${project.id}`}
              state={projectDetailState("overview")}
              className="flex cursor-pointer items-center gap-2"
            >
              <Pencil className="h-4 w-4" /> Edit next step
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link to={`/projects/${project.id}`} className="flex cursor-pointer items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Open file
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to={`/projects/${project.id}`}
            state={projectDetailState("documents")}
            className="flex cursor-pointer items-center gap-2"
          >
            <FileText className="h-4 w-4" /> Documents
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to={`/projects/${project.id}`}
            state={emailState}
            className="flex cursor-pointer items-center gap-2"
          >
            <Mail className="h-4 w-4" /> Email contact
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function propertyStreet(address: string): string {
  return address.split(",")[0]?.trim() || address;
}
