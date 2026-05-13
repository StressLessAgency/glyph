import { deflate } from "pako";

/**
 * Wrap an SFNT (OTF/TTF) ArrayBuffer in a WOFF1 container.
 * Spec: https://www.w3.org/TR/WOFF/
 */
export function sfntToWoff(sfnt: ArrayBuffer): ArrayBuffer {
  const src = new DataView(sfnt);
  const sfntVersion = src.getUint32(0);
  const numTables = src.getUint16(4);

  interface Table {
    tag: number;
    origOffset: number;
    origLength: number;
    origChecksum: number;
    compData: Uint8Array;
    compLength: number;
    newOffset: number;
  }
  const tables: Table[] = [];
  const HEADER = 12 + numTables * 16; // WOFF header + dir entries
  let currOffset = HEADER;

  for (let i = 0; i < numTables; i++) {
    const entry = 12 + i * 16;
    const tag = src.getUint32(entry);
    const checksum = src.getUint32(entry + 4);
    const offset = src.getUint32(entry + 8);
    const length = src.getUint32(entry + 12);
    const tableData = new Uint8Array(sfnt, offset, length);
    let comp = deflate(tableData);
    let compLength = comp.length;
    if (compLength >= length) {
      comp = tableData;
      compLength = length;
    }
    tables.push({
      tag,
      origOffset: offset,
      origLength: length,
      origChecksum: checksum,
      compData: comp,
      compLength,
      newOffset: currOffset,
    });
    currOffset += compLength;
    if (currOffset % 4 !== 0) currOffset += 4 - (currOffset % 4);
  }

  const totalSfntSize = sfnt.byteLength;
  const woff = new ArrayBuffer(currOffset);
  const view = new DataView(woff);
  const out = new Uint8Array(woff);

  // WOFF header
  view.setUint32(0, 0x774f4646); // "wOFF"
  view.setUint32(4, sfntVersion);
  view.setUint32(8, currOffset); // length
  view.setUint16(12, numTables);
  view.setUint16(14, 0);
  view.setUint32(16, totalSfntSize);
  view.setUint16(20, 0); // majorVersion
  view.setUint16(22, 0); // minorVersion
  view.setUint32(24, 0); // metaOffset
  view.setUint32(28, 0); // metaLength
  view.setUint32(32, 0); // metaOrigLength
  view.setUint32(36, 0); // privOffset
  view.setUint32(40, 0); // privLength

  for (let i = 0; i < numTables; i++) {
    const t = tables[i];
    const entry = 44 + i * 20;
    view.setUint32(entry, t.tag);
    view.setUint32(entry + 4, t.newOffset);
    view.setUint32(entry + 8, t.compLength);
    view.setUint32(entry + 12, t.origLength);
    view.setUint32(entry + 16, t.origChecksum);
    out.set(t.compData, t.newOffset);
  }
  return woff;
}

/**
 * Compress SFNT into WOFF2. Dynamically loads wawoff2 via the public CDN to
 * avoid pulling its emscripten module + node fs polyfills into the bundle.
 */
let _wawoffPromise: Promise<{ compress: (b: Uint8Array) => Promise<Uint8Array> }> | null = null;

async function loadWawoff() {
  if (_wawoffPromise) return _wawoffPromise;
  _wawoffPromise = (async () => {
    const url = "https://cdn.jsdelivr.net/npm/wawoff2@2.0.1/+esm";
    const mod = (await import(/* webpackIgnore: true */ /* @vite-ignore */ url)) as {
      default?: { compress: (b: Uint8Array) => Promise<Uint8Array> };
      compress?: (b: Uint8Array) => Promise<Uint8Array>;
    };
    const w = mod.default ?? { compress: mod.compress! };
    return w;
  })();
  return _wawoffPromise;
}

export async function sfntToWoff2(sfnt: ArrayBuffer): Promise<ArrayBuffer> {
  const wawoff = await loadWawoff();
  const out = await wawoff.compress(new Uint8Array(sfnt));
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

export function downloadBlob(data: ArrayBuffer, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
