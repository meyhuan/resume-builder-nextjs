'use client';

import { useEffect, useState } from 'react';
import { Crown, Search, RotateCcw, User, CheckCircle, AlertCircle } from 'lucide-react';

interface UserInfo {
  id: number;
  openid: string;
  name: string | null;
  vipStatus: number;
  vipType: number;
  vipExpireTime: string | null;
}

export default function AdminPage(): React.ReactElement {
  const [searchType, setSearchType] = useState<'openid' | 'userid'>('userid');
  const [searchValue, setSearchValue] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load current user ID on mount
  useEffect(() => {
    fetch('/next-api/vip/info')
      .then(res => res.json())
      .then(json => {
        if (json.data?.userId) {
          setSearchValue(String(json.data.userId));
        }
      })
      .catch(() => {
        // silent fail
      });
  }, []);

  async function searchUser(): Promise<void> {
    if (!searchValue.trim()) {
      setMessage({ type: 'error', text: '请输入搜索值' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setUser(null);

    try {
      const endpoint = searchType === 'openid'
        ? `/api/debug/find-by-openid/${encodeURIComponent(searchValue)}`
        : `/api/debug/find-by-id/${searchValue}`;

      const res = await fetch(endpoint);
      const json = await res.json();

      if (!res.ok || json.status !== 200) {
        setMessage({ type: 'error', text: json.message || '用户未找到' });
        return;
      }

      setUser(json.data);
      setMessage({ type: 'success', text: '用户找到' });
    } catch (err) {
      setMessage({ type: 'error', text: '搜索失败: ' + (err instanceof Error ? err.message : '未知错误') });
    } finally {
      setLoading(false);
    }
  }

  async function resetVip(): Promise<void> {
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      const endpoint = searchType === 'openid'
        ? `/api/debug/reset-vip/${encodeURIComponent(user.openid)}`
        : `/api/debug/reset-vip-by-id/${user.id}`;

      const res = await fetch(endpoint, { method: 'POST' });
      const json = await res.json();

      if (!res.ok || json.status !== 200) {
        setMessage({ type: 'error', text: json.message || '重置失败' });
        return;
      }

      // Refresh user info
      await searchUser();
      setMessage({ type: 'success', text: 'VIP状态已重置' });
    } catch (err) {
      setMessage({ type: 'error', text: '重置失败: ' + (err instanceof Error ? err.message : '未知错误') });
    } finally {
      setLoading(false);
    }
  }

  function getVipStatusText(vipStatus: number, vipType: number): string {
    if (vipStatus === 0) return '非VIP';
    const types = ['', '月卡', '年卡', '终身'];
    return `VIP (${types[vipType] || '未知'})`;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-4">
            <Crown className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-slate-700">VIP 管理后台</span>
          </div>
          <p className="text-slate-500">搜索用户并重置 VIP 状态</p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setSearchType('openid'); setSearchValue(''); setUser(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchType === 'openid'
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              OpenID
            </button>
            <button
              onClick={() => { setSearchType('userid'); setSearchValue(''); setUser(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchType === 'userid'
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              User ID
            </button>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={searchType === 'openid' ? '输入 OpenID...' : '输入 User ID...'}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              />
            </div>
            <button
              onClick={searchUser}
              disabled={loading}
              className="px-6 py-3 bg-rose-500 text-white font-medium rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '搜索中...' : '搜索'}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* User Info Card */}
        {user && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-rose-200 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-rose-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{user.name || '未命名用户'}</h3>
                <p className="text-sm text-slate-500">ID: {user.id}</p>
              </div>
              <div className="ml-auto">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user.vipStatus === 1
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {getVipStatusText(user.vipStatus, user.vipType)}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">OpenID</span>
                <span className="font-mono text-sm text-slate-700">{user.openid}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">VIP 状态</span>
                <span className="font-medium text-slate-700">{user.vipStatus === 1 ? 'VIP' : '非VIP'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">VIP 类型</span>
                <span className="font-medium text-slate-700">
                  {user.vipType === 1 ? '月卡' : user.vipType === 2 ? '年卡' : user.vipType === 3 ? '终身' : '-'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">到期时间</span>
                <span className="font-medium text-slate-700">
                  {user.vipExpireTime ? new Date(user.vipExpireTime).toLocaleString('zh-CN') : '无'}
                </span>
              </div>
            </div>

            {user.vipStatus === 1 && (
              <button
                onClick={resetVip}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {loading ? '处理中...' : '重置 VIP 状态'}
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!user && !loading && !message && (
          <div className="text-center py-12 text-slate-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>输入 OpenID 或 User ID 搜索用户</p>
          </div>
        )}
      </div>
    </div>
  );
}
