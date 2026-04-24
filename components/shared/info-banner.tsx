import { cn } from "@/lib/utils";

interface InfoBannerProps {
  variant?: "warning" | "error";
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const variantClasses = {
  warning:
    "text-sm text-amber-700 dark:text-amber-400 border border-amber-500/40 bg-amber-500/10 rounded-md px-3 py-2",
  error:
    "text-sm text-destructive border border-destructive/40 rounded-md px-3 py-2",
};

const InfoBanner = ({
  variant = "warning",
  children,
  action,
  className,
}: InfoBannerProps) => {
  if (action) {
    return (
      <div
        className={cn(
          variantClasses[variant],
          "flex items-center justify-between gap-4",
          className,
        )}
      >
        <span className="flex items-center gap-2">{children}</span>
        {action}
      </div>
    );
  }

  return <p className={cn(variantClasses[variant], className)}>{children}</p>;
};

export default InfoBanner;
