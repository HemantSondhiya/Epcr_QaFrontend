/**
 * offlineAuth.js
 * ─────────────────────────────────────────────────────────
 * Secure Offline Credential Vault for Paramedic / Staff login.
 *
 * SECURITY DESIGN:
 *  - Raw passwords are NEVER stored anywhere.
 *  - We derive a salted PBKDF2 hash (100,000 iterations, SHA-256) of the
 *    password and store only that hash alongside the user profile.
 *  - The vault lives in sessionStorage → auto-wiped when the tab/browser closes.
 *  - A separate localStorage flag records whether the vault was seeded
 *    (so we know offline login is available), but contains zero PHI / credentials.
 *  - Only STAFF (paramedic / clinical) roles can use offline login.
 *    Patient OTP login always requires network — OTP cannot be pre-cached.
 * ─────────────────────────────────────────────────────────
 */

const SESSION_KEY  = 'epcr.offline.vault';       // sessionStorage — cleared on tab close
const FLAG_KEY     = 'epcr.offline.available';    // localStorage  — boolean only, no PHI
const SALT_ROUNDS  = 100_000;                     // PBKDF2 iterations
const HASH_ALGO    = 'SHA-256';
const KEY_LENGTH   = 256;                         // bits

// ── Crypto helpers ──────────────────────────────────────

/**
 * Derive a PBKDF2 key from a password + salt string.
 * Returns the hash as a hex string.
 */
async function deriveHash(password, saltHex) {
  const enc     = new TextEncoder();
  const keyMat  = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );

  const saltBuf = hexToBuffer(saltHex);
  const bits    = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuf, iterations: SALT_ROUNDS, hash: HASH_ALGO },
    keyMat,
    KEY_LENGTH,
  );

  return bufferToHex(new Uint8Array(bits));
}

function bufferToHex(buf) {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function generateSalt() {
  return bufferToHex(crypto.getRandomValues(new Uint8Array(16)));
}

// ── Vault read / write ──────────────────────────────────

function readVault() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeVault(data) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    localStorage.setItem(FLAG_KEY, '1');   // mark as available (no PHI)
  } catch (e) {
    // Ignore
  }
}

// ── Public API ───────────────────────────────────────────

/**
 * Called after a SUCCESSFUL online login.
 * Derives and stores a secure hash of the user's password.
 *
 * @param {string} email      - user email
 * @param {string} password   - plaintext password (only used here to derive hash, never stored)
 * @param {object} userProfile - { userId, email, firstName, lastName, role, organizationId, accessToken, refreshToken, ... }
 */
export async function seedOfflineVault(email, password, userProfile) {
  if (!userProfile?.role || userProfile.role === 'PATIENT') {
    return;
  }

  const salt     = generateSalt();
  const hashHex  = await deriveHash(password, salt);

  const safeProfile = {
    userId:         userProfile.userId || userProfile.id,
    id:             userProfile.id     || userProfile.userId,
    email:          userProfile.email  || email,
    firstName:      userProfile.firstName  || '',
    lastName:       userProfile.lastName   || '',
    role:           userProfile.role,
    organizationId: userProfile.organizationId || null,
    accessToken:    userProfile.accessToken  || null,
    refreshToken:   userProfile.refreshToken || null,
    isOfflineSession: false,
    seededAt: Date.now(),
  };

  writeVault({ email: email.toLowerCase().trim(), salt, hashHex, profile: safeProfile });
}

/**
 * Attempt offline login.
 * Derives the PBKDF2 hash of the entered password and compares with stored hash.
 *
 * @param {string} email    - entered email
 * @param {string} password - entered password
 * @returns {{ success: true, user: object } | { success: false, reason: string }}
 */
export async function attemptOfflineLogin(email, password) {
  const vault = readVault();

  if (!vault) {
    return { success: false, reason: 'no_vault' };
  }

  const normalised = email.toLowerCase().trim();
  if (vault.email !== normalised) {
    return { success: false, reason: 'email_mismatch' };
  }

  const hashHex = await deriveHash(password, vault.salt);
  if (hashHex !== vault.hashHex) {
    return { success: false, reason: 'wrong_password' };
  }

  const AGE_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 hours
  if (Date.now() - vault.profile.seededAt > AGE_LIMIT_MS) {
    clearOfflineVault();
    return { success: false, reason: 'vault_expired' };
  }

  return {
    success: true,
    user: {
      ...vault.profile,
      isOfflineSession: true,
    },
  };
}

/**
 * Returns true if offline login is potentially available.
 * Only checks the localStorage flag — never reads sensitive vault data.
 */
export function isOfflineLoginAvailable() {
  const flagVal = localStorage.getItem(FLAG_KEY);
  const sessionVal = sessionStorage.getItem(SESSION_KEY);
  return flagVal === '1' && !!sessionVal;
}

/**
 * Wipes the offline vault entirely.
 * Called on explicit logout or when token expiry is detected.
 */
export function clearOfflineVault() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(FLAG_KEY);
  } catch (e) {
    // Ignore
  }
}

/**
 * Returns the email of the cached user (for pre-filling the offline login form).
 * Safe: returns only the email string, not the hash or profile.
 */
export function getOfflineCachedEmail() {
  const vault = readVault();
  return vault?.email || null;
}

/**
 * Returns the display name of the cached user (for the offline UI greeting).
 */
export function getOfflineCachedName() {
  const vault = readVault();
  if (!vault?.profile) return null;
  const { firstName, lastName } = vault.profile;
  return [firstName, lastName].filter(Boolean).join(' ') || null;
}
