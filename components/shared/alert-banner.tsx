import { cn } from "@/lib/utils";

interface AlertBannerProps {
  variant?: "info" | "error";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const variantClasses = {
  info: "bg-muted",
  error: "border-destructive/50 bg-destructive/10 text-destructive",
};

export default function AlertBanner({
  variant = "info",
  icon,
  title,
  children,
}: AlertBannerProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-sm",
        variantClasses[variant],
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
