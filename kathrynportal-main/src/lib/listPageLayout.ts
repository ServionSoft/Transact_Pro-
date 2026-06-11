/** Below lg: page scroll. At lg+: toolbar + list scroll inside a fixed shell. */
export const listPageRootClass =
  "page-padding mx-auto flex w-full max-w-7xl flex-col gap-4 pb-8 sm:gap-6 lg:min-h-0 lg:flex-1 lg:overflow-hidden";

export const listPageShellClass =
  "rounded-xl border border-border bg-card shadow-sm lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden";

export const listPagePanelClass = "flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden";

export const listPageBodyClass = "lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain";

/** Transaction detail — page scroll below lg; tab shell with bounded panels at lg+. */
export const transactionDetailRootClass =
  "page-padding mx-auto flex w-full max-w-7xl flex-col gap-3 pb-8 lg:min-h-0 lg:flex-1 lg:overflow-hidden";

export const transactionDetailTabShellClass =
  "flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden";

export const transactionTabCardClass =
  "rounded-xl border border-border bg-card shadow-sm lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden";

/** Embedded documents workspace inside a transaction tab. */
export const embeddedTabShellClass = "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col";
export const embeddedTabFillClass = "lg:min-h-0 lg:flex-1";
export const embeddedTabOverflowHiddenClass = "lg:overflow-hidden";
export const embeddedTabScrollClass =
  "lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain";

/** Tab panel body: page scroll on mobile; inner scroll + overscroll contain at lg+ only. */
export const embeddedTabBodyClass =
  "overflow-x-hidden lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain";
export const embeddedTabScrollXYClass =
  "lg:min-h-0 lg:flex-1 lg:overflow-x-auto lg:overflow-y-auto lg:overscroll-contain";
