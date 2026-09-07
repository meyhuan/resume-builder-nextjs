import { expect, it } from "vitest";
import { datePolicyKey, readDatePolicy, writeDatePolicy } from "./date-policy";

it("remembers consent only on the exact origin and resets to asking", async () => {
  const values: Record<string, unknown> = {};
  const storage = {
    get: async (key: string) => ({ [key]: values[key] }),
    set: async (items: Record<string, unknown>) => { Object.assign(values, items); },
    remove: async (key: string) => { delete values[key]; },
  };
  const site = "https://careers.example/resume?job=1";
  expect(await readDatePolicy(storage, site)).toBe("ask");
  await writeDatePolicy(storage, site, "first-day");
  expect(await readDatePolicy(storage, "https://careers.example/other")).toBe("first-day");
  expect(await readDatePolicy(storage, "https://other.example/resume")).toBe("ask");
  expect(await readDatePolicy(storage, "http://careers.example/resume")).toBe("ask");
  await writeDatePolicy(storage, site, "manual");
  expect(await readDatePolicy(storage, site)).toBe("manual");
  await writeDatePolicy(storage, site, "ask");
  expect(await readDatePolicy(storage, site)).toBe("ask");
  await expect(writeDatePolicy(storage, site, "yes")).rejects.toThrow();
  values[datePolicyKey(site)] = true;
  expect(await readDatePolicy(storage, site)).toBe("ask");
  expect(() => datePolicyKey("chrome://extensions")).toThrow();
});
