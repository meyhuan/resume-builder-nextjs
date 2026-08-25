import { describe, expect, it } from "vitest";
import { decryptApplicationProfile, encryptApplicationProfile } from "./crypto";
import { createEmptyApplicationProfile } from "./schema";
import { mergeProfileMissing, profileFromResume } from "./resume-sync";

describe("application profile", () => {
  it("encrypts and decrypts profile payloads", () => {
    const profile = createEmptyApplicationProfile();
    profile.personal.fullName = "张三";
    profile.identity.idNumber = "110101200001010000";
    expect(
      decryptApplicationProfile(encryptApplicationProfile(profile)),
    ).toEqual(profile);
  });

  it("fills missing values without overwriting user values", () => {
    const current = createEmptyApplicationProfile();
    current.personal.fullName = "用户维护姓名";
    const imported = createEmptyApplicationProfile();
    imported.personal.fullName = "简历姓名";
    imported.contact.phone = "13800000000";
    const merged = mergeProfileMissing(current, imported);
    expect(merged.personal.fullName).toBe("用户维护姓名");
    expect(merged.contact.phone).toBe("13800000000");
  });

  it("extracts structured resume fields", () => {
    const profile = profileFromResume({
      id: "resume-1",
      name: "李同学",
      baseInfo: { phone: "13900000000", email: "li@example.com" },
      jobIntention: { position: "产品经理", city: "北京" },
      sections: [
        {
          id: "s1",
          title: "教育经历",
          columns: 1,
          blocks: [
            {
              id: "e1",
              type: "education",
              school: "示例大学",
              major: "计算机",
              degree: "本科",
              startDate: "2022-09",
              endDate: "2026-06",
              courseHtml: "<p>数据结构</p>",
            },
          ],
        },
      ],
    });
    expect(profile.personal.fullName).toBe("李同学");
    expect(profile.jobPreference.targetRole).toBe("产品经理");
    expect(profile.education[0]?.school).toBe("示例大学");
    expect(profile.education[0]?.courses).toBe("数据结构");
  });
});
