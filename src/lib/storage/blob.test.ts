import { BlobNotFoundError } from "@vercel/blob";
import { describe, expect, it, vi } from "vitest";

import { type BlobApi, createBlobDriver, sliceStream } from "./blob";

// "server-only" throws outside React Server Components; it's a no-op here.
vi.mock("server-only", () => ({}));

function fakeApi() {
  const files = new Map<string, Uint8Array>();
  const api = {
    put: vi.fn(async (key: string, body: Buffer, _options: object) => {
      files.set(key, new Uint8Array(body));
      return {} as never;
    }),
    get: vi.fn(async (key: string) => {
      const data = files.get(key);
      if (!data) return null;
      return {
        statusCode: 200,
        headers: new Headers(),
        stream: new Blob([new Uint8Array(data)]).stream(),
      } as never;
    }),
    head: vi.fn(async (key: string) => {
      const data = files.get(key);
      if (!data) throw new BlobNotFoundError();
      return { size: data.byteLength } as never;
    }),
    del: vi.fn(async (keys: string | string[]) => {
      for (const k of [keys].flat()) files.delete(k);
    }),
    list: vi.fn(async ({ prefix = "" }: { prefix?: string } = {}) => ({
      blobs: [...files.keys()]
        .filter((k) => k.startsWith(prefix))
        .map((pathname) => ({ pathname })),
      hasMore: false,
    })),
  };
  return { api: api as unknown as BlobApi, files, raw: api };
}

describe("blob storage driver", () => {
  it("stores privately and reads back the same bytes", async () => {
    const { api, raw } = fakeApi();
    const storage = createBlobDriver(api);
    await storage.put("recordings/u1/s1/a.webm", new Uint8Array([1, 2, 3]), "audio/webm");

    expect(raw.put.mock.calls[0]![2]).toMatchObject({ access: "private", addRandomSuffix: false });
    expect([...(await storage.get("recordings/u1/s1/a.webm"))]).toEqual([1, 2, 3]);
    expect(await storage.exists("recordings/u1/s1/a.webm")).toBe(true);
  });

  it("reports missing files as NOT_FOUND / false", async () => {
    const storage = createBlobDriver(fakeApi().api);
    await expect(storage.get("recordings/u1/s1/missing.webm")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await storage.exists("recordings/u1/s1/missing.webm")).toBe(false);
  });

  it("deletes everything under a user's prefix and nothing else", async () => {
    const { api, files } = fakeApi();
    const storage = createBlobDriver(api);
    await storage.put("recordings/u1/s1/a.webm", new Uint8Array([1]), "audio/webm");
    await storage.put("recordings/u1/s2/b.webm", new Uint8Array([2]), "audio/webm");
    await storage.put("recordings/u2/s3/c.webm", new Uint8Array([3]), "audio/webm");

    await storage.deletePrefix("recordings/u1/");
    expect([...files.keys()]).toEqual(["recordings/u2/s3/c.webm"]);
  });

  it("rejects unsafe keys and prefixes", async () => {
    const storage = createBlobDriver(fakeApi().api);
    await expect(storage.get("../secret.txt")).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(storage.deletePrefix("")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("reports sizes and streams byte ranges", async () => {
    const { api } = fakeApi();
    const storage = createBlobDriver(api);
    await storage.put("recordings/u1/s1/a.webm", new Uint8Array([0, 1, 2, 3, 4, 5]), "audio/webm");

    expect(await storage.stat("recordings/u1/s1/a.webm")).toEqual({ size: 6 });
    expect(await storage.stat("recordings/u1/s1/missing.webm")).toBeNull();
    const part = await storage.openRead("recordings/u1/s1/a.webm", { start: 2, end: 4 });
    expect([...new Uint8Array(await new Response(part).arrayBuffer())]).toEqual([2, 3, 4]);
  });
});

describe("sliceStream", () => {
  const chunks = (...parts: number[][]) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        for (const p of parts) c.enqueue(new Uint8Array(p));
        c.close();
      },
    });
  const read = async (s: ReadableStream<Uint8Array>) => [
    ...new Uint8Array(await new Response(s).arrayBuffer()),
  ];

  it("cuts a range that spans chunk boundaries", async () => {
    expect(
      await read(sliceStream(chunks([0, 1, 2], [3, 4], [5, 6, 7]), { start: 2, end: 5 })),
    ).toEqual([2, 3, 4, 5]);
  });

  it("handles ranges past the end of the data", async () => {
    expect(await read(sliceStream(chunks([0, 1], [2]), { start: 1, end: 99 }))).toEqual([1, 2]);
  });
});
