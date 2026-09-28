import {
  baseMimeType,
  containerMatchesMime,
  isAllowedMimeType,
  sniffContainer,
} from "./constraints";

const bytes = (...head: number[]) => new Uint8Array([...head, ...new Array(16).fill(0)]);

describe("recording constraints", () => {
  it("normalises mime types with codecs", () => {
    expect(baseMimeType("video/webm;codecs=vp8,opus")).toBe("video/webm");
    expect(baseMimeType(" Audio/WebM ")).toBe("audio/webm");
  });

  it("allows only the right mime types per kind", () => {
    expect(isAllowedMimeType("VIDEO", "video/webm;codecs=vp9")).toBe(true);
    expect(isAllowedMimeType("VIDEO", "audio/webm")).toBe(false);
    expect(isAllowedMimeType("AUDIO", "audio/mp4")).toBe(true);
    expect(isAllowedMimeType("AUDIO", "application/pdf")).toBe(false);
    expect(isAllowedMimeType("AUDIO", "text/html")).toBe(false);
  });

  it("sniffs containers from magic bytes", () => {
    expect(sniffContainer(bytes(0x1a, 0x45, 0xdf, 0xa3))).toBe("webm");
    expect(sniffContainer(bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70))).toBe("mp4");
    expect(sniffContainer(bytes(0x4f, 0x67, 0x67, 0x53))).toBe("ogg");
    expect(sniffContainer(bytes(0x52, 0x49, 0x46, 0x46))).toBe("wav");
    expect(sniffContainer(bytes(0x49, 0x44, 0x33))).toBe("mp3");
    expect(sniffContainer(bytes(0x25, 0x50, 0x44, 0x46))).toBeNull(); // %PDF
    expect(sniffContainer(new Uint8Array(3))).toBeNull();
  });

  it("checks container/mime agreement", () => {
    expect(containerMatchesMime("webm", "audio/webm;codecs=opus")).toBe(true);
    expect(containerMatchesMime("mp4", "audio/mp4")).toBe(true);
    expect(containerMatchesMime("webm", "video/mp4")).toBe(false);
    expect(containerMatchesMime(null, "video/webm")).toBe(false);
  });
});
