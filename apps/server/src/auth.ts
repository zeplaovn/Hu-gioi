export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthContext {
  user: AuthUser;
  accessToken: string;
}

export interface AuthVerifier {
  verifyAuthorization(header: string | undefined): Promise<AuthContext | null>;
}

const bearer = (header: string | undefined) => {
  const m = /^Bearer\s+(.+)$/i.exec(String(header || "").trim());
  const token = m?.[1];
  return token ? token.trim() : "";
};

export class StaticAuthVerifier implements AuthVerifier {
  constructor(private readonly tokens: Readonly<Record<string, AuthUser>> = {}) {}
  async verifyAuthorization(header: string | undefined): Promise<AuthContext | null> {
    const accessToken = bearer(header);
    const user = accessToken ? this.tokens[accessToken] : undefined;
    return user ? { user, accessToken } : null;
  }
}

export class SupabaseAuthVerifier implements AuthVerifier {
  private readonly base: string;
  constructor(url: string, private readonly anonKey: string, private readonly fetchImpl: typeof fetch = fetch) {
    this.base = String(url).replace(/\/+$/, "");
    if (!/^https:\/\//.test(this.base) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(this.base)) throw new Error("invalid_supabase_url");
    if (String(anonKey).length < 20) throw new Error("invalid_supabase_anon_key");
  }

  async verifyAuthorization(header: string | undefined): Promise<AuthContext | null> {
    const accessToken = bearer(header);
    if (!accessToken) return null;
    let response: Response;
    try {
      response = await this.fetchImpl(this.base + "/auth/v1/user", {
        method: "GET",
        headers: { apikey: this.anonKey, Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      return null;
    }
    if (!response.ok) return null;
    const data = await response.json().catch(() => null) as { id?: unknown; email?: unknown } | null;
    if (!data || typeof data.id !== "string" || !data.id) return null;
    const user: AuthUser = { id: data.id };
    if (typeof data.email === "string") user.email = data.email;
    return { user, accessToken };
  }
}
