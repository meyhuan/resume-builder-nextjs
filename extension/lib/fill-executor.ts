import type { FillAction } from "./types";

export async function applyFillActions(actions: FillAction[], options: { allowMonthStart?: boolean } = {}): Promise<{
  filled: number;
  alreadyFilled: number;
  failedCount: number;
  failed: string[];
  controlMetrics: Record<string, number>;
}> {
  let filled = 0;
  let alreadyFilled = 0;
  const failed: string[] = [];
  const controlMetrics: Record<string, number> = {};
  const dailyCalendarFamilies = new Set<string>();
  let popupBlocked = false;
  // Generic choice flow adapted from OpenJobAutofill (MIT).
  // Locally scoped options and verified selected values replace its search-input fallback.
  // Keep every helper inside the function for Chrome executeScript serialization.
  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const isVisible = (el: Element): boolean => {
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (
        node.hasAttribute("hidden") ||
        node.getAttribute("aria-hidden") === "true" ||
        style.display === "none" ||
        style.visibility === "hidden"
      )
        return false;
    }
    return el.getClientRects().length > 0;
  };
  const normalize = (value: string): string =>
    value.toLowerCase().replace(/[\s:：*＊()（）_\-/]/g, "");
  // Component-level drivers, not site rules. Never force-write readonly fields.
  const popupFill = async (element: HTMLElement, value: string, kind: "popup-date" | "cascader"): Promise<"filled" | "existing" | "failed"> => {
    const reject = (reason: "InvalidValue" | "PopupUnavailable" | "OptionUnavailable" | "VerificationFailed" | "DatePrecisionMissing" | "PopupCloseFailed"): "failed" => {
      const key = "control" + reason + "Count";
      controlMetrics[key] = (controlMetrics[key] || 0) + 1;
      return "failed";
    };
    const input = element instanceof HTMLInputElement ? element : element.querySelector<HTMLInputElement>('input:not([type="hidden"])');
    const selectedText = () => element.querySelector<HTMLElement>('.ant-select-selection-item,.el-cascader__tags')?.textContent?.trim() || input?.value.trim() || "";
    if (selectedText()) return "existing";
    const enabled = (node: HTMLElement) => isVisible(node) &&
      !node.closest('[aria-disabled="true"],[disabled],[class*="-disabled"],[class*="is-disabled"]');
    const dateParts = (text: string): number[] | null => {
      const match = text.trim().match(/^(\d{4})[-/.年](\d{1,2})(?:[-/.月](\d{1,2}))?日?月?$/);
      if (!match) return null;
      const parts = [Number(match[1]), Number(match[2]), ...(match[3] ? [Number(match[3])] : [])];
      if (parts[1] < 1 || parts[1] > 12 || (parts[2] !== undefined && (parts[2] < 1 || parts[2] > new Date(parts[0], parts[1], 0).getDate()))) return null;
      return parts;
    };
    const requestedDate = kind === "popup-date" ? dateParts(value) : null;
    const family = input?.closest('.kuma-calendar-picker-input') ? 'kuma' : '';
    if (!options.allowMonthStart && requestedDate?.length === 2 && family && dailyCalendarFamilies.has(family)) return reject("DatePrecisionMissing");
    if (popupBlocked) return reject("PopupCloseFailed");
    // Require an explicit path: never infer a province from an ambiguous city.
    const path = value.split(/\s*[/＞>·]\s*/).map((part) => part.trim()).filter(Boolean);
    if (kind === "popup-date" ? !requestedDate : path.length < 2 || path.length > 4) return reject("InvalidValue");
    const popupSelector = kind === "popup-date"
      ? '.ant-picker-dropdown,.ant-calendar,.rc-calendar,.kuma-calendar,.el-picker-panel'
      : '.ant-cascader-dropdown,.ant-cascader-menus,.rc-cascader-menus,.kuma-cascader-menus,.el-cascader__dropdown';
    const before = new Set([...document.querySelectorAll(popupSelector)].filter(isVisible));
    const trigger = element.querySelector<HTMLElement>('[role="combobox"]') || element;
    const ownerIds = () => [element, ...element.querySelectorAll('[aria-controls],[aria-owns]')]
      .flatMap((node) => `${node.getAttribute('aria-controls') || ''} ${node.getAttribute('aria-owns') || ''}`.split(/\s+/)).filter(Boolean);
    const popup = (): HTMLElement | undefined => {
      const owned = ownerIds().map((id) => document.getElementById(id)).filter((node): node is HTMLElement => !!node && isVisible(node));
      const candidates = owned.length ? owned : [...document.querySelectorAll<HTMLElement>(popupSelector)].filter((node) => !before.has(node) && isVisible(node));
      // Nested wrappers are one popup; multiple unrelated popups are ambiguous.
      const outer = candidates.filter((node) => !candidates.some((parent) => parent !== node && parent.contains(node)));
      return outer.length === 1 ? outer[0] : undefined;
    };
    const until = async (predicate: () => boolean, timeout = 450) => {
      const deadline = Date.now() + timeout;
      do { if (predicate()) return true; await wait(40); } while (Date.now() < deadline);
      return predicate();
    };
    const dateMatches = () => {
      const actual = dateParts(input?.value || "");
      return !!actual && actual.length === requestedDate!.length && actual.every((part, index) => part === requestedDate![index]);
    };
    let completedDay = false;
    const verified = (): "filled" => {
      if (completedDay) controlMetrics.dateCompletionAppliedCount = (controlMetrics.dateCompletionAppliedCount || 0) + 1;
      return "filled";
    };
    let openedPanel: HTMLElement | undefined;
    try {
      trigger.click();
      if (!await until(() => !!popup())) return reject("PopupUnavailable");
      openedPanel = popup();
      if (kind === "cascader") {
        const columnSelector = '.ant-cascader-menu,.rc-cascader-menu,.kuma-cascader-menu,.el-cascader-menu';
        const optionSelector = '.ant-cascader-menu-item,.rc-cascader-menu-item,.kuma-cascader-menu-item,.el-cascader-node';
        for (let level = 0; level < path.length; level++) {
          let option: HTMLElement | undefined;
          const found = await until(() => {
            const column = [...(popup()?.querySelectorAll<HTMLElement>(columnSelector) || [])].filter(isVisible)[level];
            const matches = [...(column?.querySelectorAll<HTMLElement>(optionSelector) || [])].filter((node) => {
              const label = node.querySelector('.ant-cascader-menu-item-content,.rc-cascader-menu-item-content,.kuma-cascader-menu-item-content,.el-cascader-node__label');
              return enabled(node) && (label?.textContent || node.getAttribute('title') || node.textContent || '').trim() === path[level];
            });
            option = matches.length === 1 ? matches[0] : undefined;
            return !!option;
          });
          if (!found || !option) return reject("OptionUnavailable");
          option.click();
          await wait(60);
        }
        const correct = await until(() => {
          const actual = selectedText().split(/\s*[/＞>·]\s*/).map((part) => part.trim());
          return actual.length === path.length && actual.every((part, index) => part === path[index]);
        });
        return correct ? "filled" : reject("VerificationFailed");
      }
      const panel = popup()!;
      // Only known day panels need a day. Month pickers keep their precision.
      if (requestedDate!.length === 2 && panel.querySelector('.kuma-calendar-date-panel,.ant-picker-date-panel,.ant-calendar-date-panel,.rc-calendar-date-panel,.el-date-table')) {
        if (family) dailyCalendarFamilies.add(family);
        if (!options.allowMonthStart) return reject("DatePrecisionMissing");
        requestedDate!.push(1);
        completedDay = true;
      }
      // A date input exposed by the calendar itself commits via its own handler.
      const editor = [...panel.querySelectorAll<HTMLInputElement>('input.ant-calendar-input,input.rc-calendar-input,input.kuma-calendar-input')].filter((node) => enabled(node) && !node.readOnly);
      if (editor.length === 1) {
        const target = editor[0];
        const oldValue = target.value;
        const iso = requestedDate!.map((part, i) => i ? String(part).padStart(2, '0') : String(part)).join('-');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(target, iso);
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        // Controlled components need a render before Enter reads their state.
        await wait(80);
        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        if (await until(dateMatches)) return verified();
        if (target.isConnected) {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(target, oldValue);
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return reject("VerificationFailed");
      }
      // Exact full-date cells only; never click a bare day number in another month.
      const cells = [...panel.querySelectorAll<HTMLElement>('td[title],[role="gridcell"][title]')].filter((node) => {
        const parts = dateParts(node.getAttribute('title') || '');
        return enabled(node) && parts?.length === requestedDate!.length && parts.every((part, i) => part === requestedDate![i]);
      });
      if (cells.length === 1) {
        cells[0].click();
        return await until(dateMatches) ? verified() : reject("VerificationFailed");
      }
      return reject("OptionUnavailable");
    } finally {
      openedPanel?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      input?.blur();
      // rc/kuma pickers dismiss on outside mousedown, not trigger blur.
      // Dispatch on the body itself, never on any save/submit control.
      if (openedPanel?.isConnected && isVisible(openedPanel)) {
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        if (!await until(() => !openedPanel?.isConnected || !isVisible(openedPanel))) {
          popupBlocked = true;
          controlMetrics.controlPopupCloseFailedCount = (controlMetrics.controlPopupCloseFailedCount || 0) + 1;
        }
      }
    }
  };
  const chooseOption = (
    container: HTMLElement,
    selector: string,
    value: string,
  ): boolean => {
    const normalizedValue = normalize(value);
    const option = [...container.querySelectorAll<HTMLElement>(selector)].find(
      (candidate) => {
        const text = normalize(candidate.textContent || "");
        return text === normalizedValue || text.includes(normalizedValue);
      },
    );
    option?.click();
    return Boolean(option);
  };
  if (actions.some((action) => action.controlKind === "popup-date")) {
    const oldPanels = [...document.querySelectorAll<HTMLElement>('.kuma-calendar')].filter(isVisible);
    if (oldPanels.some((node) => node.querySelector('.kuma-calendar-date-panel'))) dailyCalendarFamilies.add('kuma');
    if (oldPanels.length) {
      oldPanels.forEach((node) => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, which: 27, bubbles: true })));
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await wait(100);
      // Do not continue opening calendars over an undismissed previous one.
      popupBlocked = oldPanels.some((node) => node.isConnected && isVisible(node));
      if (popupBlocked) controlMetrics.controlPopupCloseFailedCount = 1;
    }
  }
  for (const action of actions) {
    const element = document.querySelector<HTMLElement>(
      `[data-aijianli-field-id="${action.fieldId}"]`,
    );
    if (!element) {
      failed.push(action.context || "页面控件已变化");
      continue;
    }
    const input = element as HTMLInputElement;
    if (action.controlKind === "popup-date" || action.controlKind === "cascader") {
      const prefix = action.controlKind === "popup-date" ? "popupDate" : "cascader";
      controlMetrics[prefix + "AttemptCount"] = (controlMetrics[prefix + "AttemptCount"] || 0) + 1;
      let outcome: "filled" | "existing" | "failed" = "failed";
      const precisionBefore = controlMetrics.controlDatePrecisionMissingCount || 0;
      try { outcome = await popupFill(element, action.value, action.controlKind); } catch {
        // Report a fixed code, never the page's exception text or profile values.
        controlMetrics.controlDriverErrorCount = (controlMetrics.controlDriverErrorCount || 0) + 1;
      }
      const key = prefix + (outcome === "filled" ? "FilledCount" : outcome === "existing" ? "ExistingCount" : "FailedCount");
      controlMetrics[key] = (controlMetrics[key] || 0) + 1;
      if (outcome === "filled") { filled++; element.setAttribute("data-aijianli-filled", "true"); }
      else if (outcome === "existing") alreadyFilled++;
      else if ((controlMetrics.controlDatePrecisionMissingCount || 0) > precisionBefore) {
        failed.push(`${action.context || "日期"}：资料只有年月，此处需要具体日期，请手动选择`);
      } else failed.push(action.context || "控件未确认填写，请手动补充");
      continue;
    }
    let expectedValue = action.value;
    let completedDay = false;
    if (element.isContentEditable && element.textContent?.trim()) {
      alreadyFilled++;
      continue;
    }
    if (["radio", "checkbox"].includes(element.getAttribute("role") || "")) {
      if (element.getAttribute("aria-checked") === "true") {
        alreadyFilled++;
        continue;
      }
      element.click();
      await wait(60);
      if (element.getAttribute("aria-checked") === "true") {
        filled++;
      } else {
        failed.push(action.context || "选项未确认");
      }
      continue;
    }
    if (action.controlKind === "unsupported") {
      failed.push(action.context || "暂不支持的只读控件");
      continue;
    }
    if (action.controlKind === "generic-select") {
      const interaction = element.matches('[role="combobox"]')
        ? element
        : element.querySelector<HTMLElement>('[role="combobox"]') || element;
      const visibleText = (node: Element): string => {
        if (!isVisible(node)) return "";
        return [...node.childNodes].map((child) =>
          child instanceof Element ? visibleText(child) : child.textContent || "",
        ).join("");
      };
      const selectedValue = () => {
        const items = [
          ...element.querySelectorAll<HTMLElement>(
            ".ant-select-selection-item,.el-select__selected-item,.kuma-select2-selection__choice,.kuma-select2-selection-selected-value,[data-selected-value]",
          ),
        ];
        const itemText = items
          .filter(isVisible)
          .map((item) => item.getAttribute("title") || item.textContent || "")
          .join(" ")
          .trim();
        const rendered = element.querySelector(
          ".kuma-select2-selection__rendered,.el-input__inner",
        );
        const text =
          itemText ||
          (rendered instanceof HTMLInputElement
            ? rendered.value
            : rendered ? visibleText(rendered) : "") ||
          (element instanceof HTMLInputElement
            ? element.value
            : visibleText(element)) ||
          "";
        return /^(请输入|请选择|选择|select|please select|search|搜索)?\s*$/i.test(
          text.trim(),
        )
          ? ""
          : text.trim();
      };
      if (selectedValue()) {
        alreadyFilled++;
        continue;
      }
      const popupSelector =
        '[role="listbox"],.ant-select-dropdown,.el-select-dropdown,.kuma-select2-dropdown';
      // Dismiss a previously open portal before attributing a fresh popup.
      // No click is dispatched on page buttons or form submission controls.
      if ([...document.querySelectorAll(popupSelector)].some(isVisible)) {
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        await wait(60);
      }
      const before = new Set(
        [...document.querySelectorAll(popupSelector)].filter(isVisible),
      );
      interaction.click();
      const search = (
        element instanceof HTMLInputElement
          ? element
          : element.querySelector('input:not([type="hidden"])')
      ) as HTMLInputElement | null;
      const oldSearchValue = search?.value || "";
      const roots = (): Element[] => {
        const ids = [
          element,
          ...element.querySelectorAll("[aria-controls],[aria-owns]"),
        ]
          .flatMap((el) =>
            (
              (el.getAttribute("aria-controls") || "") +
              " " +
              (el.getAttribute("aria-owns") || "")
            ).split(/\s+/),
          )
          .filter(Boolean);
        return [
          ...new Set([
            element,
            ...ids
              .map((id) => document.getElementById(id))
              .filter((el): el is HTMLElement => !!el),
            ...[...document.querySelectorAll(popupSelector)].filter(
              (el) => !before.has(el) && isVisible(el),
            ),
          ]),
        ];
      };
      let chosen: HTMLElement | undefined;
      for (let phase = 0; phase < 2 && !chosen; phase++) {
        if (phase === 1) {
          if (!search || search.readOnly || search.disabled) break;
          search.focus();
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )?.set?.call(search, action.value);
          search.dispatchEvent(new Event("input", { bubbles: true }));
          search.dispatchEvent(new Event("change", { bubbles: true }));
        }
        const deadline = Date.now() + (phase === 1 ? 2000 : 250);
        do {
          chosen = roots()
            .flatMap((root) => [
              ...root.querySelectorAll<HTMLElement>(
                '[role="option"],.ant-select-item-option,.el-select-dropdown__item,.kuma-select2-results__option',
              ),
            ])
            .find(
              (option) =>
                isVisible(option) &&
                option.getAttribute("aria-disabled") !== "true" &&
                !/disabled/.test(option.className) &&
                normalize(
                  option.getAttribute("title") || option.textContent || "",
                ) === normalize(action.value),
            );
          if (chosen) break;
          await wait(40);
        } while (Date.now() < deadline);
      }
      chosen?.click();
      await wait(100);
      // A search input containing the requested text is not proof of selection.
      const selected =
        !!chosen &&
        (chosen.getAttribute("aria-selected") === "true" ||
          (!element.contains(search) &&
            normalize(selectedValue()) === normalize(action.value)) ||
          (normalize(selectedValue()) === normalize(action.value) &&
            (interaction.getAttribute("aria-expanded") === "false" ||
              roots()
                .filter((root) => root !== element)
                .every((root) => !isVisible(root)))));
      if (selected) {
        element.setAttribute("data-aijianli-filled", "true");
        filled++;
      } else {
        if (search && search.value !== oldSearchValue) {
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )?.set?.call(search, oldSearchValue);
          search.dispatchEvent(new Event("input", { bubbles: true }));
        }
        failed.push(action.context || "下拉框未确认选择");
      }
      (search || interaction).dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
        }),
      );
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      continue;
    }
    if (action.controlKind === "custom-select") {
      const current = (element.textContent || "").trim();
      if (current && !/^选择|请选择/.test(current)) {
        alreadyFilled++;
        continue;
      }
      element.click();
      const container = element.parentElement || element;
      if (!chooseOption(container, "li", action.value)) {
        failed.push(action.context || "自定义下拉框");
        continue;
      }
      element.setAttribute("data-aijianli-filled", "true");
      filled++;
      continue;
    }
    if (action.controlKind === "year-month") {
      const yearControl = element.querySelector<HTMLElement>(".select-left");
      const monthControl = element.querySelector<HTMLElement>(".select-right");
      const currentYear = (yearControl?.textContent || "").trim();
      const currentMonth = (monthControl?.textContent || "").trim();
      if (/^\d{4}$/.test(currentYear) && /^\d{1,2}$/.test(currentMonth)) {
        alreadyFilled++;
        continue;
      }
      const date = action.value.match(/(\d{4})\D*(\d{1,2})?/);
      if (!date?.[2] || !yearControl || !monthControl || Number(date[2]) < 1 || Number(date[2]) > 12) {
        failed.push(action.context || "年月选择器");
        continue;
      }
      const year = date[1];
      const month = String(Number(date[2] || "1")).padStart(2, "0");
      if ((/^\d{4}$/.test(currentYear) && currentYear !== year) ||
          (/^\d{1,2}$/.test(currentMonth) && Number(currentMonth) !== Number(month))) {
        failed.push(action.context || "已有部分日期，请手动核对");
        continue;
      }
      yearControl.click();
      await wait(60);
      const yearSelected = chooseOption(element, ".small-select-li", year);
      await wait(60);
      monthControl.click();
      await wait(60);
      const monthSelected = chooseOption(element, ".splicing-select-li", month);
      await wait(80);
      if (!yearSelected || !monthSelected || yearControl.textContent?.trim() !== year || Number(monthControl.textContent?.trim()) !== Number(month)) {
        failed.push(action.context || "年月选择器");
        continue;
      }
      element.setAttribute("data-aijianli-filled", "true");
      filled++;
      continue;
    }
    if (
      (!["radio", "checkbox"].includes(input.type) && input.value?.trim()) ||
      (input.type === "checkbox" && input.checked) ||
      (input.type === "radio" && input.checked)
    ) {
      alreadyFilled++;
      continue;
    }
    if (element instanceof HTMLSelectElement) {
      const option = [...element.options].find(
        (candidate) =>
          normalize(candidate.text) === normalize(action.value) ||
          normalize(candidate.text).includes(normalize(action.value)),
      );
      if (!option) {
        failed.push(action.context || "下拉框");
        continue;
      }
      element.value = option.value;
    } else if (input.type === "checkbox" || input.type === "radio") {
      input.click();
    } else if (element.isContentEditable) {
      element.textContent = action.value;
    } else {
      let value = action.value;
      if (input.type === "date" || action.controlKind === "readonly-date") {
        value = value
          .replace(/[./年]/g, "-")
          .replace(/月/g, "-")
          .replace(/日/g, "")
          .replace(/-$/, "");
        if (/^\d{4}-\d{1,2}$/.test(value)) {
          if (!options.allowMonthStart) {
            controlMetrics.controlDatePrecisionMissingCount = (controlMetrics.controlDatePrecisionMissingCount || 0) + 1;
            failed.push(`${action.context || "日期"}：资料只有年月，此处需要具体日期，请手动选择`);
            continue;
          }
          value += "-01";
          completedDay = true;
        }
        if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
          failed.push(action.context || "日期控件");
          continue;
        }
        const [year, month, day] = value.split("-").map(Number);
        if (month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) {
          failed.push(action.context || "日期控件");
          continue;
        }
        value = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
      const prototype =
        // The normalized date is also the expected value during verification.
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      expectedValue = value;
      Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
        element,
        value,
      );
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
    await wait(60);
    const retained =
      element.isConnected &&
      (element.isContentEditable
        ? normalize(element.textContent || "") === normalize(action.value)
        : ["radio", "checkbox"].includes(input.type)
          ? input.checked
          : element instanceof HTMLSelectElement
            ? [...element.selectedOptions].some((option) =>
                normalize(option.text).includes(normalize(action.value)),
              )
            : !!input.value &&
              normalize(input.value) === normalize(expectedValue));
    if (!retained) {
      failed.push(action.context || "填写后内容未保留");
      continue;
    }
    element.setAttribute("data-aijianli-filled", "true");
    if (completedDay) controlMetrics.dateCompletionAppliedCount = (controlMetrics.dateCompletionAppliedCount || 0) + 1;
    filled++;
  }
  return {
    controlMetrics,
    filled,
    alreadyFilled,
    failedCount: failed.length,
    failed: [...new Set(failed)].slice(0, 20),
  };
}
