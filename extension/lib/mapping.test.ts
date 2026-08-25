import { describe, expect, it } from "vitest";
import { buildFillActions } from "./mapping";

describe("static field mapping", () => {
  const profile = {
    personal: { fullName: "张三", gender: "男" },
    contact: { phone: "13800000000", email: "zhang@example.com" },
    education: [
      { school: "第一大学", major: "计算机" },
      { school: "第二大学", major: "人工智能" },
    ],
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
});
