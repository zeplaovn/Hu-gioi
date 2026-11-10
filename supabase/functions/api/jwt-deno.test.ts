/* Deno Edge JWT compatibility: synthetic ES256 only, never real tokens. */
import { createJwtVerifier } from './game.bundle.mjs';
const te = new TextEncoder();
const b64 = (value: Uint8Array): string => btoa(String.fromCharCode(...value))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const json64 = (obj: unknown): string => b64(te.encode(JSON.stringify(obj)));
Deno.test('Deno verifies genuine ES256/JWKS token with full Supabase claims and rejects forgery', async () => {
  const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
  const kid = 'synthetic-key-id';
  const issuer = 'https://synthetic.supabase.co/auth/v1';
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: '11111111-2222-4333-8444-555555555555',
    aud: 'authenticated', iss: issuer, exp: now + 3600, iat: now, role: 'authenticated',
    session_id: '22222222-3333-4444-8555-666666666666' };
  const unsigned = json64({ alg: 'ES256', typ: 'JWT', kid }) + '.' + json64(payload);
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, te.encode(unsigned)));
  if (signature.length !== 64) throw Error('WebCrypto ES256 must emit 64-byte P1363 signature');
  const token = unsigned + '.' + b64(signature);
  let calls = 0;
  const verifier = createJwtVerifier({
    jwksUrl: issuer + '/.well-known/jwks.json', issuer,
    fetchImpl: async () => { calls++; return { ok: true,
      json: async () => ({ keys: [{ ...jwk, kid, use: 'sig', alg: 'ES256' }] }) }; }
  });
  const claims = await verifier.verify(token);
  if (claims.sub !== payload.sub || calls !== 1) throw Error('ES256 claims incorrect or JWKS refetched');
  const forged = unsigned + '.' + b64(new Uint8Array(64));
  let rejected = false;
  try { await verifier.verify(forged); } catch (e) {
    rejected = (e as { code?: string }).code === 'UNAUTHENTICATED';
  }
  if (!rejected) throw Error('Forged ES256 token must be rejected');
});
