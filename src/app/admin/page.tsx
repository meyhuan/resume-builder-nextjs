'use client';

import { useState } from 'react';
import { Crown, Search, RotateCcw, User, CheckCircle, AlertCircle, LogIn, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const JAVA_API = process.env.NEXT_PUBLIC_JAVA_API_BASE_URL || 'https://aijianli.cn/api';

interface UserInfo {
  id: number;
  openid: string;
  name: string | null;
  vipStatus: number;
  vipType: number;
  vipExpireTime: string | null;
  freeExportCount?: number;
}

interface VipFormData {
  vipType: number;
  expiryDate: string;
  freeExportCount: number;
}

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
  const [vipForm, setVipForm] = useState<VipFormData>({
    vipType: 1,
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
    freeExportCount: 0,
  });

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
      setUser(json.data);
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
            <span className="font-bold text-slate-700 text-lg">VIP 管理后台</span>
          </div>
          <button onClick={() => { setAuthed(false); setUser(null); setMessage(null); }} className="text-sm text-slate-400 hover:text-slate-600">
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
