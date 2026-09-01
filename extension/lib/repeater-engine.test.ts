// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runRepeaterEngine } from "./repeater-engine";
import type { SiteRepeaterRule } from "./types";

const tencentFixture = readFileSync(
  resolve(process.cwd(), "fixtures/tencent-repeater.html"),
  "utf8",
);
const jdFixture = readFileSync(
  resolve(process.cwd(), "fixtures/jd-repeater.html"),
  "utf8",
);

afterEach(() => {
  document.body.innerHTML = "";
});

describe("runRepeaterEngine", () => {
  it("clicks Tencent's inner action node until work rows match the profile", async () => {
    document.body.innerHTML = tencentFixture;
    const action = document.querySelector<HTMLElement>(
      ".experience-message .add-text.experience",
    )!;
    action.addEventListener("click", () => {
      const row = document.createElement("div");
      row.className = "create-empirical";
      document
        .querySelector(".experience-message .add-experience")!
        .before(row);
    });
    const rules: SiteRepeaterRule[] = [
      {
        profilePath: "experiences",
        rowSelector: ".experience-message .create-empirical",
        addButtonSelectors: [
          ".experience-message > .add-experience .add-text.experience",
          ".experience-message > .add-experience",
        ],
        renderTimeoutMs: 20,
      },
    ];

    const result = await runRepeaterEngine(rules, { experiences: 4 });

    expect(document.querySelectorAll(".create-empirical")).toHaveLength(4);
    expect(result.diagnostics[0]).toMatchObject({
      desired: 4,
      initial: 1,
      current: 4,
      added: 3,
      attempts: 3,
      status: "complete",
      selectorUsed:
        ".experience-message > .add-experience .add-text.experience",
    });
  });

  it("supports JD's nested native button", async () => {
    document.body.innerHTML = jdFixture;
    document
      .querySelector<HTMLElement>(".work-exp .add-btn button")!
      .addEventListener("click", () => {
        const row = document.createElement("div");
        row.className = "cont-item";
        document.querySelector(".work-exp .add-btn")!.before(row);
      });
    const rules: SiteRepeaterRule[] = [
      {
        profilePath: "experiences",
        rowSelector: ".work-exp .cont-item",
        addButtonSelectors: [".work-exp .add-btn button", ".work-exp .add-btn"],
        renderTimeoutMs: 20,
      },
    ];

    const result = await runRepeaterEngine(rules, { experiences: 3 });

    expect(result.diagnostics[0]).toMatchObject({
      current: 3,
      added: 2,
      status: "complete",
    });
  });

  it("reports a structured reason when the add control does not respond", async () => {
    document.body.innerHTML = tencentFixture;
    const result = await runRepeaterEngine(
      [
        {
          profilePath: "experiences",
          rowSelector: ".experience-message .create-empirical",
          addButtonSelectors: [".experience-message .add-text.experience"],
          renderTimeoutMs: 20,
        },
      ],
      { experiences: 2 },
    );

    expect(result.diagnostics[0]).toMatchObject({
      initial: 1,
      current: 1,
      status: "button_unresponsive",
      failureReason: "button_unresponsive",
    });
  });

  it("reports a missing add control without throwing", async () => {
    document.body.innerHTML = '<div class="create-empirical"></div>';
    const result = await runRepeaterEngine(
      [
        {
          profilePath: "experiences",
          rowSelector: ".create-empirical",
          addButtonSelectors: [".missing-add-button"],
          renderTimeoutMs: 20,
        },
      ],
      { experiences: 2 },
    );

    expect(result.diagnostics[0]).toMatchObject({
      status: "button_not_found",
      failureReason: "button_not_found",
      attempts: 0,
    });
  });
});
