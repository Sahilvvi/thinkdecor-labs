import { describe, it, expect } from "vitest";
import { DeletionError, USER_BUCKETS, deleteAccount, listUserObjects } from "../../supabase/functions/_shared/accountDeletion";

const UID = "11111111-1111-1111-1111-111111111111";
const user = { id: UID, email: "Sam@Example.com" };

type Entry = { id: string | null; name: string };
type Files = Record<string, Record<string, Entry[]>>; // bucket -> prefix -> entries

/** A tiny fake of the pieces of the Supabase admin client the deletion uses. */
function fakeAdmin(opts: {
  roles?: { role: string }[];
  subs?: { id: string; status: string }[];
  customer?: string | null;
  files?: Files;
  deleteUserError?: boolean;
} = {}) {
  const log: string[] = [];
  const removed: Record<string, string[]> = {};
  const q = (table: string) => {
    const state = { op: "select" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      delete: () => { state.op = "delete"; return chain; },
      update: () => { state.op = "update"; return chain; },
      eq: () => {
        if (state.op !== "select") { log.push(`${state.op}:${table}`); return Promise.resolve({ error: null }); }
        return chain;
      },
      maybeSingle: () => Promise.resolve({ data: table === "billing_customers" && opts.customer ? { stripe_customer_id: opts.customer } : null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then: (res: any) => {
        const data = table === "user_roles" ? opts.roles ?? [] : table === "subscriptions" ? opts.subs ?? [] : [];
        return Promise.resolve({ data }).then(res);
      },
    };
    return chain;
  };
  const admin = {
    from: q,
    storage: {
      from: (bucket: string) => ({
        list: (prefix: string, { limit, offset }: { limit: number; offset: number }) => {
          const all = opts.files?.[bucket]?.[prefix] ?? [];
          return Promise.resolve({ data: all.slice(offset, offset + limit), error: null });
        },
        remove: (paths: string[]) => {
          log.push(`storage:${bucket}`);
          (removed[bucket] ??= []).push(...paths);
          return Promise.resolve({ error: null });
        },
      }),
    },
    auth: {
      admin: {
        deleteUser: () => {
          log.push("deleteUser");
          return Promise.resolve({ error: opts.deleteUserError ? new Error("x") : null });
        },
      },
    },
  };
  return { admin, log, removed };
}

function fakeStripe(opts: { live?: { id: string; status: string }[]; failWith?: { code?: string } } = {}) {
  const cancelled: string[] = [];
  return {
    cancelled,
    stripe: {
      subscriptions: {
        list: () => Promise.resolve({ data: opts.live ?? [] }),
        cancel: (id: string) => {
          if (opts.failWith) return Promise.reject(opts.failWith);
          cancelled.push(id);
          return Promise.resolve({});
        },
      },
    },
  };
}

const expectDeletionError = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toBeInstanceOf(DeletionError);
  await expect(p).rejects.toMatchObject({ code });
};

describe("deleteAccount: safety checks", () => {
  it("refuses when the typed email doesn't match, and touches nothing", async () => {
    const { admin, log } = fakeAdmin();
    const { stripe, cancelled } = fakeStripe();
    await expectDeletionError(deleteAccount(admin, stripe, user, "someone@else.com"), "confirm_mismatch");
    await expectDeletionError(deleteAccount(admin, stripe, user, ""), "confirm_mismatch");
    await expectDeletionError(deleteAccount(admin, stripe, user, undefined), "confirm_mismatch");
    expect(log).toEqual([]);
    expect(cancelled).toEqual([]);
  });

  it("accepts the email regardless of case and surrounding spaces", async () => {
    const { admin, log } = fakeAdmin();
    const { stripe } = fakeStripe();
    await deleteAccount(admin, stripe, user, "  sam@example.COM ");
    expect(log).toContain("deleteUser");
  });

  it("refuses admin accounts and touches nothing", async () => {
    const { admin, log } = fakeAdmin({ roles: [{ role: "admin" }] });
    const { stripe, cancelled } = fakeStripe();
    await expectDeletionError(deleteAccount(admin, stripe, user, "sam@example.com"), "admin_account");
    expect(log).toEqual([]);
    expect(cancelled).toEqual([]);
  });
});

describe("deleteAccount: billing", () => {
  it("cancels live subscriptions found in our table and in Stripe, but not ended ones", async () => {
    const { admin } = fakeAdmin({
      subs: [{ id: "sub_a", status: "active" }, { id: "sub_old", status: "canceled" }],
      customer: "cus_1",
    });
    const { stripe, cancelled } = fakeStripe({
      live: [{ id: "sub_a", status: "active" }, { id: "sub_b", status: "past_due" }, { id: "sub_c", status: "canceled" }],
    });
    await deleteAccount(admin, stripe, user, "sam@example.com");
    expect(cancelled.sort()).toEqual(["sub_a", "sub_b"]);
  });

  it("does NOT delete the account if a subscription can't be cancelled", async () => {
    const { admin, log, removed } = fakeAdmin({ subs: [{ id: "sub_a", status: "active" }] });
    const { stripe } = fakeStripe({ failWith: { code: "api_connection_error" } });
    await expectDeletionError(deleteAccount(admin, stripe, user, "sam@example.com"), "billing_cancel_failed");
    expect(log).not.toContain("deleteUser");
    expect(Object.keys(removed)).toEqual([]);
  });

  it("carries on if the subscription is already gone in Stripe", async () => {
    const { admin, log } = fakeAdmin({ subs: [{ id: "sub_a", status: "active" }] });
    const { stripe } = fakeStripe({ failWith: { code: "resource_missing" } });
    await deleteAccount(admin, stripe, user, "sam@example.com");
    expect(log).toContain("deleteUser");
  });
});

describe("deleteAccount: data removal", () => {
  it("removes files in nested folders and paginates past 1000 entries", async () => {
    const many: Entry[] = Array.from({ length: 1500 }, (_, i) => ({ id: `f${i}`, name: `img-${i}.jpg` }));
    const files: Files = {
      generations: {
        [UID]: [{ id: null, name: "rooms" }, { id: "x", name: "out-1.jpg" }],
        [`${UID}/rooms`]: many,
      },
      avatars: { [UID]: [{ id: "a", name: "avatar.webp" }] },
    };
    const { admin, removed } = fakeAdmin({ files });
    const { stripe } = fakeStripe();
    await deleteAccount(admin, stripe, user, "sam@example.com");
    expect(removed.generations).toHaveLength(1501);
    expect(removed.generations).toContain(`${UID}/out-1.jpg`);
    expect(removed.generations).toContain(`${UID}/rooms/img-1499.jpg`);
    expect(removed.avatars).toEqual([`${UID}/avatar.webp`]);
  });

  it("only ever looks under the user's own folder", async () => {
    const files: Files = {
      generations: { [UID]: [{ id: "x", name: "a.jpg" }], "someone-else": [{ id: "y", name: "b.jpg" }] },
    };
    const { admin, removed } = fakeAdmin({ files });
    const { stripe } = fakeStripe();
    await deleteAccount(admin, stripe, user, "sam@example.com");
    expect(removed.generations).toEqual([`${UID}/a.jpg`]);
  });

  it("covers every bucket that stores per-user files", async () => {
    expect(USER_BUCKETS).toEqual(expect.arrayContaining(["generations", "avatars", "uploads", "exports", "thumbnails"]));
    const out = await listUserObjects(fakeAdmin().admin, "generations", UID);
    expect(out).toEqual([]);
  });

  it("deletes non-cascading rows, strips payment emails, and deletes the user last", async () => {
    const { admin, log } = fakeAdmin({ files: { generations: { [UID]: [{ id: "x", name: "a.jpg" }] } } });
    const { stripe } = fakeStripe();
    await deleteAccount(admin, stripe, user, "sam@example.com");
    expect(log).toContain("delete:generation_events");
    expect(log).toContain("update:payments");
    expect(log.indexOf("storage:generations")).toBeLessThan(log.indexOf("deleteUser"));
    expect(log.indexOf("delete:generation_events")).toBeLessThan(log.indexOf("deleteUser"));
    expect(log[log.length - 1]).toBe("deleteUser");
  });

  it("reports a clear error if the final delete fails", async () => {
    const { admin } = fakeAdmin({ deleteUserError: true });
    const { stripe } = fakeStripe();
    await expectDeletionError(deleteAccount(admin, stripe, user, "sam@example.com"), "delete_failed");
  });
});
