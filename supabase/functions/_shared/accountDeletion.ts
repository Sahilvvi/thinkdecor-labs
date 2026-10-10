// Self-service account deletion. The logic lives here (not in index.ts) so it can be
// unit-tested with fakes; delete-account/index.ts only does HTTP, auth and wiring.
//
// Order matters, and anything that fails BEFORE the final step aborts the whole
// deletion, so a customer is never left deleted-but-still-billed or half-deleted:
//   1. confirm the typed email, refuse admins
//   2. cancel any live Stripe subscription (immediately, no further charges)
//   3. delete the person's files from storage
//   4. remove rows that don't cascade, and strip the email from payment records
//      (the records themselves are kept: 7 years, UK tax law, as the privacy policy says)
//   5. delete the auth user — everything else cascades from that

// deno-lint-ignore-file no-explicit-any
/* eslint-disable @typescript-eslint/no-explicit-any */

export class DeletionError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Buckets whose objects are stored under `<user id>/...`. */
export const USER_BUCKETS = ["generations", "avatars", "uploads", "exports", "thumbnails"];

const LIVE_SUB_STATUSES = ["active", "trialing", "past_due", "unpaid"];

/** Every object path under `<userId>/`, following sub-folders. */
export async function listUserObjects(admin: any, bucket: string, userId: string): Promise<string[]> {
  const out: string[] = [];
  const stack = [userId];
  while (stack.length) {
    const prefix = stack.pop()!;
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const o of data) {
        // Folders come back with a null id; files have one.
        if (o.id === null || o.id === undefined) stack.push(`${prefix}/${o.name}`);
        else out.push(`${prefix}/${o.name}`);
      }
      if (data.length < 1000) break;
    }
  }
  return out;
}

async function removeUserFiles(admin: any, userId: string) {
  for (const bucket of USER_BUCKETS) {
    const paths = await listUserObjects(admin, bucket, userId);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) throw error;
    }
  }
}

async function cancelSubscriptions(admin: any, stripe: any, userId: string) {
  const ids = new Set<string>();

  const { data: rows } = await admin.from("subscriptions").select("id, status").eq("user_id", userId);
  for (const r of rows ?? []) if (LIVE_SUB_STATUSES.includes(r.status)) ids.add(r.id);

  // Also ask Stripe directly, in case our copy is behind.
  const { data: cust } = await admin.from("billing_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (cust?.stripe_customer_id) {
    const live = await stripe.subscriptions.list({ customer: cust.stripe_customer_id, status: "all", limit: 20 });
    for (const s of live.data) if (LIVE_SUB_STATUSES.includes(s.status)) ids.add(s.id);
  }

  for (const id of ids) {
    try {
      await stripe.subscriptions.cancel(id);
    } catch (e: any) {
      // Already gone is fine; anything else must stop the deletion.
      if (e?.code === "resource_missing") continue;
      throw new DeletionError(
        "billing_cancel_failed",
        "We couldn't cancel your subscription, so your account has not been deleted. Please try again, or email info@thinkdecor.app.",
        502,
      );
    }
  }
}

export interface DeletionUser { id: string; email?: string | null }

export async function deleteAccount(admin: any, stripe: any, user: DeletionUser, confirmEmail: unknown) {
  const email = (user.email ?? "").toLowerCase();
  if (!email || String(confirmEmail ?? "").trim().toLowerCase() !== email) {
    throw new DeletionError("confirm_mismatch", "The email you typed doesn't match your account.", 400);
  }

  // An admin account can't remove itself; another admin has to demote it first, otherwise the
  // site could be left with no one able to run it.
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  if ((roles ?? []).length > 0) {
    throw new DeletionError("admin_account", "Admin accounts can't be deleted here. Ask another admin to remove your role first.", 403);
  }

  await cancelSubscriptions(admin, stripe, user.id);
  await removeUserFiles(admin, user.id);

  // Rows that don't cascade from the auth user.
  await admin.from("generation_events").delete().eq("user_id", user.id);
  await admin.from("payments").update({ email: null }).eq("user_id", user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new DeletionError("delete_failed", "We couldn't finish deleting your account. Please email info@thinkdecor.app.", 500);
  return { ok: true };
}
