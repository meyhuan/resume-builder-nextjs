'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCookie } from 'cookies-next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WxLoginDialog } from '@/components/auth/WxLoginDialog';
import { LogIn, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showWxLogin, setShowWxLogin] = useState(false);
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    // If already logged in, redirect to target page
    const authToken = getCookie('auth_uid');
    if (authToken) {
      router.push(redirectPath);
    }
  }, [redirectPath, router]);

  const handleLoginSuccess = () => {
    // Redirect to the original page after successful login
    router.push(redirectPath);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-50">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-500/10 rounded-full blur-[100px] animate-pulse-slow [animation-delay:2s]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to home link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 mb-8 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </div>
          返回首页
        </Link>

        <Card className="shadow-2xl shadow-violet-500/10 border-white/60 bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          
          <CardHeader className="space-y-4 text-center pb-8 pt-10">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-3xl flex items-center justify-center shadow-lg shadow-violet-500/30 rotate-3 transition-transform hover:rotate-0 hover:scale-105 duration-300">
              <LogIn className="w-10 h-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                欢迎回来
              </CardTitle>
              <CardDescription className="text-base mt-2 text-slate-500">
                {redirectPath !== '/dashboard' ? (
                  <>继续访问 <span className="font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded">{redirectPath}</span></>
                ) : (
                  '登录以解锁所有 AI 功能'
                )}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-8 pb-10">
            <Button
              onClick={() => setShowWxLogin(true)}
              className="w-full h-14 text-base font-bold bg-[#07C160] hover:bg-[#06ad56] text-white shadow-lg shadow-green-500/20 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              size="lg"
            >
              <svg className="w-6 h-6 mr-2 fill-white" viewBox="0 0 24 24">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
              </svg>
              微信一键登录
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="px-4 bg-white/0 text-slate-400 font-medium bg-white">Or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed hover:bg-slate-50"
              size="lg"
              disabled
            >
              更多登录方式即将开放
            </Button>

            <p className="text-xs text-center text-slate-400 pt-2">
              登录即表示同意我们的
              <Link href="/terms" className="text-violet-600 hover:text-violet-700 hover:underline mx-1 font-medium">
                服务条款
              </Link>
              和
              <Link href="/privacy" className="text-violet-600 hover:text-violet-700 hover:underline ml-1 font-medium">
                隐私政策
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Feature highlights */}
        <div className="mt-12 grid grid-cols-3 gap-6 text-center">
          <div className="space-y-3 group cursor-default">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-slate-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <span className="text-2xl group-hover:animate-bounce">🎨</span>
            </div>
            <p className="text-xs font-medium text-slate-600">海量模板</p>
          </div>
          <div className="space-y-3 group cursor-default">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-slate-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <span className="text-2xl group-hover:animate-spin-slow">⚡</span>
            </div>
            <p className="text-xs font-medium text-slate-600">AI 极速生成</p>
          </div>
          <div className="space-y-3 group cursor-default">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-slate-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <span className="text-2xl group-hover:animate-pulse">💯</span>
            </div>
            <p className="text-xs font-medium text-slate-600">永久免费</p>
          </div>
        </div>
      </div>

      {/* WeChat Login Dialog */}
      {showWxLogin && (
        <WxLoginDialog
          isOpen={showWxLogin}
          onClose={() => setShowWxLogin(false)}
          onSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
