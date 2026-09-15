import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { TEST_USERS, anonClient, signInAs, testSlug } from "./clients";

/**
 * Runs against the real Supabase project (real Postgres, real RLS, real
 * Auth) — no mocking, no local stack. Everything this suite creates lives
 * under a single throwaway barbershop (slug prefixed "zzz-test-"), owned by
 * the dedicated intruder.qa test account, deleted in afterAll via
 * cleanup_test_barbershop() (which refuses to touch anything without that
 * prefix). Real fixtures (barber-king-qa, los-baah, the user's own account)
 * are never read or written.
 *
 * This exists because the two worst bugs found during manual testing this
 * project (RLS RETURNING-visibility, anon denied EXECUTE on RLS helper
 * functions) were both invisible to pure-TypeScript unit tests — only
 * something that talks to real Postgres/RLS would have caught them.
 */

let owner: SupabaseClient<Database>; // owns the ZZZ test shop
let stranger: SupabaseClient<Database>; // owns barber-king-qa, no relation to ZZZ shop
let admin: SupabaseClient<Database>; // platform_admin
let tenantId: string;
let serviceId: string;
let barberId: string;
const slug = testSlug();

beforeAll(async () => {
  owner = await signInAs(TEST_USERS.intruder);
  stranger = await signInAs(TEST_USERS.owner);
  admin = await signInAs(TEST_USERS.admin);

  const { data, error } = await owner.rpc("create_barbershop_with_owner", {
    p_name: "ZZZ Test Shop",
    p_base_slug: slug,
  });
  if (error) throw error;
  tenantId = (data as { id: string }).id;

  const { data: service, error: serviceError } = await owner
    .from("services")
    .insert({ tenant_id: tenantId, name: "Test Cut", price_cents: 1000, duration_minutes: 30 })
    .select("id")
    .single();
  if (serviceError) throw serviceError;
  serviceId = service.id;

  const { data: barber, error: barberError } = await owner
    .from("barbers")
    .insert({ tenant_id: tenantId, display_name: "Test Barber" })
    .select("id")
    .single();
  if (barberError) throw barberError;
  barberId = barber.id;

  const { error: linkError } = await owner
    .from("barber_services")
    .insert({ tenant_id: tenantId, barber_id: barberId, service_id: serviceId });
  if (linkError) throw linkError;

  const { error: publishError } = await owner
    .from("barbershops")
    .update({ is_published: true })
    .eq("id", tenantId);
  if (publishError) throw publishError;
});

afterAll(async () => {
  if (tenantId) {
    await owner.rpc("cleanup_test_barbershop", { p_tenant_id: tenantId });
  }
});

describe("RLS RETURNING-visibility (regression)", () => {
  it("the newly created barbershop is immediately readable by its own creator", async () => {
    // This is the exact bug found this project: INSERT...RETURNING failed
    // because no SELECT policy allowed seeing the row before membership
    // existed. create_barbershop_with_owner (SECURITY DEFINER, atomic
    // insert of barbershop+membership+hours+subscription) is the fix —
    // this asserts it actually works end to end, not just that it compiles.
    const { data, error } = await owner.from("barbershops").select("id, name, slug").eq("id", tenantId).single();

    expect(error).toBeNull();
    expect(data?.slug).toBe(slug);
  });

  it("business_hours and a trial subscription were created atomically alongside it", async () => {
    const { data: hours } = await owner.from("business_hours").select("weekday").eq("tenant_id", tenantId);
    expect(hours?.length).toBe(7);

    const { data: subscription } = await owner
      .from("subscriptions")
      .select("status, trial_ends_at")
      .eq("tenant_id", tenantId)
      .single();
    expect(subscription?.status).toBe("trial");
    expect(subscription?.trial_ends_at).not.toBeNull();
  });
});

describe("cross-tenant isolation", () => {
  it("a stranger cannot read another tenant's clients", async () => {
    // Seed one client into the ZZZ shop as its owner first.
    const { error: seedError } = await owner
      .from("clients")
      .insert({ tenant_id: tenantId, full_name: "Private Client", phone: "8090000000" });
    expect(seedError).toBeNull();

    const { data, error } = await stranger.from("clients").select("id").eq("tenant_id", tenantId);

    // RLS filters silently (empty result), it does not error.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("a stranger cannot write into another tenant's services", async () => {
    const { error } = await stranger
      .from("services")
      .insert({ tenant_id: tenantId, name: "Hostile Insert", price_cents: 100, duration_minutes: 10 });

    expect(error).not.toBeNull();
  });

  it("a stranger cannot change another tenant's business hours", async () => {
    const { data, error } = await stranger
      .from("business_hours")
      .update({ is_closed: true })
      .eq("tenant_id", tenantId)
      .select();

    // RLS blocks the update — either an error, or (more likely for UPDATE
    // with no matching row visible) zero rows affected.
    expect(error ? true : (data ?? []).length === 0).toBe(true);
  });
});

