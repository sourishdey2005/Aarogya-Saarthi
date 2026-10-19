/**
 * Authentication for the API.
 *
 * Production: the Authorization header carries a JWT issued by Neon Auth
 * (Better Auth). The JWT is signed with HS256 using NEON_AUTH_SECRET and its
 * `sub` claim is the id of the ASHA worker (the same value stored in
 * `asha_workers.id`), which is what `auth.uid()` resolves to in Postgres.
 *
 * Local development: `ALLOW_DEV_AUTH=true` accepts a plain UUID as the
 * bearer token (or a fixed dev user) so the API can be exercised without a
 * Neon project. Never enable that in production.
 */

export interface JwtPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  name?: string;
  email?: string;
  [claim: string]: unknown;
}

export class AuthError extends Error {
  status: number;
  code: string;

  constructor(message: string, code = 'unauthorized', status = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

function base64UrlDecode(segment: string): Uint8Array<ArrayBuffer> {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Verifies an HS256 JWT and returns its payload. */
export async function verifyJwt(
  token: string,
  secret: string
): Promise<JwtPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AuthError('Malformed token', 'invalid_token');
  }

  const [headerPart, payloadPart, signaturePart] = parts;

  let header: { alg?: string; typ?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerPart)));
  } catch {
    throw new AuthError('Malformed token header', 'invalid_token');
  }

  if (header.alg !== 'HS256') {
    throw new AuthError(`Unsupported token algorithm: ${header.alg}`, 'invalid_token');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signed = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlDecode(signaturePart),
    signed
  );

  if (!valid) {
    throw new AuthError('Invalid token signature', 'invalid_token');
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart)));
  } catch {
    throw new AuthError('Malformed token payload', 'invalid_token');
  }

  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
    throw new AuthError('Token expired', 'token_expired');
  }

  return payload;
}

export interface AuthenticatedUser {
  id: string;
  name?: string;
  email?: string;
}

const devAuthEnabled = (): boolean =>
  process.env.ALLOW_DEV_AUTH === 'true' || process.env.NODE_ENV === 'test';

const DEV_USER_ID =
  process.env.DEV_USER_ID ?? '00000000-0000-0000-0000-000000000001';

/** Extracts and validates the caller from the Authorization header. */
export async function authenticate(
  authorization: string | null | undefined
): Promise<AuthenticatedUser> {
  if (!authorization) {
    if (devAuthEnabled()) {
      return { id: DEV_USER_ID, name: 'Dev ASHA' };
    }
    throw new AuthError('Missing Authorization header', 'missing_token');
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  const token = match?.[1]?.trim();

  if (!token) {
    throw new AuthError('Malformed Authorization header', 'invalid_token');
  }

  // Development shortcut: a bare UUID acts as the user id.
  if (isUuid(token)) {
    if (!devAuthEnabled()) {
      throw new AuthError('Raw user ids are only accepted in dev mode', 'invalid_token');
    }
    return { id: token };
  }

  const secret = process.env.NEON_AUTH_SECRET;
  if (!secret) {
    throw new AuthError('NEON_AUTH_SECRET is not configured', 'auth_not_configured', 500);
  }

  const payload = await verifyJwt(token, secret);
  if (!payload.sub || !isUuid(payload.sub)) {
    throw new AuthError('Token does not contain a valid subject', 'invalid_token');
  }

  return { id: payload.sub, name: payload.name, email: payload.email };
}
