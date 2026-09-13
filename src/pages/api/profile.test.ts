import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("astro:env/server", () => ({
  SUPABASE_URL: "http://supabase.test",
  SUPABASE_KEY: "anon-key",
}));

vi.mock("@/lib/supabase", () => ({
  createClient,
}));

import { POST } from "@/pages/api/profile";

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

/** Valid progress snapshot (FR-005 / FR-004 ranges). Not copied from the zod schema. */
const VALID_BODY = {
  current_set: "random" as const,
  last_accuracy_percent: 70,
  last_average_response_ms: 400,
};

/**
 * Invalid bodies (product constraints: set is random|stepwise, accuracy 0–100,
 * ms non-negative int). Extra `id` is ownership (Risk #4), not 400.
 * In-range float accuracy 66.6 is valid (not .int()).
 */
const INVALID_BODIES: readonly { name: string; body: unknown }[] = [
  { name: "jazz set", body: { ...VALID_BODY, current_set: "jazz" } },
  { name: "chromatic set", body: { ...VALID_BODY, current_set: "chromatic" } },
  { name: "Random set (case)", body: { ...VALID_BODY, current_set: "Random" } },
  { name: "accuracy 101", body: { ...VALID_BODY, last_accuracy_percent: 101 } },
  { name: "accuracy -1", body: { ...VALID_BODY, last_accuracy_percent: -1 } },
  { name: "ms 1.5", body: { ...VALID_BODY, last_average_response_ms: 1.5 } },
  { name: "ms -1", body: { ...VALID_BODY, last_average_response_ms: -1 } },
  { name: "missing ms", body: { current_set: "random", last_accuracy_percent: 70 } },
  { name: "empty object", body: {} },
  { name: "accuracy string", body: { ...VALID_BODY, last_accuracy_percent: "70" } },
];

interface RecordedEq {
  column: string;
  id: string;
}

function createRecordingClient(user: { id: string } | null) {
  const eqs: RecordedEq[] = [];
  const client = {
    auth: {
      getUser: () => Promise.resolve({ data: { user }, error: null }),
    },
    from: () => ({
      update: () => ({
        eq: (column: string, id: string) => {
          eqs.push({ column, id });
          return Promise.resolve({ error: null });
        },
      }),
    }),
  };
  return { client: client as unknown as SupabaseClient, eqs };
}

function contextFor(body: unknown, raw?: string): APIContext {
  const payload = raw ?? JSON.stringify(body);
  const request = new Request("https://example.test/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  return { request, cookies: {} } as APIContext;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

beforeEach(() => {
  createClient.mockReset();
});

describe("POST /api/profile unauthenticated", () => {
  it("returns 401 and does not UPDATE when getUser has no user", async () => {
    const { client, eqs } = createRecordingClient(null);
    createClient.mockReturnValue(client);

    const response = await POST(contextFor(VALID_BODY));

    expect(response.status).toBe(401);
    expect(await readJson(response)).toEqual({ error: "Unauthorized" });
    expect(eqs).toEqual([]);
  });
});

describe("POST /api/profile invalid body", () => {
  it.each(INVALID_BODIES)("$name → 400 and no UPDATE", async ({ body }) => {
    const { client, eqs } = createRecordingClient({ id: USER_A });
    createClient.mockReturnValue(client);

    const response = await POST(contextFor(body));

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: "Invalid body" });
    expect(eqs).toEqual([]);
  });

  it("non-JSON → 400 and no UPDATE", async () => {
    const { client, eqs } = createRecordingClient({ id: USER_A });
    createClient.mockReturnValue(client);

    const response = await POST(contextFor(null, "not-json"));

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: "Invalid body" });
    expect(eqs).toEqual([]);
  });
});

describe("POST /api/profile ownership", () => {
  it("strips extra id and UPDATEs session user A, not B", async () => {
    const { client, eqs } = createRecordingClient({ id: USER_A });
    createClient.mockReturnValue(client);

    const response = await POST(
      contextFor({
        ...VALID_BODY,
        id: USER_B,
        user_id: USER_B,
      }),
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ ok: true });
    expect(eqs).toEqual([{ column: "id", id: USER_A }]);
  });
});

describe("POST /api/profile valid control", () => {
  it("records UPDATE for the session user", async () => {
    const { client, eqs } = createRecordingClient({ id: USER_A });
    createClient.mockReturnValue(client);

    const response = await POST(contextFor(VALID_BODY));

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ ok: true });
    expect(eqs).toEqual([{ column: "id", id: USER_A }]);
  });
});
