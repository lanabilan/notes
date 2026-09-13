const PROTECTED_PATH_PREFIXES = ["/dashboard"];

/** Live denylist: a path is gated iff it starts with a protected prefix. */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
