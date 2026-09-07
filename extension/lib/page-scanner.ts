import type {
  PageSnapshot,
  SiteAdapter,
  FieldDescriptor,
  SiteRepeaterRule,
} from "./types";

export function collectPageSnapshot(adapter: SiteAdapter | null): PageSnapshot {
  // Adapted from OpenJobAutofill (MIT): getTextWithoutControls,
  // findFieldContainer and getNearbyText. See THIRD_PARTY_NOTICES.md.
  // Self-contained: Chrome serializes this function for executeScript.
  const controlsSelector =
    'input,textarea,select,[contenteditable="true"],[role="combobox"],[role="radio"],[role="checkbox"]';
  const headingsSelector =
    'legend,h1,h2,h3,h4,[data-section-title],.uxcore-card-title-text,.ant-card-head-title,.el-card__header,[class*="section-title"],[class*="module-title"]';
  const fieldContainerSelector =
    '.ant-form-item,.el-form-item,.kuma-uxform-field:not(.uxcore-form-field-group),.kuma-form-item,.form-item,[data-field-label],[class*="formItem"],[class*="FormItem"]';
  const repeatSelector =
    "[data-repeat-item],.resume-item,.experience-item,.education-item,.repeat-item,.uxcore-form-field-group-item,.field-group-row,.create-empirical,.create-education";
  const normalizeText = (text: string): string =>
    text.replace(/\s+/g, " ").trim();
  const cleanLabel = (text: string): string =>
    normalizeText(text)
      .replace(/^[*＊\s]+|[:：]\s*$/g, "")
      .replace(/^(请输入|请选择|请填写|点击选择)\s*/, "")
      .slice(0, 180);
  const visible = (element: Element): boolean => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (
        node.hasAttribute("hidden") ||
        node.getAttribute("aria-hidden") === "true" ||
        style.display === "none" ||
        style.visibility === "hidden"
      )
        return false;
    }
    return element.getClientRects().length > 0;
  };
  const textWithoutControls = (element: Element | null): string => {
    if (!element) return "";
    const clone = element.cloneNode(true) as Element;
    clone
      .querySelectorAll(
        'input,textarea,select,button,script,style,svg,[role="combobox"],[role="listbox"],[contenteditable="true"]',
      )
      .forEach((node) => node.remove());
    return normalizeText(clone.textContent || "");
  };
  const fieldContainer = (element: Element): Element | null => {
    const known = element.closest(fieldContainerSelector);
    if (known) return known;
    let fallback: Element | null = null;
    for (
      let node = element.parentElement, depth = 0;
      node && depth < 5;
      node = node.parentElement, depth++
    ) {
      // Never borrow labels from adjacent inputs in a whole section.
      const count = node.querySelectorAll(
        'input:not([type="hidden"]),textarea,select,[role="combobox"]',
      ).length;
      if (count > 2 && !node.matches('[role="radiogroup"]')) break;
      const text = textWithoutControls(node);
      if (text && text.length <= 180) {
        fallback = node;
        if (
          /form|field|item|row|cell/i.test(String(node.className)) ||
          node.querySelector("label")
        )
          return node;
      }
    }
    return fallback;
  };
  const sectionKind = (text: string): FieldDescriptor["section"] => {
    if (
      /家庭|亲属|紧急联系人|证明人|推荐人|family|emergency|reference/i.test(
        text,
      )
    )
      return "other-person";
    if (/项目|project/i.test(text)) return "projects";
    if (
      /工作经[历验]|实习经[历验]|work experience|employment|work history/i.test(
        text,
      )
    )
      return "experiences";
    if (/教育|学历|education|academic/i.test(text)) return "education";
    if (/个人信息|基本信息|联系方式|personal|contact|basic/i.test(text))
      return "personal";
    return undefined;
  };
  // Index heading ancestry once: component libraries can wrap a field in more
  // than a dozen nodes. Stop at mixed sections, not an arbitrary depth.
  const headingKinds = new Map<Element, Set<FieldDescriptor["section"]>>();
  for (const heading of document.querySelectorAll(headingsSelector)) {
    const kind = sectionKind(heading.getAttribute("data-section-title") || heading.textContent || "");
    if (!kind || !visible(heading)) continue;
    for (let node: Element | null = heading; node && node !== document.body; node = node.parentElement) {
      const kinds = headingKinds.get(node) || new Set<FieldDescriptor["section"]>();
      kinds.add(kind);
      headingKinds.set(node, kinds);
    }
  }
  const locateSection = (
    element: Element,
  ): { kind?: FieldDescriptor["section"]; root?: Element } => {
    for (
      let node = element.parentElement;
      node && node !== document.body;
      node = node.parentElement
    ) {
      const explicit = node.getAttribute("data-section-title");
      if (explicit && sectionKind(explicit))
        return { kind: sectionKind(explicit), root: node };
      const kinds = [...(headingKinds.get(node) || [])];
      if (kinds.length === 1) return { kind: kinds[0], root: node };
      if (kinds.length > 1) break;
    }
    return {};
  };
  const fieldLabel = (
    element: HTMLElement,
  ): { text: string; source: FieldDescriptor["labelSource"] } => {
    const input = element as HTMLInputElement;
    const ids = (element.getAttribute("aria-labelledby") || "")
      .split(/\s+/)
      .filter(Boolean);
    const explicit = [
      ...(input.labels ? [...input.labels].map(textWithoutControls) : []),
      ...ids.map((id) => textWithoutControls(document.getElementById(id))),
      element.getAttribute("aria-label"),
      element.getAttribute("data-field-label"),
      element.getAttribute("data-label"),
    ]
      .map((x) => cleanLabel(x || ""))
      .filter(Boolean);
    if (explicit.length) return { text: explicit.join(" "), source: "label" };
    const container = fieldContainer(element);
    const label = container?.querySelector(
      'label,.kuma-uxform-field-label,[class*="label"]',
    );
    const nearby = cleanLabel(textWithoutControls(label || container));
    if (nearby && !/^(请输入|请选择|\d+\/\d+)$/.test(nearby))
      return { text: nearby, source: "nearby" };
    return {
      text: cleanLabel(
        [input.placeholder, input.name, input.id].filter(Boolean).join(" "),
      ),
      source: "attribute",
    };
  };
  const genericChoices = [
    ...document.querySelectorAll<HTMLElement>(
      '[role="combobox"],.ant-select,.el-select,.kuma-select2,.ant-cascader,.el-cascader,.rc-cascader,.kuma-cascader',
    ),
  ].filter(
    (el) =>
      !el.parentElement?.closest(
        '[role="combobox"],.ant-select,.el-select,.kuma-select2,.ant-cascader,.el-cascader,.rc-cascader,.kuma-cascader',
      ),
  );
  const nativeControls = [
    ...document.querySelectorAll<HTMLElement>(controlsSelector),
  ].filter(
    (el) =>
      !genericChoices.some((choice) => choice !== el && choice.contains(el)),
  );
  const customControls = (adapter?.contextRules || [])
    .filter((rule) => rule.controlKind && rule.controlKind !== "native")
    .flatMap((rule) => [
      ...document.querySelectorAll<HTMLElement>(rule.selector),
    ]);
  const controls = [
    ...new Set([...nativeControls, ...genericChoices, ...customControls]),
  ]
    .filter(
      (element) =>
        !customControls.some(
          (parent) => parent !== element && parent.contains(element),
        ),
    )
    .sort((a, b) => {
      const position = a.compareDocumentPosition(b);
      return position & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : position & Node.DOCUMENT_POSITION_PRECEDING
          ? 1
          : 0;
    });
  const sections = new Map<Element, FieldDescriptor["section"]>();
  const rowRoots = new Map<Element, Element[]>();
  const fields: FieldDescriptor[] = [];
  for (const [index, element] of controls.entries()) {
    // Popup editors/search boxes are implementation details, not resume fields.
    if (element.closest('.kuma-calendar,.rc-calendar,.ant-calendar,.ant-picker-dropdown,.el-picker-panel,.kuma-select2-dropdown,.ant-select-dropdown,.el-select-dropdown,[role="listbox"],.ant-cascader-dropdown,.rc-cascader-menus,.kuma-cascader-menus,.el-cascader__dropdown')) continue;
    const input = element as HTMLInputElement;
    const type = (
      input.type ||
      element.getAttribute("role") ||
      ""
    ).toLowerCase();
    const rule = adapter?.contextRules.find((item) =>
      element.matches(item.selector),
    );
    if (adapter?.rootSelector && !element.closest(adapter.rootSelector))
      continue;
    if (adapter?.ignoreSelectors.some((selector) => element.matches(selector)))
      continue;
    if (
      [
        "hidden",
        "password",
        "file",
        "submit",
        "reset",
        "button",
        "image",
      ].includes(type)
    )
      continue;
    if (
      input.disabled ||
      element.getAttribute("aria-disabled") === "true" ||
      !visible(element)
    )
      continue;
    const isChoice = !rule && genericChoices.includes(element);
    const isCascader = isChoice && element.matches('.ant-cascader,.el-cascader,.rc-cascader,.kuma-cascader');
    const isPopupDate = !rule && element instanceof HTMLInputElement &&
      !!element.closest('.ant-picker,.ant-calendar-picker,.kuma-calendar-picker,.kuma-calendar-picker-input,.rc-calendar-picker,.el-date-editor');
    const unsupportedDate = !rule && !isChoice && input.readOnly;
    const label = rule
      ? { text: rule.context, source: "adapter" as const }
      : fieldLabel(element);
    if (!rule && /radio|checkbox/.test(type)) {
      const group = element.closest(
        '[role="radiogroup"],[role="group"],fieldset',
      );
      const groupLabel =
        group?.getAttribute("aria-label") ||
        textWithoutControls(
          group?.querySelector('legend,label,[class*="label"]') || null,
        );
      if (groupLabel) label.text = cleanLabel(groupLabel);
    }
    // Block using raw attributes even if a visible label masks sensitive controls.
    if (
      /password|密码|验证码|captcha|银行卡|协议|同意条款|csrf|token|tracking/i.test(
        [label.text, input.name, input.id, input.autocomplete].join(" "),
      )
    )
      continue;
    const adapterRepeater = adapter?.repeaters?.find((item) => element.closest(item.rowSelector));
    const adapterRow = adapterRepeater ? element.closest(adapterRepeater.rowSelector) : null;
    const section = adapterRow && adapterRepeater
      ? { kind: adapterRepeater.profilePath as FieldDescriptor["section"], root: adapterRow.parentElement || undefined }
      : locateSection(element);
    if (section.root) sections.set(section.root, section.kind);
    let row: Element | null = adapterRow || element.closest(repeatSelector);
    if (!row && section.root && section.kind !== "personal") {
      const container = fieldContainer(element);
      for (
        let node = container?.parentElement, depth = 0;
        node && node !== section.root && depth < 6;
        node = node.parentElement, depth++
      ) {
        // A repeated record has multiple fields and a structurally identical sibling.
        const siblings = [...(node.parentElement?.children || [])].filter(
          (sibling) =>
            sibling.tagName === node!.tagName &&
            sibling.className === node!.className &&
            sibling.querySelectorAll('input,textarea,select,[role="combobox"]')
              .length >= 2 &&
            !sibling.querySelector(headingsSelector),
        );
        if (siblings.length >= 2) {
          row = node;
          break;
        }
      }
      if (!row) {
        // A first, single record can be found from multiple field containers;
        // don't mistake a two-input date field or an entire section for a record.
        for (
          let node = container?.parentElement, depth = 0;
          node && node !== section.root && depth < 6;
          node = node.parentElement, depth++
        ) {
          if (node.querySelector(headingsSelector)) break;
          if (
            /(添加|新增|增加).{0,4}(经历|经验|项目|教育)|add (experience|education|project)/i.test(
              textWithoutControls(node),
            )
          )
            break;
          const containers = [
            ...node.querySelectorAll(fieldContainerSelector),
          ].filter((field) =>
            field.querySelector('input,textarea,select,[role="combobox"]'),
          );
          if (containers.length >= 2) {
            row = node;
            break;
          }
        }
      }
    }
    let rowIndex: number | undefined;
    if (section.root && row && section.root.contains(row)) {
      const rows = rowRoots.get(section.root) || [];
      if (!rows.includes(row)) rows.push(row);
      rowRoots.set(section.root, rows);
      // Use all adapter records, including ones without this control (e.g. a
      // current job has no end date), so later dates never shift to another job.
      rowIndex = adapterRepeater
        ? [...document.querySelectorAll(adapterRepeater.rowSelector)].filter(visible).indexOf(row)
        : rows.indexOf(row);
    }
    const placeholder = cleanLabel(input.placeholder || "");
    const context = rule
      ? rule.context
      : normalizeText(
          [
            label.text,
            label.source !== "attribute" &&
            /开始|结束|start|end/i.test(placeholder)
              ? placeholder
              : "",
          ]
            .filter(Boolean)
            .join(" "),
        );
    const fieldId = "aijianli-" + Date.now() + "-" + index;
    element.setAttribute("data-aijianli-field-id", fieldId);
    fields.push({
      fieldId,
      tag: element.tagName.toLowerCase(),
      type,
      context: context || "未识别字段",
      section: section.kind,
      rowIndex,
      labelSource: label.source,
      controlKind:
        rule?.controlKind ||
        (isPopupDate
          ? "popup-date"
          : isCascader
          ? "cascader"
          : isChoice
          ? "generic-select"
          : unsupportedDate
            ? "unsupported"
            : "native"),
      optionText: /radio|checkbox/.test(type)
        ? cleanLabel(
            textWithoutControls(element.closest("label")) ||
              element.getAttribute("aria-label") ||
              "",
          )
        : "",
      options:
        element instanceof HTMLSelectElement
          ? [...element.options].map((o) => o.text.trim())
          : [],
    });
  }
  const repeaters: SiteRepeaterRule[] = [];
  for (const [root, kind] of sections) {
    if (!kind || kind === "personal" || kind === "other-person") continue;
    const rows = rowRoots.get(root);
    if (!rows?.length) continue;
    const addPattern =
      kind === "experiences"
        ? /^(?:[+＋]\s*)?(?:添加|新增|增加)(?:工作|实习)经[历验]$|^add (?:work )?experience$/i
        : kind === "projects"
          ? /^(?:[+＋]\s*)?(?:添加|新增|增加)项目(?:经历)?$|^add project$/i
          : /^(?:[+＋]\s*)?(?:添加|新增|增加)教育(?:经历|情况)?$|^add education$/i;
    const buttons = [
      ...root.querySelectorAll<HTMLElement>(
        'button,[role="button"],a,span,div',
      ),
    ].filter(
      (el) =>
        visible(el) &&
        addPattern.test(normalizeText(el.textContent || "")) &&
        !el.closest('button[type="submit"],input[type="submit"]') &&
        !el.querySelector("input,textarea,select"),
    );
    // Innermost visible text node first; don't include a whole section wrapper.
    const button = buttons.find(
      (el) => !buttons.some((child) => child !== el && el.contains(child)),
    );
    if (!button) continue;
    const token = "generic-" + repeaters.length;
    rows.forEach((row) => row.setAttribute("data-aijianli-record", token));
    button.setAttribute("data-aijianli-add", token);
    // Structural selector survives newly rendered records; never depend on generated IDs.
    const firstRow = rows[0];
    const cls = [...firstRow.classList].filter((c) =>
      /^[a-zA-Z_][\w-]*$/.test(c),
    );
    if (!cls.length && !firstRow.hasAttribute("data-repeat-item")) continue;
    root.setAttribute("data-aijianli-section", token);
    const rowSuffix = firstRow.hasAttribute("data-repeat-item")
      ? "[data-repeat-item]"
      : firstRow.matches(".field-group-row")
        ? ".field-group-row"
        : firstRow.tagName.toLowerCase() + cls.map((c) => "." + c).join("");
    const rowSelector = '[data-aijianli-section="' + token + '"] ' + rowSuffix;
    if ([...document.querySelectorAll(rowSelector)].filter(visible).length !== rows.length) continue;
    const addSelectors = ['[data-aijianli-add="' + token + '"]'];
    for (
      let node: HTMLElement | null = button, depth = 0;
      node && node !== root && depth < 3;
      node = node.parentElement, depth++
    ) {
      if (!addPattern.test(normalizeText(node.textContent || ""))) break;
      const suffix =
        node.tagName.toLowerCase() +
        [...node.classList]
          .filter((c) => /^[a-zA-Z_][\w-]*$/.test(c))
          .map((c) => "." + c)
          .join("");
      const selector = '[data-aijianli-section="' + token + '"] ' + suffix;
      if (document.querySelectorAll(selector).length === 1)
        addSelectors.push(selector);
    }
    repeaters.push({
      profilePath: kind,
      rowSelector,
      addButtonSelectors: addSelectors,
      maxRows: 10,
    });
  }

  let structured: Record<string, unknown> = {};
  for (const script of document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  )) {
    try {
      const value = JSON.parse(script.textContent || "{}");
      const candidates = Array.isArray(value)
        ? value
        : value["@graph"] || [value];
      const job = candidates.find(
        (item: Record<string, unknown>) => item?.["@type"] === "JobPosting",
      );
      if (job) {
        structured = job;
        break;
      }
    } catch {
      /* ignore invalid publisher JSON-LD */
    }
  }
  const organization = structured.hiringOrganization as
    | Record<string, unknown>
    | undefined;
  const address = (
    structured.jobLocation as Record<string, unknown> | undefined
  )?.address as Record<string, unknown> | undefined;
  const companyName = String(
    organization?.name ||
      document
        .querySelector('meta[property="og:site_name"]')
        ?.getAttribute("content") ||
      location.hostname.replace(/^www\./, ""),
  );
  const jobTitle = String(
    structured.title ||
      document.querySelector("h1")?.textContent?.trim() ||
      document.title ||
      "未识别职位",
  ).slice(0, 300);
  return {
    fields,
    repeaters,
    job: {
      companyName: companyName.slice(0, 300),
      jobTitle,
      location: String(address?.addressLocality || "").slice(0, 300),
      jobUrl: location.href,
      applicationUrl: location.href,
      sourceDomain: location.hostname,
    },
  };
}
