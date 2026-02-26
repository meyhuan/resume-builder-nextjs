'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Shield, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type LegalTab = 'privacy' | 'terms';

interface LegalDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialTab?: LegalTab;
}

/**
 * Modal dialog displaying Privacy Policy and Terms of Service
 * with tab switching, no page navigation needed.
 */
export const LegalDialog: React.FC<LegalDialogProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  // Sync initialTab when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[680px] max-h-[85vh] p-0 border-none overflow-hidden bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-white/50">
        <div className="relative flex flex-col max-h-[85vh]">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all z-20"
          >
            <X size={18} />
          </button>

          {/* Header with tabs */}
          <div className="px-8 pt-8 pb-0 shrink-0">
            <DialogTitle className="text-xl font-bold text-slate-900 mb-6">
              法律条款
            </DialogTitle>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('privacy')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                  activeTab === 'privacy'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Shield className="w-4 h-4" />
                隐私协议
              </button>
              <button
                onClick={() => setActiveTab('terms')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                  activeTab === 'terms'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <FileText className="w-4 h-4" />
                服务条款
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 text-slate-600 leading-relaxed">
            {activeTab === 'privacy' ? <PrivacyContent /> : <TermsContent />}
            <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
              智简简历 (aijianli.cn) — 完全免费的在线 AI 简历制作平台
              <br />
              最后更新：2025 年 2 月
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Section heading helper ─── */
interface SectionHeadingProps {
  readonly index: number;
  readonly title: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ index, title }) => (
  <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
    <span className="w-6 h-6 rounded-md bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-black shrink-0">
      {index}
    </span>
    {title}
  </h2>
);

/* ─── Privacy content ─── */
const PrivacyContent: React.FC = () => (
  <>
    <section>
      <SectionHeading index={1} title="引言" />
      <p className="pl-8 text-sm">
        欢迎使用智简简历（以下简称「本平台」，网址：aijianli.cn）。本协议是本平台与用户之间关于个人信息收集、使用、共享及保护的约定。用户注册或使用本平台服务，即表示同意本协议内容。
      </p>
    </section>

    <section>
      <SectionHeading index={2} title="个人信息收集与使用" />
      <div className="space-y-3 pl-8">
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-1">收集范围</h3>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>注册时：</strong>需提供微信授权等必要信息用于账号验证与登录。</li>
            <li><strong>服务过程中：</strong>可能收集简历内容、模板使用记录、操作日志等信息，用于优化服务体验、提供 AI 功能（如智能生成简历、AI 润色）及账户安全管理。</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-1">使用目的</h3>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>提供简历制作、模板选择、AI 生成/润色/排版、免费导出 PDF/图片/Markdown 等核心服务。</li>
            <li>发送服务通知（如系统更新、功能上线）。</li>
            <li>保障平台安全，防范欺诈或非法行为。</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-1">信息共享与存储</h3>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>不会向第三方出售用户个人信息，仅在必要时（如技术服务商）共享最小化必要信息，且要求第三方遵守保密义务。</li>
            <li>个人信息存储期限为用户使用服务期间及法律规定的合理期限，过期后将匿名化处理或删除。</li>
          </ul>
        </div>
      </div>
    </section>

    <section>
      <SectionHeading index={3} title="用户权利" />
      <ol className="list-decimal pl-12 space-y-2 text-xs">
        <li>可随时登录账号查看、更正个人信息，或联系客服申请删除冗余信息（法律法规另有规定除外）。</li>
        <li>可拒绝提供非必要信息，但可能影响部分功能使用（如未授权微信登录则无法注册）。</li>
        <li>
          发现个人信息泄露时，可立即联系本平台（邮箱：
          <a href="mailto:627655140@qq.com" className="text-violet-600 hover:underline">627655140@qq.com</a>
          ，微信：<span className="font-medium text-slate-700">kkyycc01</span>），我们将采取必要措施处理。
        </li>
      </ol>
    </section>

    <section>
      <SectionHeading index={4} title="Cookie 与分析工具" />
      <div className="pl-8 text-xs space-y-1.5">
        <p>本平台使用 Cookie 来维持登录状态和记录必要的会话信息。</p>
        <p>本平台可能使用百度统计等第三方分析工具收集匿名访问数据（如页面浏览量、设备类型），用于改善服务体验。这些工具不会收集您的个人身份信息。</p>
      </div>
    </section>

    <section>
      <SectionHeading index={5} title="未成年人保护" />
      <p className="pl-8 text-xs">
        若用户为未成年人，需在监护人同意下使用本平台服务。本平台不会主动收集未成年人个人信息，若发现违规注册，将依法删除相关数据。
      </p>
    </section>

    <section>
      <SectionHeading index={6} title="隐私协议更新" />
      <p className="pl-8 text-xs">
        本平台有权根据法律法规或业务调整更新隐私协议，更新内容将通过官网公告通知用户。用户继续使用服务即视为接受更新后的协议。
      </p>
    </section>
  </>
);

