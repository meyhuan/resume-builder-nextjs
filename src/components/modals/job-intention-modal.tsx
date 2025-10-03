import { useState } from 'react';
import type { ReactElement } from 'react';
import type { JobIntention } from '@/entities/user/job-intention';

/**
 * Modal for editing job intention fields.
 */
export interface JobIntentionModalProps {
  readonly jobIntention: JobIntention | null;
  readonly onClose: () => void;
  readonly onSave: (jobIntention: JobIntention) => void;
}

export default function JobIntentionModal(props: JobIntentionModalProps): ReactElement {
  const [position, setPosition] = useState(props.jobIntention?.position ?? '');
  const [city, setCity] = useState(props.jobIntention?.city ?? '');
  const [salary, setSalary] = useState(props.jobIntention?.salary ?? '');
  const [type, setType] = useState(props.jobIntention?.type ?? '');
  const [industry, setIndustry] = useState(props.jobIntention?.industry ?? '');
  const [currentStatus, setCurrentStatus] = useState(props.jobIntention?.currentStatus ?? '');
  const [showMoreFields, setShowMoreFields] = useState(false);

  function handleSave(): void {
    const updatedJobIntention: JobIntention = {
      position: position || undefined,
      city: city || undefined,
      salary: salary || undefined,
      type: type || undefined,
      industry: industry || undefined,
      currentStatus: currentStatus || undefined,
    };
    props.onSave(updatedJobIntention);
    props.onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 print:hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">求职意向</h2>
          <button
            type="button"
            onClick={props.onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">意向岗位</label>
              <input
                type="text"
                value={position}
                onChange={(e): void => setPosition(e.target.value)}
                placeholder="移动端开发工程师"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">意向城市</label>
              <input
                type="text"
                value={city}
                onChange={(e): void => setCity(e.target.value)}
                placeholder="武汉"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">期望薪水</label>
              <input
                type="text"
                value={salary}
                onChange={(e): void => setSalary(e.target.value)}
                placeholder="面议"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">求职类型</label>
              <input
                type="text"
                value={type}
                onChange={(e): void => setType(e.target.value)}
                placeholder="社招"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={(): void => setShowMoreFields(!showMoreFields)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <span>更多信息（选填）</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: showMoreFields ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showMoreFields ? (
            <div className="space-y-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">期望行业</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e): void => setIndustry(e.target.value)}
                    placeholder="请选择"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">当前状态</label>
                  <input
                    type="text"
                    value={currentStatus}
                    onChange={(e): void => setCurrentStatus(e.target.value)}
                    placeholder="请选择"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={props.onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
