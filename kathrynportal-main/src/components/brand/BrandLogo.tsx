import { cn } from "@/lib/utils";

export const BRAND_LOGO_SRC = "/brand/transactpro-logo.png";

type BrandLogoProps = {
  /** Compact mark for collapsed sidebar */
  variant?: "full" | "mark";
  className?: string;
};

export default function BrandLogo({ variant = "full", className }: BrandLogoProps) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt="TransactPro — estate document management CRM"
      className={cn(
        "object-contain object-left",
        variant === "mark" ? "h-9 w-9 object-center" : "h-auto w-full max-h-14 max-w-[220px]",
        className,
      )}
      decoding="async"
    />
  );
}
