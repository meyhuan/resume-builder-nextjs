import { describe, expect, it } from "vitest";

import { buildJobFitFormInitialValues } from "../form-state";

describe("Job Fit form state restoration", () => {
  it("restores all target-job fields from a failed task", () => {
    const restored = buildJobFitFormInitialValues(
      {
        id: "task-1",
        sourceType: "EXISTING",
        sourceResumeId: "resume-1",
        companyName: "示例科技",
        jobTitle: "高级产品经理",
        jobDescription: "负责产品规划、用户研究和跨团队协作。",
        jobUrl: "https://example.com/jobs/1",
        focusAreas: ["keywords", "structure"],
      },
      new Set(["resume-1"]),
    );

    expect(restored).toMatchObject({
      restoredFromTaskId: "task-1",
      sourceType: "EXISTING",
      resumeId: "resume-1",
      companyName: "示例科技",
      jobTitle: "高级产品经理",
      jobDescription: "负责产品规划、用户研究和跨团队协作。",
      jobUrl: "https://example.com/jobs/1",
      focusAreas: ["keywords", "structure"],
    });
  });

  it("reuses the parsed base resume for file and text imports", () => {
    const restored = buildJobFitFormInitialValues(
      {
        id: "task-2",
        sourceType: "FILE",
        sourceResumeId: "imported-resume",
        companyName: null,
        jobTitle: "运营经理",
        jobDescription: "岗位描述",
        jobUrl: null,
        focusAreas: [],
      },
      new Set(["imported-resume"]),
    );

    expect(restored.sourceType).toBe("EXISTING");
    expect(restored.resumeId).toBe("imported-resume");
    expect(restored.focusAreas).toEqual([
      "keywords",
      "achievements",
      "concise",
    ]);
  });
});
