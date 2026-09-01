import type { SiteAdapter } from "./types";

const JD_ADAPTER: SiteAdapter = {
  id: "jd-careers",
  ignoreSelectors: [
    ".webuploader-element-invisible",
    ".selectMonth select",
    ".slecteYear select",
  ],
  contextRules: [
    { selector: "#name", context: "姓名" },
    { selector: 'input[name="sex"]', context: "性别" },
    {
      selector: "#birthday",
      context: "出生日期",
      controlKind: "readonly-date",
      allowReadOnly: true,
    },
    {
      selector: "#toWorkTime",
      context: "到岗时间",
      controlKind: "readonly-date",
      allowReadOnly: true,
    },
    { selector: "#country", context: "国籍" },
    { selector: "#nationality", context: "民族" },
    { selector: "#mail", context: "电子邮箱" },
    { selector: "#nativePlace", context: "籍贯" },
    { selector: "#education", context: "最高学历" },
    { selector: "#telephone", context: "手机号码" },
    { selector: "#maritalStatus", context: "婚姻状况" },
    { selector: "#expectSalary", context: "期望薪资" },
    { selector: "#expectWorkplace", context: "期望工作地点" },
    { selector: "#expectWorkType", context: "工作类型" },
    { selector: "#expectJob", context: "期望职位" },
    { selector: "#selfEvaluation", context: "自我评价" },
    {
      selector: ".work-exp #startTime",
      context: "工作开始时间",
      controlKind: "readonly-date",
      allowReadOnly: true,
    },
    {
      selector: ".work-exp #endTime",
      context: "工作结束时间",
      controlKind: "readonly-date",
      allowReadOnly: true,
    },
    { selector: ".work-exp #company", context: "公司名称" },
    { selector: ".work-exp #position", context: "工作职位" },
    { selector: ".work-exp #industry", context: "行业类别" },
    { selector: ".work-exp #workDescription", context: "工作描述" },
    { selector: ".project-exp #projectName", context: "项目名称" },
    { selector: ".project-exp #dutyDesc", context: "项目角色" },
    { selector: ".project-exp #projectDesc", context: "项目描述" },
    {
      selector: ".project-exp #projectStartTime",
      context: "项目开始时间",
      controlKind: "readonly-date",
      allowReadOnly: true,
    },
    {
      selector: ".project-exp #projectEndTime",
      context: "项目结束时间",
      controlKind: "readonly-date",
      allowReadOnly: true,
    },
    { selector: ".edu-exp #university", context: "学校" },
    { selector: ".edu-exp #educationLevel", context: "学历" },
    { selector: ".edu-exp #discipline", context: "专业" },
    {
      selector: ".edu-exp #enterTime",
      context: "教育开始时间",
      controlKind: "readonly-date",
      allowReadOnly: true,
    },
    {
      selector: ".edu-exp #graduationTime",
      context: "教育结束时间",
      controlKind: "readonly-date",
      allowReadOnly: true,
    },
    { selector: ".skills #skillName", context: "专业技能" },
    { selector: ".certificate #certificate", context: "资格证书" },
    { selector: "#homepage", context: "个人网站" },
  ],
  repeaters: [
    {
      profilePath: "experiences",
      rowSelector: ".work-exp .cont-item",
      addButtonSelector: ".work-exp .add-btn",
      maxRows: 10,
    },
    {
      profilePath: "projects",
      rowSelector: ".project-exp .cont-item",
      addButtonSelector: ".project-exp .add-btn",
      maxRows: 10,
    },
    {
      profilePath: "education",
      rowSelector: ".edu-exp .cont-item",
      addButtonSelector: ".edu-exp .add-btn",
      maxRows: 10,
    },
  ],
};

const TENCENT_ADAPTER: SiteAdapter = {
  id: "tencent-careers",
  rootSelector: ".resume-content",
  ignoreSelectors: [
    ".telephone-region",
    ".el-select__input",
    ".el-input__inner",
    ".country-input",
  ],
  contextRules: [
    {
      selector:
        ".information .resume-module:not(.e-mail):not(.telephone) .input-box > input.input.required",
      context: "姓名",
    },
    { selector: 'input[placeholder="省/市"]', context: "当前城市" },
    { selector: ".telephone-input", context: "手机号码" },
    { selector: "#e-mail", context: "电子邮箱" },
    { selector: ".create-empirical #work", context: "工作职位" },
    { selector: ".create-empirical #company", context: "公司名称" },
    {
      selector: ".create-empirical textarea.describe-input",
      context: "工作描述",
    },
    { selector: ".create-education #school", context: "学校" },
    {
      selector: ".create-education .resume-module-left input.input-short",
      context: "专业",
    },
    {
      selector: ".create-education .education-select .select",
      context: "学历",
      controlKind: "custom-select",
    },
    {
      selector: ".create-empirical .start-time-module",
      context: "工作开始时间",
      controlKind: "year-month",
    },
    {
      selector: ".create-empirical .end-time-module",
      context: "工作结束时间",
      controlKind: "year-month",
    },
    {
      selector: ".create-education .study-time-wrapper > .resume-module-left",
      context: "教育开始时间",
      controlKind: "year-month",
    },
    {
      selector: ".create-education .study-time-wrapper > .resume-module-right",
      context: "教育结束时间",
      controlKind: "year-month",
    },
    {
      selector: ".work-describe textarea.describe-input",
      context: "自我评价",
    },
  ],
  repeaters: [
    {
      profilePath: "experiences",
      rowSelector: ".experience-message .create-empirical",
      addButtonSelector:
        ".experience-message > .add-experience .add-text.experience",
      maxRows: 10,
    },
    {
      profilePath: "education",
      rowSelector: ".education-message .create-education",
      addButtonSelector:
        ".education-message > .add-experience .add-text.education",
      maxRows: 10,
    },
  ],
};

export function getSiteAdapter(hostname: string): SiteAdapter | null {
  const normalized = hostname.toLowerCase();
  if (normalized === "zhaopin.jd.com") return JD_ADAPTER;
  if (normalized === "careers.tencent.com") return TENCENT_ADAPTER;
  return null;
}
