"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Power, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  Badge,
  BentoGrid,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  InlineError,
  Input,
  Sheet,
  Skeleton,
  StatTile,
  StickyControls,
} from "@/components/ui";
import { SpotTools } from "@/components/illustrations";
import { formatWhen } from "../_status";

export default function SuperadminAdminsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createError, setCreateError] = useState<{ message: string; reference?: string } | null>(
    null,
  );

  // A stale failure must not be waiting inside a freshly opened sheet.
  const openCreate = () => {
    setCreateError(null);
    setShowCreate(true);
  };

  const { data: admins, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["superadmin-admins"],
    queryFn: () => api<any[]>("/api/superadmin/admins"),
  });

  const createAdmin = useMutation({
    mutationFn: () =>
      api("/api/superadmin/admins", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role: "ADMIN" }),
      }),
    onSuccess: () => {
      toast.success("New Garage Admin account created");
      setShowCreate(false);
      setCreateError(null);
      setName("");
      setEmail("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["superadmin-admins"] });
    },
    // The sheet stays open with the details still in it, so the error goes
    // where those details are.
    onError: (err) =>
      setCreateError({ message: errorMessage(err), reference: errorReference(err) }),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/api/superadmin/admins/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      toast.success("Admin account status updated");
      qc.invalidateQueries({ queryKey: ["superadmin-admins"] });
    },
    // Row action, nothing open to sit beside — a toast is the right scale.
    onError: (err) => toast.error(errorMessage(err)),
  });

  const deleteAdmin = useMutation({
    mutationFn: (id: string) =>
      api(`/api/superadmin/admins/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Admin account deleted");
      qc.invalidateQueries({ queryKey: ["superadmin-admins"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const rows = admins ?? [];
  const activeCount = rows.filter((a: any) => a.isActive).length;
  const canCreate = Boolean(name && email && password) && !createAdmin.isPending;

  return (
    <div className="space-y-5">
      {/* Pinned below the console's operator bar *and* its tab strip — both are
          opaque and sit above this in z-order, so anything less than the
          shell's own `--console-sticky-top` would hide this page's only action
          behind them. The strapline and the three count tiles are orientation,
          not tools — they scroll away with the first rows. */}
      <StickyControls className="top-[var(--console-sticky-top)] lg:top-[var(--console-sticky-top)]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
            Admin accounts
          </h1>
          <Button size="md" onClick={openCreate} className="h-11 shrink-0 sm:h-10">
            <UserPlus size={16} />
            New admin
          </Button>
        </div>
      </StickyControls>

      <p className="text-sm text-[var(--ink-muted)]">
        Who can sign in to the garage workshop, and with what access.
      </p>

      {isError && !admins ? (
        <ErrorState
          title="Couldn't load the account list"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <AdminsSkeleton />
      ) : (
        <>
          <BentoGrid className="sm:grid-cols-3">
            <StatTile
              tone="ochre"
              label="Accounts"
              value={rows.length}
              icon={<Users size={16} />}
              footnote="Everyone with a login"
            />
            <StatTile
              tone="sage"
              label="Active"
              value={activeCount}
              icon={<ShieldCheck size={16} />}
              footnote="Able to sign in right now"
            />
            <StatTile
              className="col-span-2 sm:col-span-1"
              tone={rows.length - activeCount > 0 ? "terracotta" : "cream"}
              label="Disabled"
              value={rows.length - activeCount}
              icon={<Power size={16} />}
              footnote="Blocked at sign-in"
            />
          </BentoGrid>

          {rows.length === 0 ? (
            <EmptyState
              title="No accounts on this deployment"
              description="Create the first garage admin so someone can open the workshop."
              illustration={<SpotTools size={84} />}
              action={
                <Button size="md" onClick={() => setShowCreate(true)} className="h-11 sm:h-10">
                  <UserPlus size={16} />
                  Create the first admin
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {rows.map((admin: any) => {
                const isSuper = String(admin.role ?? "").toUpperCase() === "SUPERADMIN";
                const togglePending =
                  toggleStatus.isPending && toggleStatus.variables?.id === admin.id;
                const deletePending = deleteAdmin.isPending && deleteAdmin.variables === admin.id;

                return (
                  <Card
                    key={admin.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* Identity left, always truncating. */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={
                          isSuper
                            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-[var(--forest)] text-sm font-extrabold text-[var(--ink-on-dark)]"
                            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-[var(--sage)] text-sm font-extrabold text-[var(--forest)]"
                        }
                      >
                        {String(admin.email ?? "?")[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        {/* Two un-shrinkable badges beside a name leave it a
                            character or two at 320px, so the pair drops to its
                            own line instead of starving the name. */}
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="min-w-0 truncate text-sm font-extrabold text-[var(--ink)]">
                            {admin.name}
                          </p>
                          <Badge color={isSuper ? "green" : "blue"}>{admin.role}</Badge>
                          <Badge color={admin.isActive ? "slate" : "red"} dot>
                            {admin.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-[var(--ink-muted)]">
                          {admin.email}
                        </p>
                        {/* Not `.tile-label`: a full locale timestamp in 10px
                            wide-tracked caps runs to two lines in this column. */}
                        <p className="mt-1 text-[11px] font-semibold text-[var(--ink-label)]">
                          Last sign-in {admin.lastLoginAt ? formatWhen(admin.lastLoginAt) : "never"}
                        </p>
                      </div>
                    </div>

                    {/* Actions right, never wrapping into the identity column.
                        Both controls are full 44px targets on touch and the
                        destructive one gets extra separation from its
                        neighbour there, so a mis-tap can't delete an account. */}
                    <div className="flex shrink-0 items-center gap-3 self-end sm:gap-2 sm:self-center">
                      <Button
                        variant={admin.isActive ? "outline" : "secondary"}
                        size="sm"
                        className="h-11 sm:h-8"
                        onClick={() =>
                          toggleStatus.mutate({ id: admin.id, isActive: !admin.isActive })
                        }
                        disabled={isSuper || togglePending}
                        title={
                          isSuper
                            ? "The superadmin account can't be disabled"
                            : admin.isActive
                              ? "Block this account from signing in"
                              : "Let this account sign in again"
                        }
                      >
                        <Power size={14} />
                        {togglePending ? "Saving…" : admin.isActive ? "Disable" : "Enable"}
                      </Button>

                      {!isSuper && (
                        <Button
                          variant="danger"
                          size="icon"
                          className="h-11 w-11 sm:h-10 sm:w-10"
                          aria-label={`Delete ${admin.email}`}
                          title="Delete account"
                          disabled={deletePending}
                          onClick={() => {
                            if (confirm(`Delete admin account ${admin.email}?`)) {
                              deleteAdmin.mutate(admin.id);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Sheet open={showCreate} onClose={() => setShowCreate(false)} title="New garage admin">
        <form
          className="space-y-4"
          onChange={() => setCreateError(null)}
          onSubmit={(e) => {
            e.preventDefault();
            if (canCreate) createAdmin.mutate();
          }}
        >
          <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
            The account is created with the ADMIN role and can sign in immediately.
          </p>
          {createError && (
            <InlineError message={createError.message} reference={createError.reference} />
          )}
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Nair"
              autoComplete="off"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="priya@yourgarage.com"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>
          <Field label="Password" hint="Share it with them directly; they can't reset it themselves.">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="h-11 sm:h-10"
              onClick={() => setShowCreate(false)}
              disabled={createAdmin.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="md" className="h-11 sm:h-10" disabled={!canCreate}>
              {createAdmin.isPending ? "Creating…" : "Create admin"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

function AdminsSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading admin accounts…</span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="col-span-2 h-28 sm:col-span-1" />
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          // A row stacks its actions under the identity below sm, so it is
          // roughly half again as tall there.
          <Skeleton key={i} className="h-[170px] rounded-[var(--r-card)] sm:h-[104px]" />
        ))}
      </div>
    </div>
  );
}
