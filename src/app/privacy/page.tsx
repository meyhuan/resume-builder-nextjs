import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Metadata } from "next";
import { Shield, Eye, Database, Share2, Lock, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: '隐私政策 - 智简简历',
  description: '智简简历隐私政策，了解我们如何保护您的个人信息。',
  alternates: {
    canonical: 'https://aijianli.cn/privacy',
  },
};

export default function PrivacyPage(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-violet-200">
      <LandingHeader forceSolid />
      
      <main className="flex-grow pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full mb-6">
              <Shield className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-violet-700">隐私保护</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">隐私政策</h1>
            <p className="text-slate-500">最后更新日期：2025年1月</p>
          </div>

          <div className="space-y-8">
            {/* Introduction */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">引言</h2>
              <p className="text-slate-600 leading-relaxed">
                智简简历（以下简称"我们"）重视您的隐私。本隐私政策说明我们如何收集、使用、存储和保护您的个人信息。使用我们的服务即表示您同意本政策的条款。
              </p>
            </section>

            {/* Information Collection */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">信息收集</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>我们收集的信息包括：</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong>账户信息</strong>：微信授权登录时获取的openid、昵称、头像</li>
                  <li><strong>简历内容</strong>：您填写的个人经历、教育背景、技能等信息</li>
                  <li><strong>使用数据</strong>：功能使用频率、导出次数、AI生成次数</li>
                  <li><strong>设备信息</strong>：IP地址、浏览器类型、操作系统（用于优化服务）</li>
                </ul>
              </div>
            </section>

            {/* Data Usage */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Database className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">信息使用</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>我们使用您的信息用于：</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>提供简历编辑、AI生成、导出PDF等核心功能</li>
                  <li>保存和同步您的简历数据</li>
                  <li>改进产品功能和用户体验</li>
                  <li>发送服务通知（如VIP到期提醒）</li>
                  <li>防止欺诈和滥用行为</li>
                </ul>
              </div>
            </section>

            {/* Data Sharing */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">信息共享</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>我们不会出售您的个人信息。仅在以下情况下共享：</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong>微信服务</strong>：登录授权通过微信开放平台</li>
                  <li><strong>AI服务</strong>：简历内容发送给AI提供商（已脱敏处理）</li>
                  <li><strong>支付服务</strong>：微信支付处理交易（不存储支付信息）</li>
                  <li><strong>法律要求</strong>：应法律法规或政府机关要求</li>
                </ul>
              </div>
            </section>

            {/* Data Security */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-rose-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">数据安全</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>我们采取以下措施保护您的数据：</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>数据传输使用HTTPS加密</li>
                  <li>数据库访问需要身份验证</li>
                  <li>服务器部署在国内，符合数据安全法规</li>
                  <li>定期备份数据，防止数据丢失</li>
                  <li>访问日志记录，便于安全审计</li>
                </ul>
              </div>
            </section>

            {/* User Rights */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">您的权利</h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>您对自己的个人信息拥有以下权利：</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong>访问权</strong>：查看您保存的简历和个人信息</li>
                  <li><strong>修改权</strong>：更新或更正您的信息</li>
                  <li><strong>删除权</strong>：删除您的账户和所有相关数据</li>
                  <li><strong>导出权</strong>：导出您的简历为PDF或其他格式</li>
                </ul>
              </div>
            </section>

            {/* Contact */}
            <section className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl p-6 sm:p-8 border border-violet-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-violet-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">联系我们</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-4">
                如果您对隐私政策有任何疑问，或想行使您的权利，请通过以下方式联系我们：
              </p>
              <div className="text-slate-700">
                <p>邮箱：627655140@qq.com</p>
                <p>微信：kkyycc01</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