describe("anon access to the public storefront (regression: migration 0003)", () => {
  it("an anonymous visitor can read a published barbershop's public data", async () => {
    // This is the second bug found this project: anon lacked EXECUTE on
    // is_member_of/has_role/etc., and since Postgres must evaluate every
    // permissive SELECT policy on a table (no short-circuit), that made
    // even the "public" policy fail with permission denied for real
    // anonymous visitors. Fixed by granting EXECUTE on those helpers to
    // anon — this asserts a genuinely unauthenticated client can still
    // read the storefront.
    const anon = anonClient();
    const { data, error } = await anon
      .from("barbershops")
      .select("id, name, is_published")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(tenantId);
  });

  it("an anonymous visitor can read services, barbers, and hours for it", async () => {
    const anon = anonClient();
    const [{ data: services, error: e1 }, { data: barbers, error: e2 }, { data: hours, error: e3 }] =
      await Promise.all([
        anon.from("services").select("id").eq("tenant_id", tenantId),
        anon.from("barbers").select("id").eq("tenant_id", tenantId),
        anon.from("business_hours").select("weekday").eq("tenant_id", tenantId),
      ]);

    expect(e1).toBeNull();
    expect(e2).toBeNull();
    expect(e3).toBeNull();
    expect(services?.length).toBe(1);
    expect(barbers?.length).toBe(1);
    expect(hours?.length).toBe(7);
  });

  it("an anonymous visitor still cannot read members-only data (clients)", async () => {
    const anon = anonClient();
    const { data, error } = await anon.from("clients").select("id").eq("tenant_id", tenantId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("subscription access enforcement (regression: create_public_appointment bypass)", () => {
  it("anon can book while the shop is active/trialing", async () => {
    const anon = anonClient();
    const { error } = await anon.rpc("create_public_appointment", {
      p_tenant_id: tenantId,
      p_barber_id: barberId,
      p_service_id: serviceId,
      p_starts_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      p_client_name: "Trial Booker",
      p_client_phone: "8091110000",
    });

    expect(error).toBeNull();
  });

  it("booking is rejected once the shop is suspended, even calling the RPC directly", async () => {
    // Admin-only write, matching the real "suspend a tenant" action in
    // src/app/admin/actions.ts.
    const { error: suspendError } = await admin.from("barbershops").update({ status: "suspended" }).eq("id", tenantId);
    expect(suspendError).toBeNull();

    const { data: active } = await anonClient().rpc("is_barbershop_active", { p_tenant_id: tenantId });
    expect(active).toBe(false);

    const { error: bookError } = await anonClient().rpc("create_public_appointment", {
      p_tenant_id: tenantId,
      p_barber_id: barberId,
      p_service_id: serviceId,
      p_starts_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      p_client_name: "Should Be Blocked",
      p_client_phone: "8092220000",
    });

    expect(bookError).not.toBeNull();
  });
});

describe("platform_admin boundary", () => {
  it("a regular owner cannot confirm their own subscription payment (sub_payments_write_admin)", async () => {
    const { data: subscription } = await owner.from("subscriptions").select("id").eq("tenant_id", tenantId).single();

    const {
      data: { user: ownerUser },
    } = await owner.auth.getUser();

    const { data: payment, error: insertError } = await owner
      .from("subscription_payments")
      .insert({
        tenant_id: tenantId,
        subscription_id: subscription!.id,
        amount_cents: 150000,
        method: "transfer",
        created_by: ownerUser!.id,
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    const { data: updated, error: updateError } = await owner
      .from("subscription_payments")
      .update({ status: "confirmed" })
      .eq("id", payment!.id)
      .select();

    // Owner's own write is blocked by RLS: either an error, or zero rows
    // affected (the row exists but isn't visible/writable under this policy).
    expect(updateError ? true : (updated ?? []).length === 0).toBe(true);
  });

  it("platform_admin can confirm it", async () => {
    const { data: subscription } = await owner.from("subscriptions").select("id").eq("tenant_id", tenantId).single();
    const { data: pending } = await admin
      .from("subscription_payments")
      .select("id")
      .eq("subscription_id", subscription!.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    expect(pending).not.toBeNull();

    const { error } = await admin
      .from("subscription_payments")
      .update({ status: "confirmed" })
      .eq("id", pending!.id);

    expect(error).toBeNull();
  });
});
