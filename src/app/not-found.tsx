import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Clock } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-extrabold text-slate-900 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">页面未找到</h2>
        <p className="text-slate-600 mb-8 leading-relaxed">
          抱歉，你访问的页面不存在。<br />
          如果你正在寻找<strong className="text-slate-800">以前创建的旧版简历</strong>，因为系统全新升级，请前往旧版网站查看。
        </p>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto rounded-full px-6 bg-slate-900 hover:bg-slate-800 text-white">
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
          
          <a href="https://w2025.aijianli.cn" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full sm:w-auto rounded-full px-6 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800">
              <Clock className="w-4 h-4 mr-2" />
              找回旧版简历
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
