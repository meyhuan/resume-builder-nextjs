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
              Legal
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
                Privacy Policy
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
                Terms of Service
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 text-slate-600 leading-relaxed">
            {activeTab === 'privacy' ? <PrivacyContent /> : <TermsContent />}
            <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
              AI Resume Pass (airesumepass.com) — Free online AI resume builder
              <br />
              Last updated: February 2025
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
      <SectionHeading index={1} title="Introduction" />
      <p className="pl-8 text-sm">
        Welcome to AI Resume Pass (hereinafter referred to as &quot;the Platform&quot;, URL: airesumepass.com). This agreement governs the collection, use, sharing, and protection of personal information between the Platform and its users. By registering or using the Platform&apos;s services, you agree to the terms of this agreement.
      </p>
    </section>

    <section>
      <SectionHeading index={2} title="Personal Information Collection & Use" />
      <div className="space-y-3 pl-8">
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-1">Scope of Collection</h3>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Registration:</strong> Required information such as authentication credentials for account verification and login.</li>
            <li><strong>During use:</strong> Resume content, template usage records, and activity logs may be collected to optimize the experience, provide AI features (e.g., resume generation, AI polishing), and manage account security.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-1">Purpose of Use</h3>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Provide core services including resume creation, template selection, AI generation/polishing/formatting, and free export to PDF/image/Markdown.</li>
            <li>Send service notifications (e.g., system updates, new features).</li>
            <li>Ensure platform security and prevent fraud or illegal activities.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-1">Information Sharing & Storage</h3>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>We do not sell personal information to third parties. Information is shared only when necessary (e.g., with technical service providers) on a minimal basis, and third parties are required to maintain confidentiality.</li>
            <li>Personal information is retained for the duration of service use and a reasonable period as required by law. After expiration, data will be anonymized or deleted.</li>
          </ul>
        </div>
      </div>
    </section>

    <section>
      <SectionHeading index={3} title="User Rights" />
      <ol className="list-decimal pl-12 space-y-2 text-xs">
        <li>You may view and correct your personal information at any time by logging in, or contact support to request access, correction, export, or deletion of your account data, subject to legal retention requirements.</li>
        <li>You may decline to provide non-essential information, and you may decline optional analytics cookies without losing access to core resume-building features.</li>
        <li>
          If you discover a personal information breach, contact the Platform immediately (email:
          <a href="mailto:support@airesumepass.com" className="text-violet-600 hover:underline"> support@airesumepass.com</a>
          ). We will take necessary measures to address the issue.
        </li>
      </ol>
    </section>

    <section>
      <SectionHeading index={4} title="Cookies & Analytics" />
      <div className="pl-8 text-xs space-y-1.5">
        <p>The Platform uses cookies to maintain login status and record necessary session information.</p>
        <p>The Platform uses optional analytics tools (e.g., Google Analytics) only after you provide consent through the cookie banner. These tools collect aggregated usage information such as page views, approximate location, device type, and referrer data.</p>
        <p>You can decline analytics tracking or change your choice later by clearing your browser storage and revisiting the site. Core product functionality is available even if you decline analytics.</p>
      </div>
    </section>

    <section>
      <SectionHeading index={5} title="Protection of Minors" />
      <p className="pl-8 text-xs">
        Minors must use the Platform&apos;s services with the consent of a guardian. The Platform does not actively collect personal information from minors. If unauthorized registration is discovered, related data will be deleted in accordance with the law.
      </p>
    </section>

    <section>
      <SectionHeading index={6} title="Data Deletion Requests" />
      <p className="pl-8 text-xs">
        If you want your account data removed, contact
        <a href="mailto:support@airesumepass.com" className="text-violet-600 hover:underline"> support@airesumepass.com</a>
        {' '}from your account email address with the subject line &quot;Delete My Data&quot;. We will review and process eligible requests within a reasonable time.
      </p>
    </section>

    <section>
      <SectionHeading index={7} title="Privacy Policy Updates" />
      <p className="pl-8 text-xs">
        The Platform reserves the right to update this privacy policy in accordance with legal or operational changes. Updates will be communicated via announcements on the website. Continued use of the service constitutes acceptance of the updated policy.
      </p>
    </section>
  </>
);

