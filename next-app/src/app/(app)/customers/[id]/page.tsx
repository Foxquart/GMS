"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wrench, FileText, Phone } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Badge, Skeleton, EmptyState, ErrorState } from "@/components/ui";
import { currency, formatDate, jobStatusLabel, vehicleTypeLabel, invoiceStatusLabel } from "@/lib/format";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api<any>(`/api/customers/${id}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data) return <EmptyState title="Customer not found" />;

  const { customer, stats, jobs, invoices, vehicles } = data;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
          <p className="flex items-center gap-1 text-sm text-slate-500">
            <Phone size={12} /> {customer.phone}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-slate-900">{currency(stats.billed)}</p>
          <p className="text-xs font-medium text-slate-500">Billed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-emerald-600">{currency(stats.paid)}</p>
          <p className="text-xs font-medium text-slate-500">Paid</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-amber-600">{currency(stats.outstanding)}</p>
          <p className="text-xs font-medium text-slate-500">Due</p>
        </Card>
      </div>

      {vehicles?.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-base font-bold text-slate-900">Vehicles</h2>
          <div className="space-y-1.5">
            {vehicles.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-sm font-medium text-slate-900">
                  {vehicleTypeLabel(v.vehicleType)}
                  {v.vehicleName ? ` · ${v.vehicleName}` : ""}
                </p>
                {v.registrationNumber && (
                  <Badge color="slate">{v.registrationNumber}</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-900">
          <Wrench size={16} /> Recent Jobs
        </h2>
        {!jobs?.length ? (
          <EmptyState
            title="No jobs yet"
            action={
              <Link href={`/jobs/new?customerId=${id}`}>
                <span className="text-sm font-medium text-blue-600 hover:underline">Create a job →</span>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {jobs.map((j: any) => (
              <Link key={j.id} href={`/jobs/${j.id}`}>
                <Card className="flex items-center justify-between p-3 transition-shadow hover:shadow">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{j.complaint || "Service job"}</p>
                    <p className="text-xs text-slate-500">{j.jobNumber} · {formatDate(j.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {Number(j.total) > 0 && <span className="text-sm font-bold text-slate-900">{currency(j.total)}</span>}
                    <Badge color={j.status === "COMPLETED" ? "green" : j.status === "CANCELLED" ? "red" : "blue"}>
                      {jobStatusLabel(j.status)}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-900">
          <FileText size={16} /> Invoices
        </h2>
        {!invoices?.length ? (
          <EmptyState title="No invoices" />
        ) : (
          <div className="space-y-2">
            {invoices.map((inv: any) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`}>
                <Card className="flex items-center justify-between p-3 transition-shadow hover:shadow">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{inv.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">{formatDate(inv.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{currency(inv.total)}</span>
                    <Badge color={inv.status === "PAID" ? "green" : inv.status === "PARTIALLY_PAID" ? "amber" : "slate"}>
                      {invoiceStatusLabel(inv.status)}
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