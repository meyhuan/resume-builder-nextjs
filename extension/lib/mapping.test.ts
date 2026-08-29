import { describe, expect, it } from "vitest";
import { buildFillActions, buildFillPlan } from "./mapping";

describe("static field mapping", () => {
  const profile = {
    personal: { fullName: "张三", gender: "男" },
    contact: {
      phone: "13800000000",
      email: "zhang@example.com",
      currentCity: "深圳市",
      hometown: "四川成都",
    },
    identity: { nationality: "中国", ethnicity: "汉族" },
    jobPreference: {
      targetRole: "算法工程师",
      targetCity: "深圳",
      employmentType: "全职",
      expectedSalary: "20k-30k",
    },
    education: [
      { school: "第一大学", major: "计算机" },
      { school: "第二大学", major: "人工智能" },
    ],
    experiences: [
      {
        company: "示例科技",
        position: "后端工程师",
        industry: "互联网",
        description: "负责服务端研发",
      },
    ],
    projects: [
      {
        name: "智能招聘项目",
        role: "项目负责人",
        description: "负责核心功能设计与开发",
      },
    ],
    abilities: {
      skills: "TypeScript、Python",
      certificates: "英语六级",
      selfEvaluation: "学习能力强，沟通协作顺畅",
    },
    commonAnswers: [
      { question: "是否接受调剂", keywords: ["接受调剂"], answer: "是" },
    ],
  };

  it("maps Chinese and English aliases", () => {
    const actions = buildFillActions(profile, [
      {
        fieldId: "1",
        tag: "input",
        type: "text",
        context: "真实姓名",
        optionText: "",
        options: [],
      },
      {
        fieldId: "2",
        tag: "input",
        type: "email",
        context: "Email Address",
        optionText: "",
        options: [],
      },
    ]);
    expect(actions).toEqual([
      { fieldId: "1", value: "张三" },
      { fieldId: "2", value: "zhang@example.com" },
    ]);
  });

  it("fills repeated education rows in order", () => {
    const actions = buildFillActions(profile, [
      {
        fieldId: "1",
        tag: "input",
        type: "text",
        context: "学校名称",
        optionText: "",
        options: [],
      },
      {
        fieldId: "2",
        tag: "input",
        type: "text",
        context: "学校名称",
        optionText: "",
        options: [],
      },
    ]);
    expect(actions.map((action) => action.value)).toEqual([
      "第一大学",
      "第二大学",
    ]);
  });

  it("reuses saved common answers", () => {
    const actions = buildFillActions(profile, [
      {
        fieldId: "1",
        tag: "select",
        type: "select-one",
        context: "是否接受调剂",
        optionText: "",
        options: ["是", "否"],
      },
    ]);
    expect(actions[0]?.value).toBe("是");
  });

  it("maps JD canonical contexts without confusing nationality and ethnicity", () => {
    const contexts = [
      "国籍",
      "民族",
      "电子邮箱",
      "籍贯",
      "期望工作地点",
      "行业类别",
      "工作描述",
      "项目角色",
      "资格证书",
    ];
    const actions = buildFillActions(
      profile,
      contexts.map((context, index) => ({
        fieldId: String(index),
        tag: "input",
        type: "text",
        context,
        optionText: "",
        options: [],
      })),
    );

    expect(actions.map((action) => action.value)).toEqual([
      "中国",
      "汉族",
      "zhang@example.com",
      "四川成都",
      "深圳",
      "互联网",
      "负责服务端研发",
      "项目负责人",
      "英语六级",
    ]);
  });

  it("maps Tencent canonical contexts", () => {
    const contexts = [
      "姓名",
      "当前城市",
      "手机号码",
      "电子邮箱",
      "工作职位",
      "公司名称",
      "工作描述",
      "学校",
      "专业",
      "自我评价",
    ];
    const actions = buildFillActions(
      profile,
      contexts.map((context, index) => ({
        fieldId: String(index),
        tag:
          context === "工作描述" || context === "自我评价"
            ? "textarea"
            : "input",
        type: "text",
        context,
        optionText: "",
        options: [],
      })),
    );

    expect(actions.map((action) => action.value)).toEqual([
      "张三",
      "深圳市",
      "13800000000",
      "zhang@example.com",
      "后端工程师",
      "示例科技",
      "负责服务端研发",
      "第一大学",
      "计算机",
      "学习能力强，沟通协作顺畅",
    ]);
  });

  it("does not duplicate the last repeated record when the page has more rows", () => {
    const plan = buildFillPlan(profile, [
      {
        fieldId: "1",
        tag: "input",
        type: "text",
        context: "学校",
        optionText: "",
        options: [],
      },
      {
        fieldId: "2",
        tag: "input",
        type: "text",
        context: "学校",
        optionText: "",
        options: [],
      },
      {
        fieldId: "3",
        tag: "input",
        type: "text",
        context: "学校",
        optionText: "",
        options: [],
      },
    ]);

    expect(plan.actions.map((action) => action.value)).toEqual([
      "第一大学",
      "第二大学",
    ]);
    expect(plan.missingProfile).toEqual(["学校"]);
  });

  it("separates missing profile data from unsupported fields", () => {
    const plan = buildFillPlan(profile, [
      {
        fieldId: "1",
        tag: "input",
        type: "text",
        context: "政治面貌",
        optionText: "",
        options: [],
      },
      {
        fieldId: "2",
        tag: "input",
        type: "text",
        context: "内部推荐码",
        optionText: "",
        options: [],
      },
    ]);

    expect(plan.missingProfile).toEqual(["政治面貌"]);
    expect(plan.unmatched).toEqual(["内部推荐码"]);
  });
});
