'use client';

import { useState } from 'react';
import {
  Crown,
  Search,
  RotateCcw,
  User,
  CheckCircle,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Download,
  Minus,
  Plus,
  Check,
  Sparkles,
  Clock,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStoredAdminPassword } from '@/lib/admin-auth';
import { adminErrorText, adminJava, vipTypeLabel } from '@/lib/admin-java';
import { AdminStats } from '@/components/admin/admin-stats';
import { ResumeReplace } from '@/components/admin/resume-replace';
import { UserList } from '@/components/admin/user-list';

interface UserInfo {
  id: number;
  openid: string;
  name: string | null;
  vipStatus: number;
  vipType: number;
  vipExpireTime: string | null;
  freeExportCount?: number;
}

interface ResumeItem {
  id: string;
  title: string;
  template: string;
  updatedAt: string;
  resumeName?: string | null;
  user?: CopySourceUser;
}

interface CopySourceUser {
  id: string;
  wxId: string | null;
  javaUserId: string | null;
  name: string | null;
}

interface VipFormData {
  vipType: number;
  expiryDate: string;
}

type CopyMode = 'to-user' | 'to-current';
type SourceLookupMode = 'user' | 'resume-name';

const QUICK_PRESETS: Array<{ label: string; vipType: number; days: number }> = [
  { label: '月卡 30天', vipType: 1, days: 30 },
  { label: '年卡 365天', vipType: 2, days: 365 },
  { label: '终身会员', vipType: 3, days: 36500 },
];

function getExpiryDate(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 16);
}

