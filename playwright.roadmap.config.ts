import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "roadmap.e2e.spec.ts",
  timeout: 45_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.ROADMAP_BASE_URL || "http://127.0.0.1:8787",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent: devices["Pixel 5"].userAgent,
    trace: "retain-on-failure",
  },
});