/* ─── Terms content ─── */
const TermsContent: React.FC = () => (
  <>
    <section>
      <SectionHeading index={1} title="Service Description & Registration" />
      <div className="space-y-3 pl-8">
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-1">Scope of Services</h3>
          <p className="text-xs">The Platform provides free online resume building services, including but not limited to:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
            <li>Multiple professionally designed resume templates</li>
            <li>AI-powered resume content generation</li>
            <li>AI resume polishing and optimization</li>
            <li>AI text-to-resume (import existing resume and reformat)</li>
            <li>Free export to PDF, image, and Markdown formats</li>
            <li>Career tips and interview advice</li>
          </ul>
          <p className="mt-1.5 text-xs font-medium text-violet-600">All features are completely free with no hidden charges.</p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-1">Registration Requirements</h3>
          <p className="text-xs">Users must provide authentic information to register and must not impersonate others or violate any laws. Accounts are for personal use only and may not be rented, transferred, or shared. Users are responsible for any losses resulting from account compromise.</p>
        </div>
      </div>
    </section>

    <section>
      <SectionHeading index={2} title="User Obligations" />
      <ol className="list-decimal pl-12 space-y-2 text-xs">
        <li>Users must not use the Platform to create illegal or infringing content (e.g., fraudulent resumes). Violators may have their accounts suspended and may face legal action.</li>
        <li>Users must respect the Platform&apos;s intellectual property and must not modify, decompile, or copy templates for commercial use.</li>
        <li>Users must maintain platform order and must not abuse data, misuse AI APIs, or interfere with normal service operations.</li>
        <li>Resume content uploaded by users should be truthful and accurate. Users are responsible for any consequences arising from false information.</li>
      </ol>
    </section>

    <section>
      <SectionHeading index={3} title="Intellectual Property" />
      <ol className="list-decimal pl-12 space-y-2 text-xs">
        <li>Resume templates, UI designs, and AI algorithms provided by the Platform are the intellectual property of the Platform. Users have only a personal, non-commercial license to use them.</li>
        <li>Resume content created by users belongs to the users. The Platform will not use user resume content for commercial purposes.</li>
      </ol>
    </section>

    <section>
      <SectionHeading index={4} title="Service Changes & Termination" />
      <ol className="list-decimal pl-12 space-y-2 text-xs">
        <li>The Platform reserves the right to suspend, modify, or terminate services due to technical upgrades or policy changes, with advance notice via website announcements.</li>
        <li>If users violate these terms, the Platform may issue warnings, restrict features, or suspend accounts.</li>
      </ol>
    </section>

    <section>
      <SectionHeading index={5} title="Disclaimer" />
      <ol className="list-decimal pl-12 space-y-2 text-xs">
        <li>AI-generated content provided by the Platform is for reference only. Users should verify the accuracy and authenticity of resume information.</li>
        <li>The Platform is not liable for service interruptions caused by force majeure (e.g., network failures, server maintenance, third-party service outages).</li>
        <li>Users are solely responsible for the outcomes of job applications made using resumes created on the Platform.</li>
      </ol>
    </section>

    <section>
      <SectionHeading index={6} title="Dispute Resolution" />
      <p className="pl-8 text-xs">
        This agreement is governed by applicable law. In the event of a dispute, both parties shall first attempt to resolve it through friendly negotiation. If negotiation fails, either party may seek resolution through appropriate legal channels.
      </p>
    </section>

    <section>
      <SectionHeading index={7} title="Contact Us" />
      <div className="pl-8 text-xs space-y-1">
        <p>If you have any questions, please contact us:</p>
        <p>Email: <a href="mailto:support@airesumepass.com" className="text-violet-600 hover:underline">support@airesumepass.com</a></p>
      </div>
    </section>
  </>
);
