#!/usr/bin/env node
// Generates a PBKDF2 hash compatible with worker/admin-console/crypto.ts.
// Usage: node scripts/admin-hash-password.mjs 'your-password'
// Paste the output into BOOTSTRAP_PASSWORD_HASH in worker/admin-console/auth.ts
// (only matters before the first login — afterwards the password lives in D1).
import { webcrypto as crypto } from "node:crypto";
const password = process.argv[2];
if (!password) { console.error("Usage: node scripts/admin-hash-password.mjs '<password>'"); process.exit(1); }
const iterations = 100000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
const b64 = (u) => Buffer.from(u).toString("base64");
console.log(`pbkdf2-sha256$${iterations}$${b64(salt)}$${b64(bits)}`);
