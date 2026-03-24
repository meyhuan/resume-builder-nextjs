import type { ReactElement } from 'react';
import { ConceptDocStampBlue } from '@/components/ui/logo-concepts/concept-doc-stamp-blue';
import { ConceptDocStampCoral } from '@/components/ui/logo-concepts/concept-doc-stamp-coral';
import { ConceptDocStampGold } from '@/components/ui/logo-concepts/concept-doc-stamp-gold';
import { ConceptDocStampGreen } from '@/components/ui/logo-concepts/concept-doc-stamp-green';
import { ConceptDocStampPurple } from '@/components/ui/logo-concepts/concept-doc-stamp-purple';
import { ConceptDocStampTeal } from '@/components/ui/logo-concepts/concept-doc-stamp-teal';

interface LogoConceptItem {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly rationale: string;
  readonly strengths: readonly string[];
  readonly component: ReactElement;
}

const LOGO_CONCEPTS: readonly LogoConceptItem[] = [
  {
    id: 'doc-stamp-green',
    title: '1 · Green Checkmark',
    summary: 'Document + emerald green circle stamp with a checkmark.',
    rationale: 'Green is the universal "approved" color. Clear, confident, and immediately understood.',
    strengths: ['Most universal approval', 'Clean and confident', 'High contrast stamp'],
    component: <ConceptDocStampGreen className="h-24 w-24" />,
  },
  {
    id: 'doc-stamp-gold',
    title: '2 · Gold Star',
    summary: 'Document + amber/gold circle stamp with a star emblem.',
    rationale: 'Gold communicates premium quality — your resume earns a gold star from AI.',
    strengths: ['Most premium feel', 'Strong quality signal', 'Warm and inviting'],
    component: <ConceptDocStampGold className="h-24 w-24" />,
  },
  {
    id: 'doc-stamp-blue',
    title: '3 · Blue "P" Badge',
    summary: 'Document + indigo blue rounded-square badge with letter "P".',
    rationale: 'The "P" stands for Pass — tech-forward, modern, and directly branded.',
    strengths: ['Direct brand letter', 'Most tech-modern', 'Strong app icon shape'],
    component: <ConceptDocStampBlue className="h-24 w-24" />,
  },
  {
    id: 'doc-stamp-coral',
    title: '4 · Coral "PASS" Seal',
    summary: 'Document + warm coral circle stamp with double ring and "PASS" text.',
    rationale: 'A passport-style seal in a warm tone — friendly yet authoritative.',
    strengths: ['Has PASS text', 'Warm personality', 'Passport stamp aesthetic'],
    component: <ConceptDocStampCoral className="h-24 w-24" />,
  },
  {
    id: 'doc-stamp-purple',
    title: '5 · Purple Shield',
    summary: 'Document + deep purple shield stamp with a checkmark inside.',
    rationale: 'Shield conveys protection and trust. Purple matches the brand gradient for cohesion.',
    strengths: ['Best brand color match', 'Trust + protection', 'Elegant shape'],
    component: <ConceptDocStampPurple className="h-24 w-24" />,
  },
  {
    id: 'doc-stamp-teal',
    title: '6 · Teal Arrow Diamond',
    summary: 'Document + teal diamond stamp with a forward arrow.',
    rationale: 'Diamond shape stands out. Arrow adds motion — your resume moves forward.',
    strengths: ['Most unique shape', 'Forward motion feel', 'Fresh color contrast'],
    component: <ConceptDocStampTeal className="h-24 w-24" />,
  },
] as const;

function LogoConceptCard({ concept }: { readonly concept: LogoConceptItem }): ReactElement {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{concept.title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{concept.summary}</p>
        </div>
        <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-slate-50 ring-1 ring-slate-100">
          {concept.component}
        </div>
      </div>
      <p className="mt-6 text-sm leading-6 text-slate-700">{concept.rationale}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {concept.strengths.map((strength: string) => (
          <div key={strength} className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700">
            {strength}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LogoLabPage(): ReactElement {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600">AI Resume Pass</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">Logo concept comparison</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            AI Document base + small stamp badge in 6 different colors and styles. Same document, different stamp personality.
          </p>
        </div>
        <div className="mt-10 grid gap-6">
          {LOGO_CONCEPTS.map((concept: LogoConceptItem) => (
            <LogoConceptCard key={concept.id} concept={concept} />
          ))}
        </div>
      </div>
    </main>
  );
}
