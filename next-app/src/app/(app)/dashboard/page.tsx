"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, Wallet, TrendingUp, Wrench, FileText, PackageX, Users, ArrowRight, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { currency, formatDate, jobStatusLabel } from "@/lib/format";
import { Card, Badge, Skeleton, EmptyState, ErrorState } from "@/components/ui";
import { cn } from "@/lib/cn";

const PERIODS = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "This Week" },
  { id: "monthly", label: "This Month" },
  { id: "yearly", label: "This Year" },
] as const;

export default function DashboardPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("daily");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<any>("/api/dashboard"),
  });

  const { data: report, isLoading: loadingReport, isError: reportIsError, error: reportError, refetch: refetchReport } = useQuery({
    queryKey: ["report", period],
    queryFn: () => api<any>(`/api/reports/${period}`),
  });

  const { data: outstandingCustomers, isLoading: loadingOutstanding } = useQuery({
    queryKey: ["report", "outstanding"],
    queryFn: () => api<any[]>("/api/reports/outstanding"),
  });

  const metrics = [
    {
      label: "Billed",
      value: currency(report?.billed),
      icon: IndianRupee,
      color: "bg-[#5865f2]/15 text-[#5865f2] border border-[#5865f2]/30",
    },
    {
      label: "Collected",
      value: currency(report?.collected),
      icon: Wallet,
      color: "bg-[#16a34a]/10 text-[#15803d] border border-[#16a34a]/25",
    },
    {
      label: "Outstanding",
      value: currency(report?.outstanding),
      icon: TrendingUp,
      color: "bg-[#f59e0b]/10 text-[#b45309] border border-[#f59e0b]/30",
    },
    {
      label: "Jobs Completed",
      value: String(report?.jobsCompleted ?? 0),
      icon: Wrench,
      color: "bg-[#5865f2]/15 text-[#5865f2] border border-[#5865f2]/30",
    },
    {
      label: "Invoices Issued",
      value: String(report?.invoicesCount ?? 0),
      icon: FileText,
      color: "bg-[#5865f2]/15 text-[#5865f2] border border-[#5865f2]/30",
    },
    {
      label: "Parts Consumed",
      value: String(report?.partsConsumed ?? 0),
      icon: PackageX,
      color: "bg-[#dc2626]/10 text-[#b91c1c] border border-[#dc2626]/25",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-12 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">Workshop Overview</h1>
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#e2e8f0]/50 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0f172a] flex items-center gap-2">
            Workshop Overview <Activity size={20} className="text-[#5865f2] animate-pulse" />
          </h1>
          <p className="text-xs font-semibold text-[#64748b]" suppressHydrationWarning>
            {formatDate(new Date())}
          </p>
        </div>
        {/* <div className="flex items-center gap-2">
          <Badge color="green" dot>System Ready</Badge>
        </div> */}
      </div>

      {/* Period selector */}
      <div className="relative flex rounded-2xl bg-white p-1 border border-[#e2e8f0]/80 shadow-sm overflow-hidden select-none">
        <div
          className="absolute top-1 bottom-1 w-[calc(25%-2px)] rounded-xl bg-[#5865f2] shadow-md shadow-[#5865f2]/25 transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(${PERIODS.findIndex((p) => p.id === period) * 100}%)`,
          }}
        />
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center py-2.5 text-xs font-extrabold tracking-wider uppercase transition-colors duration-200 cursor-pointer select-none",
              period === p.id ? "text-white" : "text-[#64748b] hover:text-[#0f172a]"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Report metrics */}
      {loadingReport ? (
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : reportIsError ? (
        <ErrorState message={(reportError as Error)?.message} onRetry={() => refetchReport()} />
      ) : (
        <div key={period} className="grid grid-cols-2 gap-3.5 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
          {metrics.map((m) => (
            <Card key={m.label} className="group p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#5865f2]/50 shadow-sm">
              <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110", m.color)}>
                <m.icon size={20} />
              </div>
              <p className="text-xl font-black text-[#0f172a]">{m.value}</p>
              <p className="text-xs font-semibold text-[#64748b] mt-0.5">{m.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Main Grid Section */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Active Jobs */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#94a3b8]">Active Jobs</h2>
            <Link href="/jobs" className="flex items-center gap-1 text-xs font-bold text-[#5865f2] hover:text-[#4752c4] transition-colors">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {!data?.activeJobs?.length ? (
            <EmptyState
              title="No active jobs"
              description="Create a new job to get started."
              icon={<Wrench size={32} className="text-[#94a3b8]" />}
            />
          ) : (
            <div className="space-y-2">
              {data.activeJobs.map((job: any) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <Card className="flex items-center justify-between p-3.5 transition-all duration-150 hover:bg-[#f1f5f9]/80 hover:border-[#5865f2]/40">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5865f2]/20 text-[#5865f2] border border-[#5865f2]/30">
                        <Wrench size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0f172a]">{job.customerName}</p>
                        <p className="text-xs text-[#64748b]">
                          {job.jobNumber} · {job.complaint || "No complaint noted"}
                        </p>
                      </div>
                    </div>
                    <Badge color="blue" dot>{jobStatusLabel(job.status)}</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Low Shop Stock */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#94a3b8]">Low Shop Stock</h2>
            <Link href="/inventory" className="flex items-center gap-1 text-xs font-bold text-[#5865f2] hover:text-[#4752c4] transition-colors">
              Inventory <ArrowRight size={13} />
            </Link>
          </div>
          {!data?.lowStock?.length ? (
            <EmptyState
              title="No low-stock parts"
              description="Everything is above minimum stock."
            />
          ) : (
            <div className="space-y-2">
              {data.lowStock.slice(0, 6).map((p: any) => (
                <Link key={p.id} href={`/inventory/parts/${p.id}`}>
                  <Card className="flex items-center justify-between p-3.5 transition-all duration-150 hover:bg-[#f1f5f9]/80 hover:border-[#dc2626]/25">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dc2626]/10 text-[#b91c1c] border border-[#dc2626]/25">
                        <PackageX size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0f172a]">{p.name}</p>
                        <p className="text-xs text-[#64748b]">Shop: {p.shopStock} · Warehouse: {p.warehouseStock}</p>
                      </div>
                    </div>
                    <Badge color="red" dot>LOW STOCK</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Outstanding Customer Balances */}
      <section className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#94a3b8]">
            <Users size={16} className="text-[#5865f2]" /> Outstanding Balances
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">Customers with pending unpaid balances</p>
        </div>
        {loadingOutstanding ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : !outstandingCustomers?.length ? (
          <EmptyState
            title="No outstanding balances"
            description="Everyone is paid up! Great job."
            icon={<Users size={36} className="text-[#15803d]" />}
          />
        ) : (
          <div className="space-y-2.5">
            {outstandingCustomers.map((c) => (
              <Link key={c.customerId} href={`/customers/${c.customerId}`}>
                <Card className="flex items-center justify-between p-4 transition-all duration-150 hover:bg-[#f1f5f9]/90 hover:border-[#5865f2]/50 hover:-translate-y-0.5">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f59e0b]/10 text-[#b45309] border border-[#f59e0b]/30 font-bold">
                      {c.customerName ? c.customerName[0].toUpperCase() : <Users size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0f172a]">{c.customerName}</p>
                      <p className="text-xs text-[#64748b] mt-0.5">{c.customerPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-black text-[#b45309]">{currency(c.dueAmount)}</p>
                    <Badge color="amber" dot>DUE</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Invoices */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#94a3b8]">Recent Invoices</h2>
          <Link href="/jobs" className="flex items-center gap-1 text-xs font-bold text-[#5865f2] hover:text-[#4752c4] transition-colors">
            View jobs <ArrowRight size={13} />
          </Link>
        </div>
        {!data?.recentInvoices?.length ? (
          <EmptyState
            title="No invoices yet"
            description="Invoices are created when you complete a job."
          />
        ) : (
          <div className="space-y-2">
            {data.recentInvoices.map((inv: any) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`}>
                <Card className="flex items-center justify-between p-3.5 transition-all duration-150 hover:bg-[#f1f5f9]/80 hover:border-[#5865f2]/40">
                  <div>
                    <p className="text-sm font-bold text-[#0f172a]">{inv.customerName}</p>
                    <p className="text-xs text-[#64748b]">{inv.invoiceNumber} · {formatDate(inv.createdAt)}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <p className="text-sm font-extrabold text-[#0f172a]">{currency(inv.total)}</p>
                    <Badge color={inv.status === "PAID" ? "green" : inv.status === "PARTIALLY_PAID" ? "amber" : "slate"} dot>
                      {inv.status.replace("_", " ")}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}