import { openDB, type IDBPDatabase } from "idb";
import type { FontProject } from "./font-types";

const DB_NAME = "glyph-studio";
const DB_VERSION = 1;
const STORE = "fonts";

let dbp: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbp;
}

export async function listFonts(): Promise<FontProject[]> {
  return (await (await db()).getAll(STORE)) as FontProject[];
}

export async function loadFont(id: string): Promise<FontProject | undefined> {
  return (await (await db()).get(STORE, id)) as FontProject | undefined;
}

export async function saveFont(font: FontProject): Promise<void> {
  await (await db()).put(STORE, font);
}

export async function deleteFont(id: string): Promise<void> {
  await (await db()).delete(STORE, id);
}
