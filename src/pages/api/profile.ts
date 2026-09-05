import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { updateProfileProgress } from "@/lib/services/profile";
import type { ProfileProgressWrite } from "@/types";

export const prerender = false;

const profileProgressWriteSchema = z.object({
  current_set: z.enum(["random", "stepwise"]),
  last_accuracy_percent: z.number().min(0).max(100),
  last_average_response_ms: z.number().int().nonnegative(),
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Unauthorized" }, 401);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json({ error: "Unauthorized" }, 401);
  }

  let raw: unknown;
  try {
    raw = await context.request.json();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }

  const parsed = profileProgressWriteSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "Invalid body" }, 400);
  }

  const patch: ProfileProgressWrite = {
    current_set: parsed.data.current_set,
    last_accuracy_percent: Math.min(100, Math.max(0, Math.round(parsed.data.last_accuracy_percent))),
    last_average_response_ms: Math.round(parsed.data.last_average_response_ms),
  };

  const ok = await updateProfileProgress(supabase, user.id, patch);
  return json({ ok }, 200);
};