/* ─── Terms content ─── */
const TermsContent: React.FC = () => (
  <>
    <section>
      <SectionHeading index={1} title="服务内容与注册规则" />
      <div className="space-y-3 pl-8">
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-1">服务范围</h3>
          <p className="text-xs">本平台提供完全免费的在线简历制作服务，包括但不限于：</p>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
            <li>多款精美简历模板免费使用</li>
            <li>AI 智能生成简历内容</li>
            <li>AI 简历润色与优化</li>
            <li>AI 文本转简历（导入已有简历并重新排版）</li>
            <li>免费导出 PDF、图片、Markdown 格式</li>
            <li>求职攻略与面试技巧分享</li>
          </ul>
          <p className="mt-1.5 text-xs font-medium text-violet-600">所有功能完全免费，无隐藏收费。</p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-1">注册要求</h3>
          <p className="text-xs">用户需提供真实有效信息注册，不得冒用他人身份或违反法律法规。账号仅限本人使用，不得出租、转让或共享，因账号泄露导致的损失由用户自行承担。</p>
        </div>
      </div>
    </section>

    <section>
      <SectionHeading index={2} title="用户义务" />
      <ol className="list-decimal pl-12 space-y-2 text-xs">
        <li>不得利用本平台制作违法违规内容（如虚假简历、侵权信息），违者本平台有权封禁账号并追究法律责任。</li>
        <li>尊重平台知识产权，不得篡改、反编译代码或复制模板用于商业用途。</li>
        <li>遵守平台秩序，不得恶意刷取数据、滥用 AI 接口或干扰服务正常运行。</li>
        <li>用户上传的简历内容应真实准确，因虚假信息导致的后果由用户自行承担。</li>
      </ol>
    </section>

    <section>
      <SectionHeading index={3} title="知识产权声明" />
      <ol className="list-decimal pl-12 space-y-2 text-xs">
        <li>本平台提供的简历模板、UI 设计、AI 算法等均为平台知识产权，用户仅享有个人使用权。</li>
        <li>用户创建的简历内容归用户所有，平台不会将用户简历内容用于商业目的。</li>
      </ol>
    </section>

    <section>
      <SectionHeading index={4} title="服务变更与终止" />
      <ol className="list-decimal pl-12 space-y-2 text-xs">
        <li>本平台有权根据技术升级或政策调整暂停、变更或终止部分服务，将提前通过官网公告通知用户。</li>
        <li>若用户违反本条款，本平台有权采取警告、限制功能、封禁账号等措施。</li>
      </ol>
    </section>

    <section>
      <SectionHeading index={5} title="免责声明" />
      <ol className="list-decimal pl-12 space-y-2 text-xs">
        <li>本平台提供的 AI 生成内容仅供参考，用户应自行核实简历信息的准确性和真实性。</li>
        <li>因不可抗力（如网络故障、服务器维护、第三方服务中断）导致的服务中断，本平台不承担责任。</li>
        <li>用户使用本平台制作的简历进行求职，求职结果由用户自行负责。</li>
      </ol>
    </section>

    <section>
      <SectionHeading index={6} title="争议解决" />
      <p className="pl-8 text-xs">
        本协议适用中华人民共和国法律。若发生争议，双方应先友好协商；协商不成的，任何一方均有权向平台运营方所在地有管辖权的人民法院提起诉讼。
      </p>
    </section>

    <section>
      <SectionHeading index={7} title="联系方式" />
      <div className="pl-8 text-xs space-y-1">
        <p>如有任何疑问，请通过以下方式联系我们：</p>
        <p>客服邮箱：<a href="mailto:627655140@qq.com" className="text-violet-600 hover:underline">627655140@qq.com</a></p>
        <p>客服微信：<span className="font-medium text-slate-700">kkyycc01</span></p>
        <p>工作时间：周一至周日 9:00 – 21:00</p>
      </div>
    </section>
  </>
);