export default function AdminPage(): React.ReactElement {
  const [searchValue, setSearchValue] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showVipForm, setShowVipForm] = useState(false);
  const [showCopySection, setShowCopySection] = useState(false);
  const [copyMode, setCopyMode] = useState<CopyMode>('to-user');
  const [myResumes, setMyResumes] = useState<ResumeItem[]>([]);
  const [sourceUserResumes, setSourceUserResumes] = useState<ResumeItem[]>([]);
  const [sourceLookupMode, setSourceLookupMode] = useState<SourceLookupMode>('user');
  const [sourceUserQuery, setSourceUserQuery] = useState('');
  const [resumeNameQuery, setResumeNameQuery] = useState('');
  const [copySourceUser, setCopySourceUser] = useState<CopySourceUser | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [exportCount, setExportCount] = useState(0);
  const [exportCountLoading, setExportCountLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [vipForm, setVipForm] = useState<VipFormData>({
    vipType: 1,
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
  });

  function copyTextToClipboard(text: string, key: string) {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1800);
    }).catch(() => {});
  }

  async function searchUser(idOverride?: string): Promise<void> {
    const query = (idOverride ?? searchValue).trim();
    if (!query) {
      setMessage({ type: 'error', text: '请输入 User ID' });
      return;
    }
    if (idOverride) setSearchValue(idOverride);
    setLoading(true);
    setMessage(null);
    setUser(null);
    try {
      const foundUser = await adminJava<UserInfo>(`/users/${encodeURIComponent(query)}`);
      setUser(foundUser);
      setExportCount(Math.max(0, foundUser.freeExportCount ?? 0));
      setShowVipForm(false);
      document.getElementById('selected-user')?.scrollIntoView({ block: 'start' });
    } catch (err) {
      setMessage({ type: 'error', text: adminErrorText(err, '用户未找到') });
    } finally {
      setLoading(false);
    }
  }

  async function grantVip(): Promise<void> {
    if (!user) return;
    setLoading(true);
    setMessage(null);
    try {
      await adminJava<UserInfo>(`/users/${user.id}/vip`, {
        method: 'PUT',
        body: JSON.stringify({
          vipType: vipForm.vipType,
          expiryDate: vipForm.expiryDate,
          freeExportCount: user.freeExportCount ?? 0,
        }),
      });
      setMessage({ type: 'success', text: 'VIP 状态更新成功！' });
      setShowVipForm(false);
      await searchUser(String(user.id));
    } catch (err) {
      setMessage({ type: 'error', text: adminErrorText(err, '授予操作失败') });
    } finally {
      setLoading(false);
    }
  }

  async function toggleCopySection(): Promise<void> {
    const nextState = !showCopySection;
    setShowCopySection(nextState);
    if (nextState && copyMode === 'to-user' && myResumes.length === 0) {
      void fetchMyResumes();
    }
  }

  function handleCopyModeChange(mode: CopyMode): void {
    setCopyMode(mode);
    setCopyMessage(null);
    setSelectedResumeId('');
    if (mode === 'to-user') {
      if (myResumes.length > 0) {
        setSelectedResumeId(myResumes[0].id);
      } else {
        void fetchMyResumes();
      }
      return;
    }
    if (sourceUserResumes.length > 0) {
      setSelectedResumeId(sourceUserResumes[0].id);
    }
  }

  function handleSourceLookupModeChange(mode: SourceLookupMode): void {
    setSourceLookupMode(mode);
    setCopyMessage(null);
    setSelectedResumeId('');
    setCopySourceUser(null);
    setSourceUserResumes([]);
  }

  async function fetchMyResumes(): Promise<void> {
    try {
      const res = await fetch('/next-api/resumes');
      const json = await res.json();
      if (Array.isArray(json)) {
        setMyResumes(json);
        if (json.length > 0) setSelectedResumeId(json[0].id);
      }
    } catch {
      setCopyMessage({ type: 'error', text: '加载我的简历列表失败' });
    }
  }

  function handleSourceUserQueryChange(value: string): void {
    setSourceUserQuery(value);
    setCopySourceUser(null);
    setSourceUserResumes([]);
    if (copyMode === 'to-current') setSelectedResumeId('');
  }

  function handleResumeNameQueryChange(value: string): void {
    setResumeNameQuery(value);
    setCopySourceUser(null);
    setSourceUserResumes([]);
    if (copyMode === 'to-current') setSelectedResumeId('');
  }

  async function fetchSourceUserResumes(): Promise<void> {
    const query = sourceUserQuery.trim();
    if (!query) {
      setCopyMessage({ type: 'error', text: '请输入来源用户 ID' });
      return;
    }
    setCopyLoading(true);
    setCopyMessage(null);
    try {
      const params = new URLSearchParams({ userId: query });
      const res = await fetch(`/next-api/admin/copy-resume?${params.toString()}`, {
        headers: { 'X-Admin-Password': getStoredAdminPassword() },
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setCopySourceUser(null);
        setSourceUserResumes([]);
        setSelectedResumeId('');
        setCopyMessage({ type: 'error', text: json.error || '加载对方简历列表失败' });
        return;
      }
      const resumes: ResumeItem[] = Array.isArray(json.resumes) ? json.resumes : [];
      setCopySourceUser(json.user ?? null);
      setSourceUserResumes(resumes);
      setSelectedResumeId(resumes[0]?.id ?? '');
      if (resumes.length === 0) {
        setCopyMessage({ type: 'error', text: '该用户在当前系统暂无简历' });
      } else {
        setCopyMessage(null);
      }
    } catch (err) {
      setCopyMessage({ type: 'error', text: '加载对方简历列表失败: ' + (err instanceof Error ? err.message : '未知错误') });
    } finally {
      setCopyLoading(false);
    }
  }

  async function fetchSourceResumesByName(): Promise<void> {
    const query = resumeNameQuery.trim();
    if (!query) {
      setCopyMessage({ type: 'error', text: '请输入简历基本信息姓名' });
      return;
    }
    setCopyLoading(true);
    setCopyMessage(null);
    try {
      const params = new URLSearchParams({ resumeName: query });
      const res = await fetch(`/next-api/admin/copy-resume?${params.toString()}`, {
        headers: { 'X-Admin-Password': getStoredAdminPassword() },
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setCopySourceUser(null);
        setSourceUserResumes([]);
        setSelectedResumeId('');
        setCopyMessage({ type: 'error', text: json.error || '按姓名搜索简历失败' });
        return;
      }
      const resumes: ResumeItem[] = Array.isArray(json.resumes) ? json.resumes : [];
      setCopySourceUser(null);
      setSourceUserResumes(resumes);
      setSelectedResumeId(resumes[0]?.id ?? '');
      if (resumes.length === 0) {
        setCopyMessage({ type: 'error', text: '没有找到匹配该姓名的简历' });
      } else {
        setCopyMessage({ type: 'success', text: `找到 ${resumes.length} 份匹配简历，请选择后复制` });
      }
    } catch (err) {
      setCopyMessage({ type: 'error', text: '按姓名搜索简历失败: ' + (err instanceof Error ? err.message : '未知错误') });
    } finally {
      setCopyLoading(false);
    }
  }

  async function copyResume(): Promise<void> {
    if (!selectedResumeId) {
      setCopyMessage({ type: 'error', text: '请选择要复制的简历' });
      return;
    }
    if (copyMode === 'to-user' && !targetUserId.trim()) {
      setCopyMessage({ type: 'error', text: '请填写目标用户 ID' });
      return;
    }
    const selectedSourceResume = sourceUserResumes.find((resume) => resume.id === selectedResumeId) ?? null;
    const sourceIdentifier = sourceLookupMode === 'resume-name'
      ? selectedSourceResume?.user?.id ?? ''
      : sourceUserQuery.trim();
    if (copyMode === 'to-current' && !sourceIdentifier) {
      setCopyMessage({
        type: 'error',
        text: sourceLookupMode === 'resume-name' ? '请先按姓名搜索并选择要复制的简历' : '请填写来源用户 ID 并搜索简历',
      });
      return;
    }
    setCopyLoading(true);
    setCopyMessage(null);
    try {
      const payload = copyMode === 'to-current'
        ? {
            adminPassword: getStoredAdminPassword(),
            resumeId: selectedResumeId,
            sourceUserId: sourceIdentifier,
            direction: 'to-current' as const,
          }
        : {
            adminPassword: getStoredAdminPassword(),
            resumeId: selectedResumeId,
            targetUserId: targetUserId.trim(),
            direction: 'to-user' as const,
          };
      const res = await fetch('/next-api/admin/copy-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setCopyMessage({ type: 'error', text: json.error || '复制失败' });
        return;
      }
      setCopyMessage({
        type: 'success',
        text: copyMode === 'to-current'
          ? `简历已成功复制到我的账号，新简历 ID: ${json.resumeId}`
          : `简历已成功复制到用户 ${json.targetUserId}，新简历 ID: ${json.resumeId}`,
      });
      setTargetUserId('');
    } catch (err) {
      setCopyMessage({ type: 'error', text: '复制失败: ' + (err instanceof Error ? err.message : '未知错误') });
    } finally {
      setCopyLoading(false);
    }
  }

  async function resetVip(): Promise<void> {
    if (!user) return;
    if (!window.confirm('确定要重置该用户的 VIP 状态吗？重置后将恢复为非会员。')) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await adminJava<void>(`/users/${user.id}/vip`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'VIP 已成功重置' });
      await searchUser(String(user.id));
    } catch (err) {
      setMessage({ type: 'error', text: adminErrorText(err, '重置失败') });
    } finally {
      setLoading(false);
    }
  }

  async function updateExportCount(): Promise<void> {
    if (!user) return;
    if (!Number.isInteger(exportCount) || exportCount < 0) {
      setMessage({ type: 'error', text: '剩余导出次数必须是非负整数' });
      return;
    }

    setExportCountLoading(true);
    setMessage(null);
    try {
      const data = await adminJava<{ freeExportCount?: number }>(`/users/${user.id}/export-count`, {
        method: 'PUT',
        body: JSON.stringify({ freeExportCount: exportCount }),
      });
      const savedCount = Number(data?.freeExportCount ?? exportCount);
      setUser((current) => current ? { ...current, freeExportCount: savedCount } : current);
      setExportCount(savedCount);
      setMessage({ type: 'success', text: `剩余导出次数已更新为 ${savedCount} 次` });
    } catch (err) {
      setMessage({ type: 'error', text: adminErrorText(err, '导出次数保存失败') });
    } finally {
      setExportCountLoading(false);
    }
  }

  const activeCopyResumes: ResumeItem[] = copyMode === 'to-user' ? myResumes : sourceUserResumes;
  const selectedSourceResume: ResumeItem | null = copyMode === 'to-current'
    ? activeCopyResumes.find((resume) => resume.id === selectedResumeId) ?? null
    : null;
  const copyButtonDisabled: boolean = copyLoading
    || !selectedResumeId
    || (copyMode === 'to-user' && !targetUserId.trim())
    || (copyMode === 'to-current' && sourceLookupMode === 'user' && !sourceUserQuery.trim())
    || (copyMode === 'to-current' && sourceLookupMode === 'resume-name' && !selectedSourceResume?.user?.id);

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Top Stats Overview */}
      <AdminStats />

      {/* User Search Bar */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 sm:rounded-2xl sm:p-5 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void searchUser();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="输入 User ID 搜索用户"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 py-2.5 sm:py-3 text-base sm:text-sm outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => setSearchValue('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600"
                aria-label="清空输入"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !searchValue.trim()}
            className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 px-3 text-sm font-semibold text-white shadow-xs hover:bg-violet-700 active:scale-[0.99] disabled:opacity-50 transition-all"
          >
            {loading ? '搜索中' : '搜索'}
          </button>
        </form>
      </div>

      {/* Global Alert Notification */}
      {message && (
        <div
          className={cn(
            'flex items-start gap-2.5 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm border transition-all animate-in fade-in',
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          )}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <span className="flex-1 font-medium">{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
            aria-label="关闭提示"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Selected User Details Card */}
      {user && (
        <div id="selected-user" className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-5">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white font-bold text-lg sm:text-xl shadow-xs shrink-0">
                {user.name ? user.name.slice(0, 1) : <User className="h-6 w-6" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 text-base sm:text-lg truncate">
                  {user.name || '未命名用户'}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-slate-500">ID: {user.id}</span>
                  <button
                    type="button"
                    onClick={() => copyTextToClipboard(String(user.id), 'user-id')}
                    className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium text-violet-600 hover:bg-violet-50 active:bg-violet-100 transition-colors"
                    title="复制 User ID"
                  >
                    {copiedKey === 'user-id' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>复制</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center self-start sm:self-center">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border',
                  user.vipStatus === 1
                    ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                )}
              >
                {user.vipStatus === 1 ? <Crown className="h-3.5 w-3.5 text-amber-600" /> : <User className="h-3.5 w-3.5 text-slate-400" />}
                <span>{user.vipStatus === 1 ? `VIP · ${vipTypeLabel(user.vipType)}` : '非VIP 用户'}</span>
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 shrink-0">OpenID</span>
              <div className="flex items-center gap-1.5 max-w-[65%]">
                <span className="font-mono text-xs text-slate-700 truncate" title={user.openid}>
                  {user.openid}
                </span>
                <button
                  type="button"
                  onClick={() => copyTextToClipboard(user.openid, 'openid')}
                  className="p-1 rounded text-slate-400 hover:text-violet-600 hover:bg-white transition-colors shrink-0"
                  title="复制 OpenID"
                >
                  {copiedKey === 'openid' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 shrink-0">VIP 到期时间</span>
              <div className="flex items-center gap-1.5 text-right font-medium text-slate-700 text-xs sm:text-sm">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{user.vipExpireTime ? new Date(user.vipExpireTime).toLocaleString('zh-CN') : '暂未开通'}</span>
              </div>
            </div>
          </div>

          {/* Export Quota Stepper Box */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Download className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">剩余导出次数</h4>
                  <p className="text-[11px] text-slate-400">单次导出额度，与 VIP 状态相互独立</p>
                </div>
              </div>
              <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-violet-700 border border-violet-100 shadow-2xs">
                当前: {user.freeExportCount ?? 0} 次
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportCount((count) => Math.max(0, count - 1))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-600 active:scale-95 transition-all shadow-2xs"
                  title="减少 1 次"
                  aria-label="减少 1 次导出"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <input
                  type="number"
                  min={0}
                  step={1}
                  value={exportCount}
                  onChange={(event) => {
                    const nextCount = Number(event.target.value);
                    setExportCount(Number.isFinite(nextCount) ? Math.max(0, nextCount) : 0);
                  }}
                  className="h-11 min-w-0 flex-1 sm:w-24 rounded-xl border border-slate-200 bg-white px-3 text-center text-base font-bold text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 shadow-2xs"
                  aria-label="剩余导出次数"
                />

                <button
                  type="button"
                  onClick={() => setExportCount((count) => count + 1)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-600 active:scale-95 transition-all shadow-2xs"
                  title="增加 1 次"
                  aria-label="增加 1 次导出"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportCount((count) => count + 5)}
                  className="flex-1 sm:flex-none h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-600 active:scale-95 transition-all shadow-2xs"
                >
                  +5 次
                </button>
                <button
                  type="button"
                  onClick={() => setExportCount((count) => count + 10)}
                  className="flex-1 sm:flex-none h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-600 active:scale-95 transition-all shadow-2xs"
                >
                  +10 次
                </button>
                <button
                  type="button"
                  onClick={updateExportCount}
                  disabled={exportCountLoading || exportCount === (user.freeExportCount ?? 0)}
                  className="flex-1 sm:flex-none h-11 rounded-xl bg-violet-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 transition-all shrink-0"
                >
                  {exportCountLoading ? '保存中...' : '保存修改'}
                </button>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setShowVipForm((v) => !v)}
              className={cn(
                'flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 min-h-[44px]',
                showVipForm
                  ? 'bg-violet-100 text-violet-800 border border-violet-300'
                  : 'bg-violet-600 hover:bg-violet-700 active:scale-[0.99] text-white shadow-xs'
              )}
            >
              <Crown className="h-4 w-4" />
              <span>{showVipForm ? '收起 VIP 表单' : '授予 / 调整 VIP'}</span>
            </button>

            {user.vipStatus === 1 && (
              <button
                type="button"
                onClick={resetVip}
                disabled={loading}
                className="py-3 px-4 rounded-xl font-semibold text-sm text-rose-600 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{loading ? '处理中...' : '重置为非VIP'}</span>
              </button>
            )}
          </div>

          {/* Collapsible VIP Form */}
          {showVipForm && (
            <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-violet-100 pb-2">
                <span className="text-xs font-bold text-violet-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                  配置 VIP 方案
                </span>
                <span className="text-[11px] text-violet-600">选择预设或自定义到期时间</span>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium">快速预设</p>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_PRESETS.map((preset) => {
                    const active = vipForm.vipType === preset.vipType;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setVipForm((f) => ({
                          ...f,
                          vipType: preset.vipType,
                          expiryDate: getExpiryDate(preset.days),
                        }))}
                        className={cn(
                          'py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center min-h-[40px]',
                          active
                            ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300'
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">VIP 会员类型</label>
                  <select
                    value={vipForm.vipType}
                    onChange={(e) => setVipForm((f) => ({ ...f, vipType: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-base sm:text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value={1}>月卡会员 (30天)</option>
                    <option value={2}>年卡会员 (365天)</option>
                    <option value={3}>终身会员</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">到期时间</label>
                  <input
                    type="datetime-local"
                    value={vipForm.expiryDate}
                    onChange={(e) => setVipForm((f) => ({ ...f, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-base sm:text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={grantVip}
                disabled={loading}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all shadow-xs disabled:opacity-50 min-h-[44px]"
              >
                {loading ? '保存中...' : '确认授予 / 保存 VIP'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resume Sync / Copy Across Accounts Section */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={toggleCopySection}
          className="w-full flex items-center justify-between p-3 sm:p-5 hover:bg-slate-50/80 active:bg-slate-100/80 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 shrink-0">
              <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-sm sm:text-base block">简历同步 · 跨账号复制</span>
              <span className="text-[11px] sm:text-xs text-slate-400 block mt-0.5">将简历在不同用户账号间快速迁移或复制</span>
            </div>
          </div>
          <div className="p-1 rounded-lg text-slate-400">
            {showCopySection ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </button>

        {showCopySection && (
          <div className="px-4 pb-5 sm:px-6 sm:pb-6 space-y-4 border-t border-slate-100 pt-4 animate-in fade-in duration-200">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {([
                ['to-user', '我的简历 → 他人账号'],
                ['to-current', '他人简历 → 我的账号'],
              ] as [CopyMode, string][]).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleCopyModeChange(mode)}
                  className={cn(
                    'rounded-lg py-2 px-2 text-xs font-semibold transition-all text-center min-h-[38px]',
                    copyMode === mode
                      ? 'bg-white text-violet-700 shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Copy Feedback Alert */}
            {copyMessage && (
              <div
                className={cn(
                  'p-3.5 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm border',
                  copyMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                )}
              >
                {copyMessage.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                )}
                <span className="break-all font-medium leading-relaxed">{copyMessage.text}</span>
              </div>
            )}

            {/* Source Lookup Controls for "To-Current" mode */}
            {copyMode === 'to-current' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-white p-1 border border-slate-200/60">
                  {([
                    ['user', '按来源用户 ID 搜索'],
                    ['resume-name', '按简历内姓名搜索'],
                  ] as [SourceLookupMode, string][]).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleSourceLookupModeChange(mode)}
                      className={cn(
                        'rounded-md py-1.5 px-2 text-xs font-medium transition-all text-center',
                        sourceLookupMode === mode
                          ? 'bg-violet-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {sourceLookupMode === 'user' ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-600">
                      来源用户 ID（Java User ID、wxId 或数据库 ID）
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={sourceUserQuery}
                        onChange={(e) => handleSourceUserQueryChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void fetchSourceUserResumes();
                        }}
                        placeholder="输入来源用户的 ID / wxId"
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-base sm:text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                      />
                      <button
                        type="button"
                        onClick={() => void fetchSourceUserResumes()}
                        disabled={copyLoading || !sourceUserQuery.trim()}
                        className="shrink-0 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs sm:text-sm font-semibold hover:bg-violet-700 active:scale-95 disabled:opacity-50 transition-all min-h-[44px]"
                      >
                        {copyLoading ? '搜索中...' : '搜索简历'}
                      </button>
                    </div>
                    {copySourceUser && (
                      <div className="rounded-lg bg-violet-50/60 border border-violet-100 p-2.5 text-xs text-violet-900 flex flex-wrap gap-x-3 gap-y-1">
                        <span>已找到账号：<strong>{copySourceUser.name || '未命名'}</strong></span>
                        <span>DB ID: <code className="font-mono">{copySourceUser.id}</code></span>
                        {copySourceUser.javaUserId && <span>Java ID: <code className="font-mono">{copySourceUser.javaUserId}</code></span>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-600">
                      简历内的个人姓名
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={resumeNameQuery}
                        onChange={(e) => handleResumeNameQueryChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void fetchSourceResumesByName();
                        }}
                        placeholder="例如：张三 / 李四"
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-base sm:text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                      />
                      <button
                        type="button"
                        onClick={() => void fetchSourceResumesByName()}
                        disabled={copyLoading || !resumeNameQuery.trim()}
                        className="shrink-0 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs sm:text-sm font-semibold hover:bg-violet-700 active:scale-95 disabled:opacity-50 transition-all min-h-[44px]"
                      >
                        {copyLoading ? '搜索中...' : '搜索简历'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resume Selection Cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  {copyMode === 'to-user'
                    ? '选择要复制的简历（当前账号）'
                    : sourceLookupMode === 'resume-name'
                      ? '选择匹配的简历'
                      : '选择要复制的简历（来源账号）'}
                </label>
                {copyMode === 'to-current' && sourceLookupMode === 'user' && copySourceUser && (
                  <button
                    type="button"
                    onClick={() => void fetchSourceUserResumes()}
                    className="text-xs text-violet-600 font-medium hover:text-violet-700"
                  >
                    刷新简历
                  </button>
                )}
              </div>

              {copyMode === 'to-current' && sourceLookupMode === 'user' && !copySourceUser ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs sm:text-sm text-slate-400">
                  请输入来源用户 ID，并点击“搜索简历”
                </div>
              ) : copyMode === 'to-current' && sourceLookupMode === 'resume-name' && !resumeNameQuery.trim() ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs sm:text-sm text-slate-400">
                  请输入简历姓名，并点击“搜索简历”
                </div>
              ) : activeCopyResumes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs sm:text-sm text-slate-400">
                  {copyMode === 'to-user' ? '当前账号暂无简历' : '暂无匹配的简历'}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {activeCopyResumes.map((r) => {
                    const isSelected = selectedResumeId === r.id;
                    return (
                      <label
                        key={r.id}
                        className={cn(
                          'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all min-h-[52px]',
                          isSelected
                            ? 'border-violet-500 bg-violet-50/70 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                      >
                        <input
                          type="radio"
                          name="resume"
                          value={r.id}
                          checked={isSelected}
                          onChange={() => setSelectedResumeId(r.id)}
                          className="mt-1 h-4 w-4 accent-violet-600 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                              {r.title}
                            </span>
                            {r.resumeName && (
                              <span className="rounded bg-violet-100/70 px-1.5 py-0.2 text-[10px] text-violet-700 font-medium">
                                {r.resumeName}
                              </span>
                            )}
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-500 font-mono">
                              {r.template}
                            </span>
                          </div>

                          <p className="mt-1 text-[11px] text-slate-400 break-all leading-normal">
                            ID: <span className="font-mono">{r.id}</span> · 更新于 {new Date(r.updatedAt).toLocaleString('zh-CN')}
                          </p>

                          {copyMode === 'to-current' && sourceLookupMode === 'resume-name' && r.user && (
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              所属用户: {r.user.name || '未命名'}（DB: <span className="font-mono">{r.user.id}</span>{r.user.javaUserId ? ` · Java: ${r.user.javaUserId}` : ''}）
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Target User Input */}
            {copyMode === 'to-user' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">
                  目标接收用户 ID（Java User ID、wxId 或数据库 ID）
                </label>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="输入接收方的 User ID"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-base sm:text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-xs leading-relaxed text-violet-800">
                复制后将在当前登录的管理员账号中生成该简历的独立副本，不会影响对方的原版数据。
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={copyResume}
              disabled={copyButtonDisabled}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-xs hover:bg-violet-700 active:scale-[0.99] disabled:opacity-40 transition-all min-h-[44px]"
            >
              <Copy className="h-4 w-4" />
              {copyLoading
                ? '正在处理复制...'
                : copyMode === 'to-current'
                  ? '确认复制到我的账号'
                  : '确认复制到目标用户'}
            </button>
          </div>
        )}
      </div>

      {/* User List Component from Unified Admin */}
      <UserList onOpenUser={(id) => { void searchUser(String(id)); }} />

      {/* Resume Replace Component from Unified Admin */}
      <ResumeReplace />
    </div>
  );
}
