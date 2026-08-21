"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Wrench, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { currency, formatDate, jobStatusLabel, vehicleTypeLabel, invoiceStatusLabel } from "@/lib/format";
import { Card, Badge, Input, Button, EmptyState, Skeleton, ErrorState } from "@/components/ui";
import { cn } from "@/lib/cn";

const FILTERS = ["ALL", "OPEN", "COMPLETED", "CANCELLED"];

export default function JobsPage() {
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const { data: jobs, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["jobs", status, search],
    queryFn: () =>
      api<any[]>(`/api/jobs`, { params: { status, q: search || undefined } }),
  });

const badgeColor = (s: string) =>
  s === "COMPLETED" ? "green" : s === "CANCELLED" ? "red" : "blue";

  const invoiceBadgeColor = (s: string) =>
    s === "PAID" ? "green" : s === "PARTIALLY_PAID" ? "amber" : "slate";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-[#e2e8f0]/50 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">Service Jobs</h1>
          <p className="text-xs font-semibold text-[#64748b]">Track and manage workshop jobs</p>
        </div>
        <Link href="/jobs/new" className="hidden md:inline-flex">
          <Button className="font-bold">
            <Plus size={18} /> New Job
          </Button>
        </Link>
      </div>

      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-[#94a3b8]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by customer or job number..."
            className="pl-10"
            onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch(q);
          }}
        >
          Search
        </Button>
      </div>

      <div className="relative flex rounded-2xl bg-white p-1 border border-[#e2e8f0]/80 shadow-sm overflow-hidden select-none">
        <div
          className="absolute top-1 bottom-1 w-[calc(25%-2px)] rounded-xl bg-[#5865f2] shadow-md shadow-[#5865f2]/25 transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(${FILTERS.findIndex((f) => f === status) * 100}%)`,
          }}
        />
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatus(f)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center py-2 text-xs font-extrabold tracking-wider uppercase transition-colors duration-200 cursor-pointer select-none",
              status === f ? "text-white" : "text-[#64748b] hover:text-[#0f172a]"
            )}
          >
            {f === "ALL" ? "All Jobs" : f.replace("_", " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : !jobs?.length ? (
        <EmptyState
          title="No jobs found"
          description="Create a new service job to get started."
          icon={<Wrench size={36} className="text-[#94a3b8]" />}
          action={
            <Link href="/jobs/new">
              <Button className="font-bold">
                <Plus size={18} /> New Job
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="p-4 transition-all duration-150 hover:bg-[#f1f5f9]/90 hover:border-[#5865f2]/50 hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5865f2]/15 text-[#5865f2] border border-[#5865f2]/30">
                      <Wrench size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0f172a] flex items-center gap-2">
                        {job.customerName}
                        {job.vehicleType ? (
                          <span className="text-xs font-semibold text-[#64748b] bg-white px-2 py-0.5 rounded-full border border-[#e2e8f0]">
                            {vehicleTypeLabel(job.vehicleType)}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[#64748b] mt-0.5">
                        {job.jobNumber} · {formatDate(job.createdAt)}
                      </p>
                      {job.complaint && (
                        <p className="mt-1 text-xs text-[#94a3b8] truncate max-w-xs md:max-w-md">
                          {job.complaint}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge color={badgeColor(job.status)} dot>
                      {jobStatusLabel(job.status)}
                    </Badge>
                    {job.invoiceId && (
                      <Badge color={invoiceBadgeColor(job.invoiceStatus)}>
                        <FileText size={11} /> {invoiceStatusLabel(job.invoiceStatus)}
                      </Badge>
                    )}
                    {Number(job.total) > 0 && (
                      <span className="text-sm font-extrabold text-[#0f172a]">{currency(job.total)}</span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}