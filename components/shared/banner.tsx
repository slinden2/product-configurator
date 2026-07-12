import { cn } from "@/lib/utils";

interface BannerProps {
  variant?: "info" | "warning" | "error";
  icon?: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const variantClasses = {
  info: "bg-muted",
  warning:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  error: "border-destructive/50 bg-destructive/10 text-destructive",
};

/**
 * Colored message box with border — the single banner component (merged
 * AlertBanner/InfoBanner). `title` renders a bold heading line with the icon
 * beside it and roomier padding; `action` renders a right-aligned control.
 */
const Banner = ({
  variant = "info",
  icon,
  title,
  action,
  className,
  children,
}: BannerProps) => {
  if (title) {
    return (
      <div
        className={cn(
          "flex gap-3 rounded-lg border p-4 text-sm",
          variantClasses[variant],
          className,
        )}
      >
        {icon}
        <div>
          <p className="font-semibold">{title}</p>
          <p>{children}</p>
        </div>
      </div>
    );
  }

  if (action) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm",
          variantClasses[variant],
          className,
        )}
      >
        <span className="flex items-center gap-2">
          {icon}
          {children}
        </span>
        {action}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
        variantClasses[variant],
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
};

export default Banner;
