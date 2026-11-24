import assert from "node:assert/strict";

const store = new Map<string, string>();

const storage: Storage = {
  get length() {
    return store.size;
  },
  clear() {
    store.clear();
  },
  getItem(key) {
    return store.get(key) ?? null;
  },
  key(index) {
    return [...store.keys()][index] ?? null;
  },
  removeItem(key) {
    store.delete(key);
  },
  setItem(key, value) {
    store.set(key, value);
  },
};

(globalThis as unknown as { window: typeof globalThis }).window = globalThis;
(globalThis as unknown as { sessionStorage: Storage }).sessionStorage = storage;

async function main() {
const {
  cacheAthleteProgramHref,
  clearAthleteProgramHrefSession,
  readAthleteProgramHrefSession,
  readAthleteProgramWeekIdSession,
} = await import("../lib/programEntrySessionCache");

const href = "/programs/block-1/weeks/week-2?focusDay=day-9";

cacheAthleteProgramHref(href);
assert.equal(readAthleteProgramHrefSession(), href);
assert.equal(readAthleteProgramWeekIdSession(), "week-2");

store.set("lc:athlete-program-href", href);
assert.equal(readAthleteProgramHrefSession(), null);
assert.equal(store.has("lc:athlete-program-href"), false);

cacheAthleteProgramHref(href);
const cached = JSON.parse(store.get("lc:athlete-program-href") || "{}") as {
  href: string;
  day: string;
};
cached.day = "2000-01-01";
store.set("lc:athlete-program-href", JSON.stringify(cached));
assert.equal(readAthleteProgramHrefSession(), null);
assert.equal(readAthleteProgramWeekIdSession(), null);

clearAthleteProgramHrefSession();
assert.equal(readAthleteProgramHrefSession(), null);

console.log("program-entry-session-cache.test.ts ok");
}

void main();
