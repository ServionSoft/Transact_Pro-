import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/brand/BrandLogo";

type Props = {
  onOpenNav: () => void;
};

export default function AppMobileHeader({ onOpenNav }: Props) {
  return (
    <header className="safe-top flex shrink-0 items-center gap-3 border-b border-border bg-background px-3 pb-2.5 lg:hidden">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={onOpenNav}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <BrandLogo className="max-h-8" />
    </header>
  );
}
