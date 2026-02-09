export const DB_NAME = 'medlux_suite_db';
export const DB_VERSION = 1;

const encoder = new TextEncoder();

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('users')) {
        const users = db.createObjectStore('users', { keyPath: 'user_id' });
        users.createIndex('role', 'role', { unique: false });
      }

      if (!db.objectStoreNames.contains('equipamentos')) {
        const equipamentos = db.createObjectStore('equipamentos', { keyPath: 'id' });
        equipamentos.createIndex('tipo', 'tipo', { unique: false });
        equipamentos.createIndex('modelo', 'modelo', { unique: false });
      }

      if (!db.objectStoreNames.contains('vinculos')) {
        const vinculos = db.createObjectStore('vinculos', { keyPath: 'id' });
        vinculos.createIndex('user_id', 'user_id', { unique: false });
        vinculos.createIndex('equip_id', 'equip_id', { unique: false });
        vinculos.createIndex('ativo', 'ativo', { unique: false });
      }

      if (!db.objectStoreNames.contains('medicoes')) {
        const medicoes = db.createObjectStore('medicoes', { keyPath: 'id', autoIncrement: true });
        medicoes.createIndex('user_id', 'user_id', { unique: false });
        medicoes.createIndex('equip_id', 'equip_id', { unique: false });
        medicoes.createIndex('data_hora', 'data_hora', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function normalizeUserId(userId) {
  return userId.trim().toUpperCase();
}

export async function generateSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return toBase64(salt);
}

export async function hashPin(pin, saltBase64) {
  const salt = saltBase64 ? fromBase64(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return {
    salt: toBase64(salt),
    hash: toBase64(bits),
  };
}

export async function verifyPin(pin, saltBase64, expectedHash) {
  const derived = await hashPin(pin, saltBase64);
  return derived.hash === expectedHash;
}

export async function ensureAdminUser(db) {
  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  const existing = await new Promise((resolve) => {
    const request = store.get('RANIERI');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });

  if (!existing) {
    const pinData = await hashPin('2308');
    store.put({
      user_id: 'RANIERI',
      nome: 'Ranieri',
      role: 'admin',
      pin_salt: pinData.salt,
      pin_hash: pinData.hash,
      created_at: new Date().toISOString(),
    });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function readAll(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
