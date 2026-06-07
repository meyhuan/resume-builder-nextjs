'use client';

import { useEffect, useState } from 'react';
import { Crown, Search, RotateCcw, User, CheckCircle, AlertCircle, LogIn, Shield, Copy, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPublicJavaApiBaseUrl } from '@/lib/java-api-base';
import { clearStoredAdminPassword, getStoredAdminPassword, setStoredAdminPassword } from '@/lib/admin-auth';

const JAVA_API = getPublicJavaApiBaseUrl();

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
  freeExportCount: number;
}

type CopyMode = 'to-user' | 'to-current';

const VIP_TYPES = ['', '月卡', '年卡', '终身'] as const;

const QUICK_PRESETS: Array<{ label: string; vipType: number; days: number }> = [
  { label: '月卡 30天', vipType: 1, days: 30 },
  { label: '年卡 365天', vipType: 2, days: 365 },
  { label: '终身', vipType: 3, days: 36500 },
];

function getExpiryDate(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 16);
}

export default function AdminPage(): React.ReactElement {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showVipForm, setShowVipForm] = useState(false);
  const [showCopySection, setShowCopySection] = useState(false);
  const [copyMode, setCopyMode] = useState<CopyMode>('to-user');
  const [myResumes, setMyResumes] = useState<ResumeItem[]>([]);
  const [sourceUserResumes, setSourceUserResumes] = useState<ResumeItem[]>([]);
  const [sourceUserQuery, setSourceUserQuery] = useState('');
  const [copySourceUser, setCopySourceUser] = useState<CopySourceUser | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [vipForm, setVipForm] = useState<VipFormData>({
    vipType: 1,
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
    freeExportCount: 0,
  });

  useEffect(() => {
    const storedPassword = getStoredAdminPassword();
    if (storedPassword) {
      setPassword(storedPassword);
      setAuthed(true);
    }
  }, []);

  function adminHeaders(): HeadersInit {
    return { 'Content-Type': 'application/json', 'X-Admin-Password': password };
  }

  async function login(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch(`${JAVA_API}/admin/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.status === 100) {
        setStoredAdminPassword(password);
        setAuthed(true);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: '密码错误' });
      }
    } catch {
      setMessage({ type: 'error', text: '登录失败，请检查网络' });
    } finally {
      setLoading(false);
    }
  }

  async function searchUser(): Promise<void> {
    if (!searchValue.trim()) {
      setMessage({ type: 'error', text: '请输入 User ID' });
      return;
    }
    setLoading(true);
    setMessage(null);
    setUser(null);
    try {
      const url = `${JAVA_API}/admin/users/${searchValue.trim()}`;
      const res = await fetch(url, { headers: adminHeaders() });
      const json = await res.json();
      if (!res.ok || json.status !== 100) {
        setMessage({ type: 'error', text: json.message || '用户未找到' });
        return;
      }
      setUser(json.data as UserInfo);
      setShowVipForm(false);
    } catch (err) {
      setMessage({ type: 'error', text: '搜索失败: ' + (err instanceof Error ? err.message : '未知错误') });
    } finally {
      setLoading(false);
    }
  }

  async function grantVip(): Promise<void> {
    if (!user) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${JAVA_API}/admin/users/${user.id}/vip`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({
          vipType: vipForm.vipType,
          expiryDate: vipForm.expiryDate,
          freeExportCount: vipForm.freeExportCount,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 100) {
        setMessage({ type: 'error', text: json.message || '操作失败' });
        return;
      }
      setMessage({ type: 'success', text: 'VIP 已授予' });
      setShowVipForm(false);
      await searchUser();
    } catch (err) {
      setMessage({ type: 'error', text: '操作失败: ' + (err instanceof Error ? err.message : '未知错误') });
    } finally {
      setLoading(false);
    }
  }

  async function loadMyResumes(): Promise<void> {
    setShowCopySection((v) => {
      if (!v) {
        if (copyMode === 'to-user') {
          fetchMyResumes();
        }
      }
      return !v;
    });
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

  async function fetchMyResumes(): Promise<void> {
    try {
      const res = await fetch('/next-api/resumes');
      const json = await res.json();
      if (Array.isArray(json)) {
        setMyResumes(json);
        if (json.length > 0) setSelectedResumeId(json[0].id);
      }
    } catch {
      setCopyMessage({ type: 'error', text: '加载简历列表失败' });
    }
  }

  function handleSourceUserQueryChange(value: string): void {
    setSourceUserQuery(value);
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
    try {
      const params = new URLSearchParams({ userId: query });
      const res = await fetch(`/next-api/admin/copy-resume?${params.toString()}`, {
        headers: { 'X-Admin-Password': password },
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
    if (copyMode === 'to-current' && !sourceUserQuery.trim()) {
      setCopyMessage({ type: 'error', text: '请填写来源用户 ID 并搜索简历' });
      return;
    }
    setCopyLoading(true);
    setCopyMessage(null);
    try {
      const payload = copyMode === 'to-current'
        ? {
            adminPassword: password,
            resumeId: selectedResumeId,
            sourceUserId: sourceUserQuery.trim(),
            direction: 'to-current' as const,
          }
        : {
            adminPassword: password,
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
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${JAVA_API}/admin/users/${user.id}/vip`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 100) {
        setMessage({ type: 'error', text: json.message || '重置失败' });
        return;
      }
      setMessage({ type: 'success', text: 'VIP 已重置' });
      await searchUser();
    } catch (err) {
      setMessage({ type: 'error', text: '重置失败: ' + (err instanceof Error ? err.message : '未知错误') });
    } finally {
      setLoading(false);
    }
  }

  function getVipStatusText(vipStatus: number, vipType: number): string {
    if (vipStatus === 0) return '非VIP';
    return `VIP (${VIP_TYPES[vipType] || '未知'})`;
  }

  const activeCopyResumes: ResumeItem[] = copyMode === 'to-user' ? myResumes : sourceUserResumes;
  const copyButtonDisabled: boolean = copyLoading
    || !selectedResumeId
    || (copyMode === 'to-user' && !targetUserId.trim())
    || (copyMode === 'to-current' && !sourceUserQuery.trim());

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-violet-600" />
            </div>
            <h1 className="font-bold text-slate-800 text-lg">管理后台</h1>
            <p className="text-slate-500 text-sm mt-1">请输入管理员密码</p>
          </div>
          {message && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {message.text}
            </div>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="管理员密码"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-3"
          />
          <button
            onClick={login}
            disabled={loading}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {loading ? '验证中...' : '登录'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-slate-700 text-lg">管理后台</span>
          </div>
          <button onClick={() => { clearStoredAdminPassword(); setPassword(''); setAuthed(false); setUser(null); setMessage(null); }} className="text-sm text-slate-400 hover:text-slate-600">
            退出登录
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="输入 User ID 搜索"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              />
            </div>
            <button
              onClick={searchUser}
              disabled={loading}
              className="px-6 py-3 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {loading ? '搜索中...' : '搜索'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {user && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-violet-200 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-violet-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{user.name || '未命名用户'}</h3>
                <p className="text-sm text-slate-500">ID: {user.id}</p>
              </div>
              <div className="ml-auto">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user.vipStatus === 1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {getVipStatusText(user.vipStatus, user.vipType)}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-6 text-sm">
              {([
                ['OpenID', <span key="o" className="font-mono text-xs">{user.openid}</span>],
                ['VIP 类型', VIP_TYPES[user.vipType] || '-'],
                ['到期时间', user.vipExpireTime ? new Date(user.vipExpireTime).toLocaleString('zh-CN') : '无'],
                ['免费导出次数', String(user.freeExportCount ?? '-')],
              ] as [string, React.ReactNode][]).map(([label, val]) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-700">{val}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowVipForm((v) => !v)}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                授予 VIP
              </button>
              {user.vipStatus === 1 && (
                <button
                  onClick={resetVip}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {loading ? '处理中...' : '重置 VIP'}
                </button>
              )}
            </div>

            {showVipForm && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                {/* Quick presets */}
                <div>
                  <p className="text-xs text-slate-500 mb-2">快速选择</p>
                  <div className="flex gap-2 flex-wrap">
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setVipForm((f) => ({
                          ...f,
                          vipType: preset.vipType,
                          expiryDate: getExpiryDate(preset.days),
                        }))}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                          vipForm.vipType === preset.vipType
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400 hover:text-violet-600',
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">VIP 类型</label>
                  <select
                    value={vipForm.vipType}
                    onChange={(e) => setVipForm((f) => ({ ...f, vipType: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value={1}>月卡</option>
                    <option value={2}>年卡</option>
                    <option value={3}>终身</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">到期时间</label>
                  <input
                    type="datetime-local"
                    value={vipForm.expiryDate}
                    onChange={(e) => setVipForm((f) => ({ ...f, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">免费导出次数</label>
                  <input
                    type="number"
                    min={0}
                    value={vipForm.freeExportCount}
                    onChange={(e) => setVipForm((f) => ({ ...f, freeExportCount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <button
                  onClick={grantVip}
                  disabled={loading}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? '处理中...' : '确认授予'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resume Copy Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
          <button
            onClick={loadMyResumes}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-violet-500" />
              <span className="font-semibold text-slate-700">简历同步 · 账号间复制</span>
            </div>
            {showCopySection ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showCopySection && (
            <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-1">
                {([
                  ['to-user', '我的简历 → 他人账号'],
                  ['to-current', '他人简历 → 我的账号'],
                ] as [CopyMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleCopyModeChange(mode)}
                    className={cn(
                      'rounded-lg px-3 py-2 text-xs font-medium transition-all',
                      copyMode === mode
                        ? 'bg-white text-violet-700 shadow-sm ring-1 ring-violet-100'
                        : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {copyMessage && (
                <div className={`p-3 rounded-xl flex items-start gap-2 text-sm ${
                  copyMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {copyMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span className="break-all">{copyMessage.text}</span>
                </div>
              )}

              {copyMode === 'to-current' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <label className="block text-xs text-slate-500 mb-1.5">来源用户 ID（Java User ID、wxId 或数据库 ID）</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sourceUserQuery}
                      onChange={(e) => handleSourceUserQueryChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void fetchSourceUserResumes();
                      }}
                      placeholder="输入要复制来源的用户 ID / wxId / 数据库 ID"
                      className="min-w-0 flex-1 px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => void fetchSourceUserResumes()}
                      disabled={copyLoading || !sourceUserQuery.trim()}
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                    >
                      搜索简历
                    </button>
                  </div>
                  {copySourceUser && (
                    <div className="mt-2 text-xs leading-relaxed text-slate-500">
                      已加载来源账号：{copySourceUser.name || '未命名用户'}，
                      数据库 ID：<span className="font-mono">{copySourceUser.id}</span>
                      {copySourceUser.javaUserId ? <>，Java ID：<span className="font-mono">{copySourceUser.javaUserId}</span></> : null}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-slate-500">
                    {copyMode === 'to-user' ? '选择要复制的简历（当前账号）' : '选择要复制的简历（来源账号）'}
                  </label>
                  {copyMode === 'to-current' && copySourceUser && (
                    <button
                      type="button"
                      onClick={() => void fetchSourceUserResumes()}
                      className="text-xs text-violet-600 hover:text-violet-700"
                    >
                      重新加载
                    </button>
                  )}
                </div>
                {copyMode === 'to-current' && !copySourceUser ? (
                  <p className="text-sm text-slate-400 py-2">请输入来源用户 ID，并点击“搜索简历”</p>
                ) : activeCopyResumes.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">{copyMode === 'to-user' ? '当前账号暂无简历' : '该用户暂无简历'}</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activeCopyResumes.map((r) => (
                      <label
                        key={r.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                          selectedResumeId === r.id
                            ? 'border-violet-400 bg-violet-50'
                            : 'border-slate-200 hover:border-slate-300',
                        )}
                      >
                        <input
                          type="radio"
                          name="resume"
                          value={r.id}
                          checked={selectedResumeId === r.id}
                          onChange={() => setSelectedResumeId(r.id)}
                          className="accent-violet-600"
                        />
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-700 text-sm truncate">{r.title}</p>
                          <p className="text-xs text-slate-400">{r.template} · {new Date(r.updatedAt).toLocaleString('zh-CN')}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {copyMode === 'to-user' ? (
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">目标用户 ID（Java User ID、wxId 或数据库 ID）</label>
                  <input
                    type="text"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="输入对方的 User ID / wxId / 数据库 ID"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-xs leading-relaxed text-violet-700">
                  来源账号：{copySourceUser ? `${copySourceUser.name || '未命名用户'}（ID: ${copySourceUser.id}）` : '未加载'}。
                  复制后会生成一份新的简历到当前登录的管理账号，不会移动或删除对方原简历。
                </div>
              )}

              <button
                onClick={copyResume}
                disabled={copyButtonDisabled}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {copyLoading ? '复制中...' : copyMode === 'to-current' ? '确认复制到我的账号' : '确认复制到该用户'}
              </button>
            </div>
          )}
        </div>

        {!user && !loading && !message && (
          <div className="text-center py-12 text-slate-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>输入 User ID 搜索用户</p>
          </div>
        )}
      </div>
    </div>
  );
}
