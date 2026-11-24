import type { UserProfile } from "@/lib/types/auth";
import {
  toUserProfile,
  getDemoUserByEmail,
  getDemoUserById,
} from "@/lib/auth/demo-users";

const SESSION_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "assdi-portal-secure-internal-secret-key-2026";

const SIGNED_TOKEN_REGEX = /^[A-Za-z0-9_-]+\.[0-9a-fA-F]{64}$/;

async function getHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

/**
 * Creates a cryptographically signed session token:
 * `<base64url-payload>.<hmac-sha256-signature>`
 */
export async function createSignedSessionToken(profile: UserProfile): Promise<string> {
  const payload = JSON.stringify(profile);
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const sigHex = toHex(signature);
  const b64 = Buffer.from(payload, "utf-8").toString("base64url");
  return `${b64}.${sigHex}`;
}

/**
 * Verifies and decodes a session token.
 * Strictly rejects forged tokens with mismatched signatures.
 */
export async function verifySessionToken(token: string): Promise<UserProfile | null> {
  if (!token || typeof token !== "string") return null;

  const trimmed = token.trim();

  // 1. Cryptographically signed token format: <b64payload>.<sigHex>
  if (SIGNED_TOKEN_REGEX.test(trimmed)) {
    const parts = trimmed.split(".");
    const [b64, sigHex] = parts;

    try {
      const payload = Buffer.from(b64, "base64url").toString("utf-8");
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      const key = await getHmacKey();
      const isValid = await crypto.subtle.verify("HMAC", key, fromHex(sigHex), data);

      if (!isValid) return null;

      const profile = JSON.parse(payload) as UserProfile;
      // Check static and dynamic demo users to respect deactivation
      const demo =
        (profile.email ? getDemoUserByEmail(profile.email) : null) ||
        (profile.id ? getDemoUserById(profile.id) : null);
      if (demo && !demo.is_active) {
        return { ...profile, is_active: false };
      }
      return profile;
    } catch {
      return null;
    }
  }

  // 2. Fallback legacy / mock test cookie: only valid if matches authoritative demo/dynamic users
  try {
    let str = trimmed;
    try {
      str = decodeURIComponent(str);
    } catch {
      // ignore
    }
    if (str.startsWith("%")) {
      try {
        str = decodeURIComponent(str);
      } catch {
        // ignore
      }
    }
    const parsed = JSON.parse(str) as Partial<UserProfile>;
    if (parsed?.email) {
      const demo = getDemoUserByEmail(parsed.email);
      if (demo) {
        return toUserProfile(demo);
      }
    } else if (parsed?.id) {
      const demo = getDemoUserById(parsed.id);
      if (demo) {
        return toUserProfile(demo);
      }
    }
  } catch {
    // ignore
  }

  return null;
}
