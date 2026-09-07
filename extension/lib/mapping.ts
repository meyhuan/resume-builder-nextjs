import type { FieldDescriptor, FillAction } from "./types";

interface Candidate {
  aliases: string[];
  values: string[];
  repeatable: boolean;
  path?: string;
}

export interface FillPlan {
  missingProfileCount: number;
  unmatchedCount: number;
  actions: FillAction[];
  missingProfile: string[];
  unmatched: string[];
}

const DEFINITIONS: Array<{ paths: string[]; aliases: string[] }> = [
  {
    paths: ["personal.fullName"],
    aliases: [
      "姓名",
      "真实姓名",
      "中文姓名",
      "name",
      "full name",
      "candidate name",
    ],
  },
  { paths: ["personal.englishName"], aliases: ["英文名", "english name"] },
  { paths: ["personal.gender"], aliases: ["性别", "gender", "sex"] },
  {
    paths: ["personal.birthDate"],
    aliases: ["出生日期", "生日", "出生年月", "date of birth", "birthday"],
  },
  {
    paths: ["personal.maritalStatus"],
    aliases: ["婚姻状况", "婚姻状态", "marital status"],
  },
  {
    paths: ["personal.healthStatus"],
    aliases: ["健康状况", "健康状态", "health status"],
  },
  { paths: ["personal.height"], aliases: ["身高", "height"] },
  { paths: ["personal.weight"], aliases: ["体重", "weight"] },
  {
    paths: ["contact.phone"],
    aliases: [
      "手机号",
      "手机号码",
      "手机",
      "手机号",
      "联系电话",
      "电话",
      "mobile",
      "phone",
      "phone number",
    ],
  },
  {
    paths: ["contact.alternatePhone"],
    aliases: ["备用电话", "备用手机", "alternate phone"],
  },
  {
    paths: ["contact.email"],
    aliases: ["邮箱", "电子邮箱", "电子邮件", "email", "email address"],
  },
  {
    paths: ["contact.currentCity"],
    aliases: [
      "现居地",
      "现居城市",
      "当前城市",
      "目前所在城市",
      "current city",
      "current location",
    ],
  },
  { paths: ["contact.hometown"], aliases: ["籍贯", "hometown"] },
  {
    paths: ["contact.householdRegistration"],
    aliases: ["户籍", "户口所在地", "户籍所在地", "household registration"],
  },
  {
    paths: ["contact.address"],
    aliases: ["详细地址", "联系地址", "通讯地址", "address"],
  },
  { paths: ["identity.idType"], aliases: ["证件类型", "证件类别", "id type"] },
  {
    paths: ["identity.idNumber"],
    aliases: [
      "身份证号",
      "证件号码",
      "身份证号码",
      "id number",
      "identity number",
    ],
  },
  { paths: ["identity.nationality"], aliases: ["国籍", "nationality"] },
  { paths: ["identity.ethnicity"], aliases: ["民族", "ethnicity"] },
  {
    paths: ["identity.politicalStatus"],
    aliases: ["政治面貌", "political status"],
  },
  {
    paths: ["jobPreference.targetRole"],
    aliases: [
      "应聘职位",
      "目标岗位",
      "期望职位",
      "申请职位",
      "target role",
      "position applied",
    ],
  },
  {
    paths: ["jobPreference.targetCity"],
    aliases: [
      "期望城市",
      "期望工作城市",
      "工作地点",
      "意向城市",
      "preferred city",
      "preferred location",
    ],
  },
  {
    paths: ["jobPreference.employmentType"],
    aliases: [
      "工作类型",
      "职位类型",
      "用工类型",
      "employment type",
      "job type",
    ],
  },
  {
    paths: ["jobPreference.expectedSalary"],
    aliases: ["期望薪资", "期望月薪", "expected salary", "salary expectation"],
  },
  {
    paths: ["jobPreference.availableDate"],
    aliases: ["到岗时间", "可入职时间", "available date", "start date"],
  },
  {
    paths: ["jobPreference.acceptAdjustment"],
    aliases: ["是否接受调剂", "接受调剂", "accept adjustment"],
  },
  {
    paths: ["education[].school"],
    aliases: [
      "学校",
      "学校名称",
      "毕业院校",
      "院校",
      "school",
      "university",
      "institution",
    ],
  },
  {
    paths: ["education[].major"],
    aliases: ["专业", "专业名称", "major", "field of study"],
  },
  {
    paths: ["education[].degree"],
    aliases: ["学历", "学位", "degree", "education level"],
  },
  {
    paths: ["education[].startDate"],
    aliases: ["入学时间", "教育开始时间", "education start date"],
  },
  {
    paths: ["education[].endDate"],
    aliases: [
      "毕业时间",
      "教育结束时间",
      "graduation date",
      "education end date",
    ],
  },
  { paths: ["education[].gpa"], aliases: ["gpa", "平均绩点", "绩点"] },
  {
    paths: ["education[].description"],
    aliases: ["学校经历内容", "在校经历", "教育经历描述", "education description"],
  },
  {
    paths: ["experiences[].company"],
    aliases: ["公司名称", "实习单位", "工作单位", "company", "employer"],
  },
  {
    paths: ["experiences[].position"],
    aliases: ["职位名称", "实习岗位", "工作职位", "job title", "position"],
  },
  {
    paths: ["experiences[].industry"],
    aliases: ["行业", "行业类别", "所属行业", "industry"],
  },
  {
    paths: ["experiences[].startDate"],
    aliases: ["工作开始时间", "实习开始时间", "employment start date"],
  },
  {
    paths: ["experiences[].endDate"],
    aliases: ["工作结束时间", "实习结束时间", "employment end date"],
  },
  {
    paths: ["experiences[].description"],
    aliases: [
      "工作内容",
      "实习内容",
      "工作职责",
      "工作描述",
      "经历描述",
      "responsibilities",
      "experience description",
    ],
  },
  { paths: ["projects[].name"], aliases: ["项目名称", "project name"] },
  { paths: ["projects[].role"], aliases: ["项目角色", "project role"] },
  {
    paths: ["projects[].startDate"],
    aliases: ["项目开始时间", "project start date"],
  },
  {
    paths: ["projects[].endDate"],
    aliases: ["项目结束时间", "project end date"],
  },
  {
    paths: ["projects[].description"],
    aliases: ["项目描述", "项目内容", "project description"],
  },
  { paths: ["abilities.skills"], aliases: ["技能", "专业技能", "skills"] },
  {
    paths: ["abilities.certificates"],
    aliases: ["证书", "资格证书", "certificates", "certifications"],
  },
  {
    paths: ["abilities.languages"],
    aliases: ["语言能力", "外语能力", "languages"],
  },
  {
    paths: ["abilities.selfEvaluation"],
    aliases: ["自我评价", "个人总结", "self evaluation", "summary"],
  },
  { paths: ["links.github"], aliases: ["github", "github url"] },
  {
    paths: ["links.portfolio"],
    aliases: ["作品集", "portfolio", "portfolio url"],
  },
  {
    paths: ["links.personalWebsite"],
    aliases: ["个人网站", "个人主页", "website", "personal website"],
  },
  {
    paths: ["emergencyContact.name"],
    aliases: ["紧急联系人姓名", "emergency contact name"],
  },
  {
    paths: ["emergencyContact.relationship"],
    aliases: ["紧急联系人关系", "emergency contact relationship"],
  },
  {
    paths: ["emergencyContact.phone"],
    aliases: ["紧急联系人电话", "emergency contact phone"],
  },
];

