import type {
  RepeaterDiagnostic,
  RepeaterExecutionSummary,
  SiteRepeaterRule,
} from "./types";

/**
 * Runs inside the page. Keep this function self-contained so it can be passed
 * directly to browser.scripting.executeScript in the MAIN world.
 */
export async function runRepeaterEngine(
  rules: SiteRepeaterRule[],
  desiredCounts: Record<string, number>,
): Promise<RepeaterExecutionSummary> {
  const diagnostics: RepeaterDiagnostic[] = [];
  let addedRows = 0;

  const countRows = (selector: string): number =>
    document.querySelectorAll(selector).length;

  const waitForGrowth = async (
    selector: string,
    previousCount: number,
    timeoutMs: number,
  ): Promise<number> => {
    const deadline = Date.now() + timeoutMs;
    let count = countRows(selector);
    while (count <= previousCount && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      count = countRows(selector);
    }
    return count;
  };

  const clickCandidates = (element: HTMLElement): HTMLElement[] => {
    const descendants = [
      ...element.querySelectorAll<HTMLElement>(
        "button, [role='button'], a, input[type='button'], input[type='submit'], p, span",
      ),
    ].reverse();
    return [...new Set([...descendants, element])];
  };

  const canClick = (element: HTMLElement): boolean => {
    const input = element as HTMLButtonElement;
    const style = window.getComputedStyle(element);
    return (
      !input.disabled &&
      element.getAttribute("aria-disabled") !== "true" &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  };

  for (const rule of rules) {
    const desired = Math.min(
      Math.max(0, Number(desiredCounts[rule.profilePath]) || 0),
      rule.maxRows || 10,
    );
    const initial = countRows(rule.rowSelector);
    let current = initial;
    let attempts = 0;
    let selectorUsed: string | undefined;
    let failureReason: RepeaterDiagnostic["failureReason"];

    if (desired === 0) {
      diagnostics.push({
        profilePath: rule.profilePath,
        desired,
        initial,
        current,
        added: 0,
        attempts,
        status: "no_profile_rows",
      });
      continue;
    }

    if (current >= desired) {
      diagnostics.push({
        profilePath: rule.profilePath,
        desired,
        initial,
        current,
        added: 0,
        attempts,
        status: "not_needed",
      });
      continue;
    }

    while (current < desired) {
      let foundClickableTarget = false;
      let grew = false;

      for (const selector of rule.addButtonSelectors) {
        const configuredTargets = [
          ...document.querySelectorAll<HTMLElement>(selector),
        ];
        for (const configuredTarget of configuredTargets) {
          for (const target of clickCandidates(configuredTarget)) {
            if (!canClick(target)) continue;
            foundClickableTarget = true;
            attempts += 1;
            target.click();
            const next = await waitForGrowth(
              rule.rowSelector,
              current,
              rule.renderTimeoutMs || 1_000,
            );
            if (next > current) {
              addedRows += next - current;
              current = next;
              selectorUsed = selector;
              grew = true;
              break;
            }
          }
          if (grew) break;
        }
        if (grew) break;
      }

      if (!grew) {
        failureReason = foundClickableTarget
          ? "button_unresponsive"
          : "button_not_found";
        break;
      }
    }

    diagnostics.push({
      profilePath: rule.profilePath,
      desired,
      initial,
      current,
      added: current - initial,
      attempts,
      status:
        current >= desired
          ? "complete"
          : current > initial
            ? "partial"
            : failureReason || "button_unresponsive",
      failureReason,
      selectorUsed,
    });
  }

  return { addedRows, diagnostics };
}
