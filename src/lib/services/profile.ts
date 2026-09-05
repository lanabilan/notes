import type { SupabaseClient } from "@supabase/supabase-js";
import type { PracticeSetMode, Profile, ProfileProgressWrite } from "@/types";

const PROFILE_COLUMNS =
  "id, current_set, last_accuracy_percent, last_average_response_ms, last_completed_at, created_at, updated_at";

function isPracticeSetMode(value: unknown): value is PracticeSetMode {
  return value === "random" || value === "stepwise";
}

function readField(row: object, key: string): unknown {
  return Reflect.get(row, key);
}

function asNullableNumber(value: unknown): number | null {
  if (value === null) {
    return null;
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNullableString(value: unknown): string | null {
  if (value === null) {
    return null;
  }
  return typeof value === "string" ? value : null;
}

function mapProfile(value: unknown): Profile | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const id = readField(value, "id");
  const createdAt = readField(value, "created_at");
  const updatedAt = readField(value, "updated_at");
  if (typeof id !== "string" || typeof createdAt !== "string" || typeof updatedAt !== "string") {
    return null;
  }

  const currentSet = readField(value, "current_set");

  return {
    id,
    current_set: isPracticeSetMode(currentSet) ? currentSet : null,
    last_accuracy_percent: asNullableNumber(readField(value, "last_accuracy_percent")),
    last_average_response_ms: asNullableNumber(readField(value, "last_average_response_ms")),
    last_completed_at: asNullableString(readField(value, "last_completed_at")),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();

  if (error || data === null) {
    return null;
  }

  return mapProfile(data);
}

export async function updateProfileProgress(
  supabase: SupabaseClient,
  userId: string,
  patch: ProfileProgressWrite,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      current_set: patch.current_set,
      last_accuracy_percent: patch.last_accuracy_percent,
      last_average_response_ms: patch.last_average_response_ms,
      last_completed_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id");

  if (error || !Array.isArray(data)) {
    return false;
  }

  return data.length > 0;
}
