import { expect, test } from "./fixtures";

test("the app is installable: manifest and icons are served", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const json = await manifest.json();
  expect(json.display).toBe("standalone");
  expect(json.start_url).toBe("/dashboard");

  for (const icon of json.icons as { src: string; sizes: string }[]) {
    const res = await request.get(icon.src);
    expect(res.status(), icon.src).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  }
  expect((await request.get("/apple-icon")).status()).toBe(200);
});
