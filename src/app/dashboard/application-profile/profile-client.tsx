"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Plus, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createEmptyApplicationProfile,
  type ApplicationProfilePayload,
} from "@/features/application-profile/schema";

interface ResumeOption {
  id: string;
  title: string;
  updatedAt: string;
}
interface Authorization {
  id: string;
  deviceName: string | null;
  expiresAt: string;
  lastUsedAt: string | null;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

export default function ApplicationProfileClient(): ReactElement {
  const [profile, setProfile] = useState<ApplicationProfilePayload>(
    createEmptyApplicationProfile(),
  );
  const [defaultResumeId, setDefaultResumeId] = useState("");
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent): void => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function load(): Promise<void> {
    try {
      const [profileResponse, authResponse] = await Promise.all([
        fetch("/next-api/application-profile", { credentials: "include" }),
        fetch("/next-api/extension/authorizations", { credentials: "include" }),
      ]);
      if (!profileResponse.ok) throw new Error("读取网申资料失败");
      const data = await profileResponse.json();
      setProfile(data.profile);
      setDefaultResumeId(data.defaultResumeId || "");
      setResumes(data.resumes || []);
      if (authResponse.ok) setAuthorizations(await authResponse.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取网申资料失败");
    } finally {
      setLoading(false);
    }
  }

  function updateSection<K extends keyof ApplicationProfilePayload>(
    section: K,
    value: ApplicationProfilePayload[K],
  ): void {
    setProfile((current) => ({ ...current, [section]: value }));
    setDirty(true);
  }

  async function save(): Promise<void> {
    setSaving(true);
    try {
      const response = await fetch("/next-api/application-profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultResumeId: defaultResumeId || null,
          profile,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败");
      setDirty(false);
      toast.success("网申资料已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function syncResume(): Promise<void> {
    if (!defaultResumeId) {
      toast.warning("请先选择默认简历");
      return;
    }
    const response = await fetch("/next-api/application-profile/sync", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeId: defaultResumeId }),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "同步失败");
      return;
    }
    setProfile(result.profile);
    setDirty(false);
    toast.success("已从简历补充空缺信息，不会覆盖原有内容");
  }

  async function revoke(id: string): Promise<void> {
    const response = await fetch(`/next-api/extension/authorizations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      toast.error("撤销授权失败");
      return;
    }
    setAuthorizations((items) => items.filter((item) => item.id !== id));
    toast.success("插件授权已撤销");
  }

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 p-12 text-sm text-slate-500">
        正在读取网申资料…
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">网申资料</h1>
            <p className="mt-1 text-sm text-slate-500">
              在这里集中维护招聘官网经常要求的信息，插件会读取已保存的版本。
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "保存中…" : "保存资料"}
          </button>
        </div>

        <Section
          title="默认简历"
          description="第一次同步会导入简历内容，后续只补空缺，不覆盖你在本页维护的信息。"
        >
          <div className="flex flex-wrap gap-3">
            <select
              value={defaultResumeId}
              onChange={(event) => {
                setDefaultResumeId(event.target.value);
                setDirty(true);
              }}
              className={`${inputClass} max-w-sm`}
            >
              <option value="">请选择默认简历</option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.title}
                </option>
              ))}
            </select>
            <button
              onClick={syncResume}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
            >
              <RefreshCw className="h-4 w-4" />
              从简历补充空缺
            </button>
          </div>
        </Section>

        <ObjectSection
          title="基本信息"
          value={profile.personal}
          onChange={(value) => updateSection("personal", value)}
          labels={{
            fullName: "姓名",
            englishName: "英文名",
            gender: "性别",
            birthDate: "出生日期",
            maritalStatus: "婚姻状况",
            healthStatus: "健康状况",
            height: "身高",
            weight: "体重",
            photoUrl: "照片地址",
          }}
        />
        <ObjectSection
          title="联系方式"
          value={profile.contact}
          onChange={(value) => updateSection("contact", value)}
          labels={{
            phone: "手机",
            alternatePhone: "备用手机",
            email: "邮箱",
            alternateEmail: "备用邮箱",
            currentCity: "现居城市",
            hometown: "籍贯",
            householdRegistration: "户籍所在地",
            address: "详细地址",
          }}
        />
        <ObjectSection
          title="身份信息"
          value={profile.identity}
          onChange={(value) => updateSection("identity", value)}
          labels={{
            idType: "证件类型",
            idNumber: "证件号码",
            nationality: "国籍",
            ethnicity: "民族",
            politicalStatus: "政治面貌",
          }}
          sensitive
        />
        <ObjectSection
          title="求职意向"
          value={profile.jobPreference}
          onChange={(value) => updateSection("jobPreference", value)}
          labels={{
            targetRole: "目标岗位",
            targetCity: "目标城市",
            employmentType: "工作类型",
            expectedSalary: "期望薪资",
            availableDate: "到岗时间",
            acceptAdjustment: "是否接受调剂",
          }}
        />

        <ArraySection
          title="教育经历"
          items={profile.education}
          onChange={(items) => updateSection("education", items)}
          create={() => ({
            id: crypto.randomUUID(),
            school: "",
            major: "",
            degree: "",
            startDate: "",
            endDate: "",
            educationType: "",
            gpa: "",
            rank: "",
            courses: "",
            description: "",
          })}
          labels={{
            school: "学校",
            major: "专业",
            degree: "学历",
            startDate: "开始时间",
            endDate: "结束时间",
            educationType: "培养方式",
            gpa: "GPA",
            rank: "排名",
            courses: "主修课程",
            description: "补充说明",
          }}
        />
        <ArraySection
          title="工作与实习经历"
          items={profile.experiences}
          onChange={(items) => updateSection("experiences", items)}
          create={() => ({
            id: crypto.randomUUID(),
            type: "intern" as const,
            company: "",
            position: "",
            industry: "",
            location: "",
            startDate: "",
            endDate: "",
            description: "",
          })}
          labels={{
            type: "类型（work/intern）",
            company: "公司",
            position: "职位",
            industry: "行业",
            location: "地点",
            startDate: "开始时间",
            endDate: "结束时间",
            description: "经历描述",
          }}
        />
        <ArraySection
          title="项目经历"
          items={profile.projects}
          onChange={(items) => updateSection("projects", items)}
          create={() => ({
            id: crypto.randomUUID(),
            name: "",
            role: "",
            startDate: "",
            endDate: "",
            description: "",
          })}
          labels={{
            name: "项目名称",
            role: "角色",
            startDate: "开始时间",
            endDate: "结束时间",
            description: "项目描述",
          }}
        />
        <ArraySection
          title="校园经历"
          items={profile.campus}
          onChange={(items) => updateSection("campus", items)}
          create={() => ({
            id: crypto.randomUUID(),
            organization: "",
            position: "",
            startDate: "",
            endDate: "",
            description: "",
          })}
          labels={{
            organization: "组织/社团",
            position: "职务",
            startDate: "开始时间",
            endDate: "结束时间",
            description: "经历描述",
          }}
        />

        <ObjectSection
          title="能力与评价"
          value={profile.abilities}
          onChange={(value) => updateSection("abilities", value)}
          labels={{
            skills: "技能",
            certificates: "证书",
            languages: "语言能力",
            selfEvaluation: "自我评价",
          }}
          multiline
        />
        <ObjectSection
          title="个人链接"
          value={profile.links}
          onChange={(value) => updateSection("links", value)}
          labels={{
            personalWebsite: "个人网站",
            github: "GitHub",
            portfolio: "作品集",
            linkedin: "LinkedIn",
          }}
        />
        <ObjectSection
          title="紧急联系人"
          value={profile.emergencyContact}
          onChange={(value) => updateSection("emergencyContact", value)}
          labels={{ name: "姓名", relationship: "关系", phone: "电话" }}
        />
        <ArraySection
          title="家庭成员"
          items={profile.familyMembers}
          onChange={(items) => updateSection("familyMembers", items)}
          create={() => ({
            id: crypto.randomUUID(),
            name: "",
            relationship: "",
            employer: "",
            position: "",
            phone: "",
          })}
          labels={{
            name: "姓名",
            relationship: "关系",
            employer: "工作单位",
            position: "职务",
            phone: "电话",
          }}
        />
        <ArraySection
          title="常见网申问答"
          items={profile.commonAnswers}
          onChange={(items) => updateSection("commonAnswers", items)}
          create={() => ({
            id: crypto.randomUUID(),
            question: "",
            keywords: [],
            answer: "",
          })}
          labels={{
            question: "问题",
            keywords: "匹配关键词（逗号分隔）",
            answer: "答案",
          }}
        />

        <Section
          title="已连接的浏览器插件"
          description="撤销后，对应浏览器需要重新连接才能读取资料。"
        >
          {authorizations.length === 0 ? (
            <p className="text-sm text-slate-400">尚未连接插件</p>
          ) : (
            <div className="space-y-3">
              {authorizations.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-violet-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {item.deviceName || "Chrome 扩展"}
                      </p>
                      <p className="text-xs text-slate-400">
                        有效至{" "}
                        {new Date(item.expiresAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => revoke(item.id)}
                    className="text-sm text-rose-600 hover:underline"
                  >
                    撤销
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}): ReactElement {
  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function ObjectSection<T extends Record<string, string>>({
  title,
  value,
  onChange,
  labels,
  multiline,
  sensitive,
}: {
  title: string;
  value: T;
  onChange: (value: T) => void;
  labels: Partial<Record<keyof T, string>>;
  multiline?: boolean;
  sensitive?: boolean;
}): ReactElement {
  return (
    <Section
      title={title}
      description={
        sensitive
          ? "这些字段属于敏感个人信息；保存后插件会像普通字段一样自动填写。"
          : undefined
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(labels).map(([key, label]) => (
          <label key={key} className="text-sm text-slate-600">
            <span className="mb-1.5 block">{label}</span>
            {multiline ? (
              <textarea
                rows={3}
                value={value[key] || ""}
                onChange={(event) =>
                  onChange({ ...value, [key]: event.target.value })
                }
                className={inputClass}
              />
            ) : (
              <input
                value={value[key] || ""}
                onChange={(event) =>
                  onChange({ ...value, [key]: event.target.value })
                }
                className={inputClass}
              />
            )}
          </label>
        ))}
      </div>
    </Section>
  );
}

function ArraySection<T extends Record<string, unknown>>({
  title,
  items,
  onChange,
  create,
  labels,
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  labels: Partial<Record<keyof T, string>>;
}): ReactElement {
  function change(index: number, key: string, raw: string): void {
    const next = items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const current = item[key];
      return {
        ...item,
        [key]: Array.isArray(current)
          ? raw
              .split(/[,，]/)
              .map((part) => part.trim())
              .filter(Boolean)
          : raw,
      };
    });
    onChange(next);
  }
  return (
    <Section title={title}>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={String(item.id || index)}
            className="relative grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2"
          >
            {Object.entries(labels).map(([key, label]) => (
              <label
                key={key}
                className={`text-sm text-slate-600 ${/description|answer|courses/.test(key) ? "sm:col-span-2" : ""}`}
              >
                <span className="mb-1 block">{label}</span>
                {/description|answer|courses/.test(key) ? (
                  <textarea
                    rows={3}
                    value={
                      Array.isArray(item[key])
                        ? (item[key] as string[]).join("，")
                        : String(item[key] || "")
                    }
                    onChange={(event) => change(index, key, event.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <input
                    value={
                      Array.isArray(item[key])
                        ? (item[key] as string[]).join("，")
                        : String(item[key] || "")
                    }
                    onChange={(event) => change(index, key, event.target.value)}
                    className={inputClass}
                  />
                )}
              </label>
            ))}
            <button
              type="button"
              onClick={() =>
                onChange(items.filter((_, itemIndex) => itemIndex !== index))
              }
              className="absolute right-3 top-3 rounded-lg bg-white p-2 text-slate-400 shadow-sm hover:text-rose-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, create()])}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-violet-300 px-4 py-2 text-sm text-violet-700 hover:bg-violet-50"
        >
          <Plus className="h-4 w-4" />
          新增一条
        </button>
      </div>
    </Section>
  );
}
