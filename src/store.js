// On-device storage only (IndexedDB, in-memory fallback). Nothing here touches the network.
const DB = "vespa-control";
const VER = 1;
const STORES = ["records", "stations"];
let dbp = null;
const mem = { records: new Map(), stations: new Map() };

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const out = fn(t.objectStore(store));
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  });
}

export async function all(store) {
  const db = await open();
  if (!db) return [...mem[store].values()];
  return tx(db, store, "readonly", (s) => s.getAll());
}

export async function put(store, items) {
  const list = Array.isArray(items) ? items : [items];
  const db = await open();
  if (!db) {
    list.forEach((r) => mem[store].set(r.id, r));
    return;
  }
  await tx(db, store, "readwrite", (s) => list.forEach((r) => s.put(r)));
}

export async function remove(store, id) {
  const db = await open();
  if (!db) {
    mem[store].delete(id);
    return;
  }
  await tx(db, store, "readwrite", (s) => s.delete(id));
}

export async function clearAll() {
  const db = await open();
  for (const s of STORES) {
    mem[s].clear();
    if (db) await tx(db, s, "readwrite", (st) => st.clear());
  }
  try {
    Object.keys(localStorage).filter((k) => k.startsWith("vc.")).forEach((k) => localStorage.removeItem(k));
  } catch {}
}

export function getSetting(key, fallback) {
  try {
    const v = localStorage.getItem("vc." + key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function setSetting(key, value) {
  try {
    localStorage.setItem("vc." + key, JSON.stringify(value));
  } catch {}
}