export function buildFillActions(
  profile: Record<string, unknown>,
  fields: FieldDescriptor[],
): FillAction[] {
  return buildFillPlan(profile, fields).actions.map(({ fieldId, value }) => ({
    fieldId,
    value,
  }));
}

export function buildFillPlan(
  profile: Record<string, unknown>,
  fields: FieldDescriptor[],
): FillPlan {
  const candidates = buildCandidates(profile);
  const usage = new Map<number, number>();
  const actions: FillAction[] = [];
  const missingProfile: string[] = [];
  const unmatched: string[] = [];
  for (const field of fields) {
    if (field.section === "other-person") {
      unmatched.push(field.context);
      continue;
    }
    const context = normalize(field.context);
    let bestIndex = -1;
    let bestLength = 0;
    candidates.forEach((candidate, index) => {
      // A description textarea must not fall back to a short entity-name alias.
      if (field.tag.toLowerCase() === "textarea" && /\.(school|company|position|name)$/.test(candidate.path || "")) return;
      const scope = candidate.path?.split("[].")[0];
      if (
        field.section &&
        field.section !== "personal" &&
        scope !== field.section
      )
        return;
      if (field.section === "personal" && candidate.repeatable) return;
      const scopedAliases: Record<string, string[]> = {
        "experiences[].company": [
          "公司",
          "公司名称",
          "单位名称",
          "company",
          "employer",
        ],
        "experiences[].position": ["职务", "职位", "position", "title"],
        "experiences[].description": [
          "职务描述",
          "工作内容",
          "职责描述",
          "description",
          "职责",
        ],
        "projects[].name": ["名称", "name", "项目名称"],
        "projects[].description": ["职责描述", "描述", "description"],
        "education[].school": ["学校全称", "学校名称", "school", "university"],
        "education[].description": ["学校经历内容", "description"],
      };
      const extra =
        field.section && field.section !== "personal"
          ? scopedAliases[candidate.path || ""] || []
          : [];
      if (field.section && field.section !== "personal") {
        if (candidate.path?.endsWith(".startDate"))
          extra.push("开始日期", "开始时间", "start date");
        if (candidate.path?.endsWith(".endDate"))
          extra.push("结束日期", "结束时间", "end date");
      }
      for (const alias of [...candidate.aliases, ...extra]) {
        const normalizedAlias = normalize(alias);
        const currentHasValue =
          bestIndex >= 0 && candidates[bestIndex].values.some(Boolean);
        const candidateHasValue = candidate.values.some(Boolean);
        if (
          (context === normalizedAlias || context.includes(normalizedAlias)) &&
          (normalizedAlias.length > bestLength ||
            (normalizedAlias.length === bestLength &&
              candidateHasValue &&
              !currentHasValue))
        ) {
          bestIndex = index;
          bestLength = normalizedAlias.length;
        }
      }
    });
    if (bestIndex < 0) {
      unmatched.push(field.context);
      continue;
    }
    const candidate = candidates[bestIndex];
    const occurrence =
      candidate.repeatable && field.rowIndex !== undefined
        ? field.rowIndex
        : usage.get(bestIndex) || 0;
    const value = candidate.repeatable
      ? candidate.values[occurrence] || ""
      : candidate.values[Math.min(occurrence, candidate.values.length - 1)] ||
        "";
    usage.set(bestIndex, occurrence + 1);
    if (!value) {
      missingProfile.push(field.context);
      continue;
    }
    if (
      (field.type === "radio" || field.type === "checkbox") &&
      field.optionText &&
      !optionMatches(field.optionText, value)
    )
      continue;
    actions.push({
      fieldId: field.fieldId,
      value,
      context: field.context,
      controlKind: field.controlKind,
    });
  }
  return {
    actions,
    missingProfileCount: missingProfile.length,
    unmatchedCount: unmatched.length,
    missingProfile: unique(missingProfile),
    unmatched: unique(unmatched),
  };
}

