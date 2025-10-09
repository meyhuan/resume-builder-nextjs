import { useState } from 'react';
import type { ReactElement } from 'react';
import { Briefcase, Pencil, XCircle } from 'lucide-react';
import type { JobIntention } from '@/entities/user/job-intention';
import JobIntentionModal from '@/components/modals/job-intention-modal';
import { useAppStore } from '@/state/store';

/**
 * Display job intention with edit functionality.
 */
export interface JobIntentionViewProps {
  readonly jobIntention: JobIntention | null;
  readonly themeColor: string;
}

export default function JobIntentionView(props: JobIntentionViewProps): ReactElement | null {
  const { jobIntention, themeColor } = props;
  const [showModal, setShowModal] = useState(false);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const updateJobIntention = useAppStore((s) => s.updateJobIntention);

  if (!jobIntention) return null;

  function handleDeleteField(field: string): void {
    if (!jobIntention) return;
    const updated = { ...jobIntention };
    if (field === 'position') updated.position = undefined;
    if (field === 'city') updated.city = undefined;
    if (field === 'salary') updated.salary = undefined;
    if (field === 'type') updated.type = undefined;
    if (field === 'industry') updated.industry = undefined;
    if (field === 'currentStatus') updated.currentStatus = undefined;
    updateJobIntention(updated);
  }

  return (
    <>
      <section
        className="mb-5 relative group cursor-pointer print:cursor-default"
        onClick={(): void => setShowModal(true)}
      >
        <div className="flex items-center gap-2 mb-3 relative">
          <Briefcase size={20} color={themeColor} strokeWidth={2} />
          <h2 className="text-base font-bold" style={{ color: themeColor }}>求职意向</h2>
          <button
            type="button"
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600"
            onClick={(e): void => {
              e.stopPropagation();
              setShowModal(true);
            }}
          >
            <Pencil size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
          {jobIntention.position ? (
            <div
              className="hover:bg-gray-50 rounded px-2 py-1 transition-colors relative"
              onMouseEnter={(): void => setHoveredField('position')}
              onMouseLeave={(): void => setHoveredField(null)}
            >
              <span className="text-gray-600">意向岗位: </span>
              <span className="text-gray-900">{jobIntention.position}</span>
              {hoveredField === 'position' ? (
                <button
                  type="button"
                  className="ml-2 print:hidden text-red-500 hover:text-red-700"
                  onClick={(e): void => {
                    e.stopPropagation();
                    handleDeleteField('position');
                  }}
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
          {jobIntention.city ? (
            <div
              className="hover:bg-gray-50 rounded px-2 py-1 transition-colors relative"
              onMouseEnter={(): void => setHoveredField('city')}
              onMouseLeave={(): void => setHoveredField(null)}
            >
              <span className="text-gray-600">意向城市: </span>
              <span className="text-gray-900">{jobIntention.city}</span>
              {hoveredField === 'city' ? (
                <button
                  type="button"
                  className="ml-2 print:hidden text-red-500 hover:text-red-700"
                  onClick={(e): void => {
                    e.stopPropagation();
                    handleDeleteField('city');
                  }}
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
          {jobIntention.salary ? (
            <div
              className="hover:bg-gray-50 rounded px-2 py-1 transition-colors relative"
              onMouseEnter={(): void => setHoveredField('salary')}
              onMouseLeave={(): void => setHoveredField(null)}
            >
              <span className="text-gray-600">期望薪资: </span>
              <span className="text-gray-900">{jobIntention.salary}</span>
              {hoveredField === 'salary' ? (
                <button
                  type="button"
                  className="ml-2 print:hidden text-red-500 hover:text-red-700"
                  onClick={(e): void => {
                    e.stopPropagation();
                    handleDeleteField('salary');
                  }}
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
          {jobIntention.type ? (
            <div
              className="hover:bg-gray-50 rounded px-2 py-1 transition-colors relative"
              onMouseEnter={(): void => setHoveredField('type')}
              onMouseLeave={(): void => setHoveredField(null)}
            >
              <span className="text-gray-600">求职类型: </span>
              <span className="text-gray-900">{jobIntention.type}</span>
              {hoveredField === 'type' ? (
                <button
                  type="button"
                  className="ml-2 print:hidden text-red-500 hover:text-red-700"
                  onClick={(e): void => {
                    e.stopPropagation();
                    handleDeleteField('type');
                  }}
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
          {jobIntention.industry ? (
            <div
              className="hover:bg-gray-50 rounded px-2 py-1 transition-colors relative"
              onMouseEnter={(): void => setHoveredField('industry')}
              onMouseLeave={(): void => setHoveredField(null)}
            >
              <span className="text-gray-600">期望行业: </span>
              <span className="text-gray-900">{jobIntention.industry}</span>
              {hoveredField === 'industry' ? (
                <button
                  type="button"
                  className="ml-2 print:hidden text-red-500 hover:text-red-700"
                  onClick={(e): void => {
                    e.stopPropagation();
                    handleDeleteField('industry');
                  }}
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
          {jobIntention.currentStatus ? (
            <div
              className="hover:bg-gray-50 rounded px-2 py-1 transition-colors relative"
              onMouseEnter={(): void => setHoveredField('currentStatus')}
              onMouseLeave={(): void => setHoveredField(null)}
            >
              <span className="text-gray-600">当前状态: </span>
              <span className="text-gray-900">{jobIntention.currentStatus}</span>
              {hoveredField === 'currentStatus' ? (
                <button
                  type="button"
                  className="ml-2 print:hidden text-red-500 hover:text-red-700"
                  onClick={(e): void => {
                    e.stopPropagation();
                    handleDeleteField('currentStatus');
                  }}
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {showModal ? (
        <JobIntentionModal
          jobIntention={jobIntention}
          onClose={(): void => setShowModal(false)}
          onSave={updateJobIntention}
        />
      ) : null}
    </>
  );
}
