"use client";

/* Hallmark · modern-minimal · utilitarian restraint · violet anchor · profile section stack · pre-emit critique: P5 H4 E4 S5 R5 V4 */

import { useEffect, useState, type ReactElement } from "react";
import { Plus, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createEmptyApplicationProfile,
  type ApplicationProfilePayload,
} from "@/features/application-profile/schema";
import {
  cities,
  commonQuestions,
  ethnicities,
  industries,
  nationalities,
  relationships,
  roles,
  salaryRanges,
  type FieldOption,
  type ProfileFieldConfig,
} from "./field-options";

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
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline outline-2 outline-offset-1 outline-transparent transition-colors placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-violet-500 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60";

type FieldDefinition = string | ProfileFieldConfig;

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
            className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white outline outline-2 outline-offset-1 outline-transparent transition-colors hover:bg-violet-700 focus-visible:outline-violet-600 active:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-400 disabled:opacity-60"
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
              className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 outline outline-2 outline-offset-1 outline-transparent transition-colors hover:bg-violet-100 focus-visible:outline-violet-600 active:bg-violet-200"
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
            gender: {
              label: "性别",
              kind: "select",
              options: ["男", "女", "不便透露"],
            },
            birthDate: { label: "出生日期", kind: "date" },
            maritalStatus: {
              label: "婚姻状况",
              kind: "select",
              options: ["未婚", "已婚", "离异", "不便透露"],
            },
            healthStatus: {
              label: "健康状况",
              kind: "select",
              options: ["健康", "良好", "一般"],
            },
            height: { label: "身高", kind: "number", suffix: "cm" },
            weight: { label: "体重", kind: "number", suffix: "kg" },
            photoUrl: {
              label: "照片地址",
              kind: "url",
              placeholder: "https://",
            },
          }}
        />
        <ObjectSection
          title="联系方式"
          value={profile.contact}
          onChange={(value) => updateSection("contact", value)}
          labels={{
            phone: { label: "手机", kind: "tel", autoComplete: "tel" },
            alternatePhone: { label: "备用手机", kind: "tel" },
            email: { label: "邮箱", kind: "email", autoComplete: "email" },
            alternateEmail: { label: "备用邮箱", kind: "email" },
            currentCity: {
              label: "现居城市",
              kind: "suggest",
              options: cities,
              quickOptions: ["北京", "上海", "广州", "深圳", "杭州"],
            },
            hometown: { label: "籍贯", kind: "suggest", options: cities },
            householdRegistration: {
              label: "户籍所在地",
              kind: "suggest",
              options: cities,
            },
            address: {
              label: "详细地址",
              placeholder: "省 / 市 / 区 / 街道",
              autoComplete: "street-address",
            },
          }}
        />
        <ObjectSection
          title="身份信息"
          value={profile.identity}
          onChange={(value) => updateSection("identity", value)}
          labels={{
            idType: {
              label: "证件类型",
              kind: "select",
              options: [
                "居民身份证",
                "护照",
                "港澳居民来往内地通行证",
                "台湾居民来往大陆通行证",
                "其他",
              ],
            },
            idNumber: "证件号码",
            nationality: {
              label: "国籍/地区",
              kind: "suggest",
              options: nationalities,
            },
            ethnicity: { label: "民族", kind: "suggest", options: ethnicities },
            politicalStatus: {
              label: "政治面貌",
              kind: "select",
              options: [
                "群众",
                "共青团员",
                "中共预备党员",
                "中共党员",
                "民主党派",
                "无党派人士",
              ],
            },
          }}
          sensitive
        />
        <ObjectSection
          title="求职意向"
          value={profile.jobPreference}
          onChange={(value) => updateSection("jobPreference", value)}
          labels={{
            targetRole: {
              label: "目标岗位",
              kind: "suggest",
              options: roles,
              placeholder: "输入岗位，或从常见岗位中选择",
            },
            targetCity: {
              label: "目标城市",
              kind: "suggest",
              options: cities,
              quickOptions: ["北京", "上海", "广州", "深圳", "杭州", "不限"],
            },
            employmentType: {
              label: "工作类型",
              kind: "select",
              options: ["全职", "实习", "兼职", "校招", "管培生"],
            },
            expectedSalary: {
              label: "期望薪资",
              kind: "suggest",
              options: salaryRanges,
              quickOptions: ["面议", "8K-10K", "10K-15K", "15K-20K"],
            },
            availableDate: {
              label: "到岗时间",
              kind: "suggest",
              options: ["随时到岗", "一周内", "两周内", "一个月内", "面议"],
              quickOptions: ["随时到岗", "两周内", "面议"],
            },
            acceptAdjustment: {
              label: "是否接受调剂",
              kind: "select",
              options: ["是", "否", "视情况而定"],
            },
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
            degree: {
              label: "学历",
              kind: "select",
              options: [
                "中专",
                "高中",
                "大专",
                "本科",
                "硕士",
                "博士",
                "MBA",
                "EMBA",
                "其他",
              ],
            },
            startDate: { label: "开始时间", kind: "month" },
            endDate: { label: "结束时间", kind: "month" },
            educationType: {
              label: "培养方式",
              kind: "select",
              options: [
                "全日制",
                "非全日制",
                "海外教育",
                "成人教育",
                "自考",
                "其他",
              ],
            },
            gpa: "GPA",
            rank: "排名",
            courses: "主修课程",
            description: "补充说明",
          }}
          addLabel="新增教育经历"
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
            type: {
              label: "经历类型",
              kind: "select",
              options: [
                { value: "work", label: "工作经历" },
                { value: "intern", label: "实习经历" },
              ],
            },
            company: "公司",
            position: "职位",
            industry: { label: "行业", kind: "suggest", options: industries },
            location: { label: "地点", kind: "suggest", options: cities },
            startDate: { label: "开始时间", kind: "month" },
            endDate: { label: "结束时间", kind: "month" },
            description: "经历描述",
          }}
          addLabel="新增工作或实习经历"
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
            startDate: { label: "开始时间", kind: "month" },
            endDate: { label: "结束时间", kind: "month" },
            description: "项目描述",
          }}
          addLabel="新增项目经历"
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
            startDate: { label: "开始时间", kind: "month" },
            endDate: { label: "结束时间", kind: "month" },
            description: "经历描述",
          }}
          addLabel="新增校园经历"
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
            personalWebsite: {
              label: "个人网站",
              kind: "url",
              placeholder: "https://",
            },
            github: {
              label: "GitHub",
              kind: "url",
              placeholder: "https://github.com/",
            },
            portfolio: {
              label: "作品集",
              kind: "url",
              placeholder: "https://",
            },
            linkedin: {
              label: "LinkedIn",
              kind: "url",
              placeholder: "https://linkedin.com/in/",
            },
          }}
        />
        <ObjectSection
          title="紧急联系人"
          value={profile.emergencyContact}
          onChange={(value) => updateSection("emergencyContact", value)}
          labels={{
            name: "姓名",
            relationship: {
              label: "关系",
              kind: "suggest",
              options: relationships,
            },
            phone: { label: "电话", kind: "tel" },
          }}
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
            relationship: {
              label: "关系",
              kind: "suggest",
              options: relationships,
            },
            employer: "工作单位",
            position: "职务",
            phone: { label: "电话", kind: "tel" },
          }}
          addLabel="新增家庭成员"
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
            question: {
              label: "问题",
              kind: "suggest",
              options: commonQuestions,
            },
            keywords: "匹配关键词（逗号分隔）",
            answer: "答案",
          }}
          addLabel="新增常见问答"
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
  labels: Partial<Record<keyof T, FieldDefinition>>;
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
        {Object.entries(labels).map(([key, definition]) => (
          <ProfileField
            key={key}
            id={`${title}-${key}`}
            definition={
              multiline && typeof definition === "string"
                ? { label: definition, kind: "textarea" }
                : (definition ?? key)
            }
            value={value[key] || ""}
            onChange={(nextValue) => onChange({ ...value, [key]: nextValue })}
          />
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
  addLabel = "新增一条",
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  labels: Partial<Record<keyof T, FieldDefinition>>;
  addLabel?: string;
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
            {Object.entries(labels).map(([key, definition]) => (
              <div
                key={key}
                className={`text-sm text-slate-600 ${/description|answer|courses/.test(key) ? "sm:col-span-2" : ""}`}
              >
                <ProfileField
                  id={`${title}-${index}-${key}`}
                  definition={
                    /description|answer|courses/.test(key) &&
                    typeof definition === "string"
                      ? { label: definition, kind: "textarea" }
                      : (definition ?? key)
                  }
                  value={
                    Array.isArray(item[key])
                      ? (item[key] as string[]).join("，")
                      : String(item[key] || "")
                  }
                  onChange={(nextValue) => change(index, key, nextValue)}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onChange(items.filter((_, itemIndex) => itemIndex !== index))
              }
              className="absolute right-3 top-3 rounded-lg bg-white p-2 text-slate-400 shadow-sm outline outline-2 outline-offset-1 outline-transparent transition-colors hover:text-rose-500 focus-visible:outline-violet-600 active:bg-rose-50"
              aria-label={`删除第 ${index + 1} 条${title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, create()])}
          className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-dashed border-violet-300 px-4 py-2 text-sm text-violet-700 outline outline-2 outline-offset-1 outline-transparent transition-colors hover:bg-violet-50 focus-visible:outline-violet-600 active:bg-violet-100"
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </button>
      </div>
    </Section>
  );
}

function ProfileField({
  id,
  definition,
  value,
  onChange,
}: {
  id: string;
  definition: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
}): ReactElement {
  const config: ProfileFieldConfig =
    typeof definition === "string" ? { label: definition } : definition;
  const kind = config.kind || "text";
  const options = normalizeOptions(config.options || []);
  const hasCurrentOption = options.some((option) => option.value === value);
  const datalistId = `${id.replace(/[^a-zA-Z0-9_-]/g, "-")}-options`;
  const type = ["date", "month", "number", "email", "tel", "url"].includes(kind)
    ? kind
    : "text";

  const label = (
    <span className="mb-1.5 block font-medium text-slate-600">
      {config.label}
    </span>
  );

  if (kind === "textarea") {
    return (
      <label htmlFor={id} className="block text-sm text-slate-600">
        {label}
        <textarea
          id={id}
          rows={3}
          value={value}
          placeholder={config.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass} py-2.5 leading-6`}
        />
      </label>
    );
  }

  if (kind === "select") {
    return (
      <label htmlFor={id} className="block text-sm text-slate-600">
        {label}
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        >
          <option value="">请选择</option>
          {value && !hasCurrentOption && <option value={value}>{value}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label htmlFor={id} className="block text-sm text-slate-600">
      {label}
      <span className="relative block">
        <input
          id={id}
          type={type}
          list={kind === "suggest" ? datalistId : undefined}
          value={value}
          autoComplete={config.autoComplete}
          placeholder={config.placeholder}
          onChange={(event) => onChange(event.target.value)}
          onClick={(event) => {
            if (kind !== "date" && kind !== "month") return;
            try {
              event.currentTarget.showPicker();
            } catch {
              // Browsers without showPicker still expose the native date control.
            }
          }}
          className={`${inputClass} ${config.suffix ? "pr-12" : ""}`}
        />
        {config.suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
            {config.suffix}
          </span>
        )}
      </span>
      {kind === "suggest" && (
        <datalist id={datalistId}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </datalist>
      )}
      {config.quickOptions && config.quickOptions.length > 0 && (
        <span
          className="mt-2 flex flex-wrap gap-1.5"
          aria-label={`${config.label}快捷选项`}
        >
          {config.quickOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs outline outline-2 outline-offset-1 outline-transparent transition-colors focus-visible:outline-violet-600 active:bg-violet-100 ${
                value === option
                  ? "border-violet-300 bg-violet-50 font-medium text-violet-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-700"
              }`}
            >
              {option}
            </button>
          ))}
        </span>
      )}
    </label>
  );
}

function normalizeOptions(
  options: readonly (string | FieldOption)[],
): FieldOption[] {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
}