function buildCandidates(profile: Record<string, unknown>): Candidate[] {
  const result: Candidate[] = DEFINITIONS.map((definition) => ({
    path: definition.paths[0],
    aliases: definition.aliases,
    values: definition.paths.flatMap((path) => readPath(profile, path)),
    repeatable: definition.paths.some((path) => path.includes("[]")),
  }));
  const commonAnswers = Array.isArray(profile.commonAnswers)
    ? (profile.commonAnswers as Array<Record<string, unknown>>)
    : [];
  for (const answer of commonAnswers) {
    const aliases = [
      String(answer.question || ""),
      ...(Array.isArray(answer.keywords) ? answer.keywords.map(String) : []),
    ].filter(Boolean);
    const value = String(answer.answer || "");
    if (aliases.length)
      result.push({ aliases, values: [value], repeatable: false });
  }
  return result;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].slice(0, 30);
}

function readPath(value: Record<string, unknown>, path: string): string[] {
  if (path.includes("[]")) {
    const [arrayKey, childKey] = path.split("[].");
    const rows = value[arrayKey];
    return Array.isArray(rows)
      ? rows.map((row) =>
          String((row as Record<string, unknown>)[childKey] || ""),
        )
      : [];
  }
  const parts = path.split(".");
  let current: unknown = value;
  for (const part of parts)
    current =
      current && typeof current === "object"
        ? (current as Record<string, unknown>)[part]
        : undefined;
  return [String(current || "")];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s:：*＊()（）_\-/]/g, "");
}
function optionMatches(option: string, value: string): boolean {
  const left = normalize(option);
  const right = normalize(value);
  return left === right || left.includes(right) || right.includes(left);
}
