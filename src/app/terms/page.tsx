import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Metadata } from "next";
import { Scale, CheckCircle, XCircle, CreditCard, RotateCcw, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: '服务条款 - 智简简历',
  description: '智简简历服务条款，了解使用规则、退款政策等内容。',
  alternates: {
    canonical: 'https://aijianli.cn/terms',
  },
};

export default function TermsPage(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-violet-200">
      <LandingHeader forceSolid />
      
      <main className="flex-grow pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full mb-6">
              <Scale className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-violet-700">服务协议</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">服务条款</h1>
            <p className="text-slate-500">最后更新日期：2025年1月</p>
          </div>

          <div className="space-y-8">
            {/* Introduction */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">接受条款</h2>
              <p className="text-slate-600 leading-relaxed">
                欢迎使用智简简历。通过访问或使用我们的服务，您同意受这些服务条款的约束。如果您不同意这些条款，请不要使用我们的服务。
              </p>
            </section>

            {/* Service Description */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">服务描述</h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>智简简历提供以下服务：</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>在线简历编辑和排版</li>
                  <li>AI辅助简历内容生成</li>
                  <li>简历导出为PDF格式</li>
                  <li>简历模板选择和应用</li>
                  <li>简历数据存储和管理</li>
                </ul>
              </div>
            </section>

            {/* Free Services */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">免费服务</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>以下功能对所有用户免费开放：</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>简历编辑和排版（无限制）</li>
                  <li>AI简历生成（每日限额）</li>
                  <li>基础模板使用</li>
                  <li>导出PDF（带水印）</li>
                  <li>数据存储（最多3份简历）</li>
                </ul>
              </div>
            </section>

            {/* VIP Services */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">VIP会员服务</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>VIP会员享有以下特权：</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>无限AI生成次数</li>
                  <li>导出无水印PDF</li>
                  <li>所有高级模板</li>
                  <li>无限简历存储</li>
                  <li>优先客服支持</li>
                </ul>
                <p className="mt-4">
                  VIP服务按周期计费：月卡、年卡或终身会员。具体价格以购买页面显示为准。
                </p>
              </div>
            </section>

            {/* Refund Policy */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-rose-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">退款政策</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>我们提供以下退款保障：</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong>7天无理由退款</strong>：购买VIP后7天内，如未使用任何VIP功能，可申请全额退款</li>
                  <li><strong>服务异常退款</strong>：因系统故障导致服务无法使用，按剩余时间比例退款</li>
                  <li><strong>终身会员</strong>：购买后30天内可退款，超过30天不支持退款</li>
                </ul>
                <p className="text-sm text-slate-500 mt-2">
                  退款申请请发送邮件至 627655140@qq.com，附上订单号和退款原因。
                </p>
              </div>
            </section>

            {/* Prohibited Actions */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">禁止行为</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>使用本服务时，您不得：</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>使用自动化工具批量注册账户</li>
                  <li>试图破解、逆向工程或攻击我们的系统</li>
                  <li>上传违法、侵权或有害内容</li>
                  <li>滥用AI生成功能，发送垃圾或恶意请求</li>
                  <li>转售或共享VIP账户</li>
                  <li>干扰其他用户的正常使用</li>
                </ul>
              </div>
            </section>

            {/* Disclaimer */}
            <section className="bg-amber-50 rounded-2xl p-6 sm:p-8 border border-amber-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">免责声明</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>您理解并同意：</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>我们不对AI生成内容的准确性、完整性或适用性作任何保证</li>
                  <li>您应对简历内容的真实性和合法性负责</li>
                  <li>因不可抗力（如网络故障、自然灾害）导致的服务中断，我们不承担责任</li>
                  <li>我们建议您在正式使用前仔细审核AI生成的内容</li>
                </ul>
              </div>
            </section>

            {/* Account Termination */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">账户终止</h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>我们保留在以下情况下终止您账户的权利：</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>违反服务条款</li>
                  <li>从事欺诈或非法活动</li>
                  <li>长期不活跃的账户（超过2年）</li>
                </ul>
                <p>账户终止后，您的数据将在30天内被删除。</p>
              </div>
            </section>

            {/* Changes */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">条款变更</h2>
              <p className="text-slate-600 leading-relaxed">
                我们可能会不时更新这些服务条款。重大变更将通过邮件或网站公告通知您。继续使用服务即表示您接受更新后的条款。
              </p>
            </section>

            {/* Contact */}
            <section className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl p-6 sm:p-8 border border-violet-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">联系我们</h2>
              <p className="text-slate-600 leading-relaxed">
                如对服务条款有任何疑问，请联系我们：
              </p>
              <div className="mt-4 text-slate-700">
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
