const DB_NAME = "limitless-coaching-v1";
const DB_VERSION = 1;

type StoreName = "programWeeks" | "programNav" | "programEditQueue";

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("indexedDB unavailable"));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("programWeeks")) {
        db.createObjectStore("programWeeks");
      }
      if (!db.objectStoreNames.contains("programNav")) {
        db.createObjectStore("programNav");
      }
      if (!db.objectStoreNames.contains("programEditQueue")) {
        db.createObjectStore("programEditQueue");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB open failed"));
  });
}

export async function idbGet<T>(store: StoreName, key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const request = tx.objectStore(store).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function idbSet<T>(store: StoreName, key: string, value: T): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(store).put(value, key);
    });
  } catch {
    // Best-effort local cache.
  }
}

export async function idbDelete(store: StoreName, key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(store).delete(key);
    });
  } catch {
    // Best-effort local cache.
  }
}

export async function idbGetAllKeys(store: StoreName): Promise<string[]> {
  try {
    const db = await openDb();
    return await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const request = tx.objectStore(store).getAllKeys();
      request.onsuccess = () =>
        resolve((request.result as IDBValidKey[]).map(String));
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}
