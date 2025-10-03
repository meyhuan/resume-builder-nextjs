import { useState } from 'react';
import type { ReactElement } from 'react';
import type { BaseInfo } from '@/entities/user/base-info';

/**
 * Modal for editing base info fields.
 */
export interface BaseInfoModalProps {
  readonly baseInfo: BaseInfo | null;
  readonly name: string;
  readonly onClose: () => void;
  readonly onSave: (baseInfo: BaseInfo, name: string) => void;
}

export default function BaseInfoModal(props: BaseInfoModalProps): ReactElement {
  const [name, setName] = useState(props.name);
  const [title, setTitle] = useState(props.baseInfo?.title ?? '');
  const [phone, setPhone] = useState(props.baseInfo?.phone ?? '');
  const [email, setEmail] = useState(props.baseInfo?.email ?? '');
  const [gender, setGender] = useState(props.baseInfo?.gender ?? '');
  const [age, setAge] = useState(props.baseInfo?.age?.toString() ?? '');
  const [avatarUrl, setAvatarUrl] = useState(props.baseInfo?.avatarUrl ?? '');
  const [nation, setNation] = useState(props.baseInfo?.nation ?? '');
  const [household, setHousehold] = useState(props.baseInfo?.household ?? '');
  const [currentLocation, setCurrentLocation] = useState(props.baseInfo?.currentLocation ?? '');
  const [workStartTime, setWorkStartTime] = useState(props.baseInfo?.workStartTime ?? '');
  const [politicalStatus, setPoliticalStatus] = useState(props.baseInfo?.politicalStatus ?? '');
  const [height, setHeight] = useState(props.baseInfo?.height ?? '');
  const [weight, setWeight] = useState(props.baseInfo?.weight ?? '');
  const [showMoreFields, setShowMoreFields] = useState(false);

  function handleSave(): void {
    const updatedBaseInfo: BaseInfo = {
      title,
      phone: phone || undefined,
      email: email || undefined,
      gender: gender || undefined,
      age: age ? Number(age) : undefined,
      avatarUrl: avatarUrl || undefined,
      nation: nation || undefined,
      household: household || undefined,
      currentLocation: currentLocation || undefined,
      workStartTime: workStartTime || undefined,
      politicalStatus: politicalStatus || undefined,
      height: height || undefined,
      weight: weight || undefined,
    };
    props.onSave(updatedBaseInfo, name);
    props.onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 print:hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">基本信息</h2>
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
              <label className="block text-sm text-gray-700 mb-1">姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e): void => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">意向岗位</label>
              <input
                type="text"
                value={title}
                onChange={(e): void => setTitle(e.target.value)}
                placeholder="移动端开发工程师"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">性别</label>
              <select
                value={gender}
                onChange={(e): void => setGender(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
              >
                <option value="">请选择</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">头像</label>
              <select
                value={avatarUrl ? 'show' : ''}
                onChange={(e): void => {
                  if (e.target.value === '') {
                    setAvatarUrl('');
                  }
                }}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
              >
                <option value="show">显示</option>
                <option value="">隐藏</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e): void => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">电话</label>
              <input
                type="tel"
                value={phone}
                onChange={(e): void => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">年龄</label>
              <input
                type="number"
                value={age}
                onChange={(e): void => setAge(e.target.value)}
                placeholder="33"
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
                  <label className="block text-sm text-gray-700 mb-1">民族</label>
                  <input
                    type="text"
                    value={nation}
                    onChange={(e): void => setNation(e.target.value)}
                    placeholder="请输入"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">户籍</label>
                  <input
                    type="text"
                    value={household}
                    onChange={(e): void => setHousehold(e.target.value)}
                    placeholder="请输入"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">现所在地</label>
                  <input
                    type="text"
                    value={currentLocation}
                    onChange={(e): void => setCurrentLocation(e.target.value)}
                    placeholder="请输入"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">开始工作时间</label>
                  <input
                    type="text"
                    value={workStartTime}
                    onChange={(e): void => setWorkStartTime(e.target.value)}
                    placeholder="请输入"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">政治面貌</label>
                  <input
                    type="text"
                    value={politicalStatus}
                    onChange={(e): void => setPoliticalStatus(e.target.value)}
                    placeholder="请输入"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">身高</label>
                  <input
                    type="text"
                    value={height}
                    onChange={(e): void => setHeight(e.target.value)}
                    placeholder="身高(cm)"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">体重</label>
                  <input
                    type="text"
                    value={weight}
                    onChange={(e): void => setWeight(e.target.value)}
                    placeholder="体重(kg)"
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
