import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
    size?: "sm" | "md" | "lg" | "icon";
  }
>(function Button({ className, variant = "primary", size = "md", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] cursor-pointer select-none shadow-sm",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        size === "icon" && "h-10 w-10 p-0",
        variant === "primary" && "bg-[#5865f2] text-white hover:bg-[#4752c4] hover:shadow-[#5865f2]/30 hover:shadow-md",
        variant === "secondary" && "bg-[#e2e8f0] text-[#0f172a] hover:bg-[#cbd5e1]",
        variant === "outline" && "border border-[#cbd5e1] text-[#334155] bg-white hover:bg-[#f1f5f9] hover:text-[#0f172a]",
        variant === "ghost" && "text-[#64748b] hover:bg-[#eef0f3] hover:text-[#0f172a]",
        variant === "danger" && "bg-[#dc2626] text-white hover:bg-[#b91c1c] hover:shadow-[#dc2626]/30 hover:shadow-md",
        variant === "success" && "bg-[#16a34a] text-white hover:bg-[#15803d] hover:shadow-[#16a34a]/30 hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
});

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#5865f2]/40 focus:border-[#5865f2] transition-all disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            "h-10 w-full appearance-none rounded-xl border border-[#cbd5e1] bg-white pl-3.5 pr-9 text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#5865f2]/40 focus:border-[#5865f2] transition-all disabled:opacity-50 cursor-pointer [&>option]:bg-white [&>option]:text-[#0f172a]",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3 text-[#94a3b8]" size={16} />
      </div>
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#5865f2]/40 focus:border-[#5865f2] transition-all disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-2xl border border-[#e2e8f0] bg-white p-4 text-[#0f172a] shadow-sm transition-all duration-200 hover:border-[#cbd5e1] hover:shadow-md",
      className,
    )}
    {...props}
  />
);

export const Badge = ({
  className,
  children,
  color = "slate",
  dot = false,
}: {
  className?: string;
  children: React.ReactNode;
  color?: "slate" | "blue" | "green" | "amber" | "red" | "gray";
  dot?: boolean;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold tracking-wide transition-all",
      color === "slate" && "bg-[#eef0f3] text-[#475569] border border-[#cbd5e1]/50",
      color === "blue" && "bg-[#5865f2]/10 text-[#4752c4] border border-[#5865f2]/25",
      color === "green" && "bg-[#16a34a]/10 text-[#15803d] border border-[#16a34a]/25",
      color === "amber" && "bg-[#f59e0b]/10 text-[#b45309] border border-[#f59e0b]/30",
      color === "red" && "bg-[#dc2626]/10 text-[#b91c1c] border border-[#dc2626]/25",
      color === "gray" && "bg-[#f1f5f9] text-[#64748b] border border-[#cbd5e1]/30",
      className,
    )}
  >
    {dot && (
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          color === "green" && "bg-[#16a34a]",
          color === "amber" && "bg-[#f59e0b]",
          color === "red" && "bg-[#dc2626]",
          color === "blue" && "bg-[#5865f2]",
          (color === "slate" || color === "gray") && "bg-[#94a3b8]",
        )}
      />
    )}
    {children}
  </span>
);

export const Field = ({
  label,
  children,
  hint,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) => (
  <div className={cn("flex flex-col space-y-1.5", className)}>
    {label && (
      <span className="block text-xs font-bold uppercase tracking-wider text-[#64748b] min-h-[1.25rem] flex items-center">
        {label}
      </span>
    )}
    {children}
    {hint && <span className="block text-xs text-[#64748b]">{hint}</span>}
  </div>
);

export const EmptyState = ({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-6 py-12 text-center">
    {icon && <div className="mb-3 text-[#94a3b8]">{icon}</div>}
    <p className="text-base font-bold text-[#0f172a]">{title}</p>
    {description && <p className="mt-1 text-sm text-[#64748b]">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#fca5a5] bg-red-50 px-6 py-12 text-center">
    <div className="mb-3 text-[#dc2626]">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
    <p className="text-base font-bold text-[#b91c1c]">Something went wrong</p>
    {message && <p className="mt-1 text-sm text-[#b91c1c]/80">{message}</p>}
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-5 font-bold">
        Try again
      </Button>
    )}
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-shimmer rounded-xl bg-[#eef0f3]", className)} />
);

export const Sheet = ({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-2xl text-[#0f172a] transition-all transform animate-in fade-in zoom-in-95 duration-200">
        {title && (
          <div className="mb-4 pb-3 border-b border-[#e2e8f0] flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0f172a]">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[#64748b] hover:bg-[#eef0f3] hover:text-[#0f172a] transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};