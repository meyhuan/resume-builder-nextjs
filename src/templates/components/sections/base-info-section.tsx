import { useState, type ReactElement } from 'react'
import { Phone, Mail, User, Calendar, Pencil, XCircle, MapPin } from 'lucide-react'
import type { BaseInfo } from '@/entities/user/base-info'
import BaseInfoModal from '@/components/modals/base-info-modal'
import { useAppStore } from '@/state/store'
import type { TemplateVariant } from '../block-renderers/types'

export interface BaseInfoSectionProps {
  readonly name: string
  readonly baseInfo: BaseInfo | null
  readonly themeColor: string
  readonly variant: TemplateVariant
}

/**
 * 基础信息区块 - 支持多种视觉风格
 */
export default function BaseInfoSection(props: BaseInfoSectionProps): ReactElement {
  const { name, baseInfo, themeColor, variant } = props
  const [showModal, setShowModal] = useState(false)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const updateBaseInfo = useAppStore((s) => s.updateBaseInfo)

  function handleDeleteField(field: string): void {
    if (!baseInfo) return
    const updated = { ...baseInfo }
    if (field === 'phone') updated.phone = undefined
    if (field === 'email') updated.email = undefined
    if (field === 'gender') updated.gender = undefined
    if (field === 'age') updated.age = undefined
    if (field === 'nation') updated.nation = undefined
    if (field === 'household') updated.household = undefined
    if (field === 'currentLocation') updated.currentLocation = undefined
    if (field === 'workStartTime') updated.workStartTime = undefined
    if (field === 'politicalStatus') updated.politicalStatus = undefined
    if (field === 'height') updated.height = undefined
    if (field === 'weight') updated.weight = undefined
    updateBaseInfo(updated, name)
  }

  if (variant === 'creative') {
    return (
      <>
        <header className="relative group cursor-pointer" onClick={(): void => setShowModal(true)}>
          <button
            type="button"
            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600 z-10"
            onClick={(e): void => {
              e.stopPropagation()
              setShowModal(true)
            }}
          >
            <Pencil size={18} />
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-6 relative overflow-hidden">
            <div
              className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20"
              style={{ backgroundColor: themeColor }}
            />

            <div className="relative flex items-center gap-6">
              <div
                className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg"
                style={{
                  background: baseInfo?.avatarUrl
                    ? 'transparent'
                    : `linear-gradient(135deg, ${themeColor}, ${themeColor}99)`,
                }}
              >
                {baseInfo?.avatarUrl ? (
                  <img src={baseInfo.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                    {name[0]}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2" style={{ color: themeColor }}>
                  {name}
                </h1>

                {baseInfo?.title ? (
                  <div className="text-base text-gray-600 mb-3 font-medium">{baseInfo.title}</div>
                ) : null}

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
                  {baseInfo?.phone ? (
                    <div className="flex items-center gap-1.5">
                      <Phone size={16} strokeWidth={2} />
                      <span>{baseInfo.phone}</span>
                    </div>
                  ) : null}

                  {baseInfo?.email ? (
                    <div className="flex items-center gap-1.5">
                      <Mail size={16} strokeWidth={2} />
                      <span>{baseInfo.email}</span>
                    </div>
                  ) : null}

                  {baseInfo?.gender ? <span>性别：{baseInfo.gender}</span> : null}

                  {typeof baseInfo?.age === 'number' ? <span>年龄：{baseInfo.age}</span> : null}

                  {baseInfo?.currentLocation ? (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={16} strokeWidth={2} />
                      <span>{baseInfo.currentLocation}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </header>

        {showModal ? (
          <BaseInfoModal baseInfo={baseInfo} name={name} onClose={(): void => setShowModal(false)} onSave={updateBaseInfo} />
        ) : null}
      </>
    )
  }

  if (variant === 'professional') {
    return (
      <>
        <header className="relative group cursor-pointer" onClick={(): void => setShowModal(true)}>
          <button
            type="button"
            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600 z-10"
            onClick={(e): void => {
              e.stopPropagation()
              setShowModal(true)
            }}
          >
            <Pencil size={18} />
          </button>

          <div className="text-center pb-4 border-b-2" style={{ borderColor: themeColor }}>
            <h1 className="text-3xl font-bold mb-2" style={{ color: themeColor }}>
              {name}
            </h1>

            {baseInfo?.title ? (
              <div className="text-base text-gray-600 mb-3">{baseInfo.title}</div>
            ) : null}

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-gray-700">
              {baseInfo?.phone ? (
                <div className="flex items-center gap-1.5">
                  <Phone size={14} strokeWidth={2} />
                  <span>{baseInfo.phone}</span>
                </div>
              ) : null}

              {baseInfo?.email ? (
                <div className="flex items-center gap-1.5">
                  <Mail size={14} strokeWidth={2} />
                  <span>{baseInfo.email}</span>
                </div>
              ) : null}

              {baseInfo?.gender ? (
                <div>
                  <span className="text-gray-500">性别：</span>
                  {baseInfo.gender}
                </div>
              ) : null}

              {typeof baseInfo?.age === 'number' ? (
                <div>
                  <span className="text-gray-500">年龄：</span>
                  {baseInfo.age}
                </div>
              ) : null}

              {baseInfo?.currentLocation ? (
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} strokeWidth={2} />
                  <span>{baseInfo.currentLocation}</span>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {showModal ? (
          <BaseInfoModal baseInfo={baseInfo} name={name} onClose={(): void => setShowModal(false)} onSave={updateBaseInfo} />
        ) : null}
      </>
    )
  }

  // Simple & Elegant - 默认样式
  return (
    <>
      <header 
        className="mb-5 flex items-start gap-4 relative group cursor-pointer print:cursor-default" 
        onClick={(): void => setShowModal(true)}
      >
        <button
          type="button"
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600"
          onClick={(e): void => {
            e.stopPropagation()
            setShowModal(true)
          }}
        >
          <Pencil size={18} />
        </button>

        <div className="w-12 h-16 rounded bg-cyan-500 overflow-hidden shrink-0">
          {baseInfo?.avatarUrl ? (
            <img src={baseInfo.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <h1 className="font-bold mb-0.5" style={{ color: themeColor, fontSize: '1.5em' }}>{name}</h1>
            {baseInfo?.title ? <div className="text-gray-600" style={{ fontSize: '0.85em' }}>{baseInfo.title}</div> : null}
          </div>
          <div className="grid grid-cols-2 gap-y-1 gap-x-6" style={{ fontSize: '0.85em' }}>
            {baseInfo?.phone ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('phone')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <Phone size={16} strokeWidth={1.8} />
                <span className="text-gray-500">电话：</span>
                <span>{baseInfo.phone}</span>
                {hoveredField === 'phone' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('phone')
                    }}
                  >
                    <XCircle size={14} />
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.email ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('email')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <Mail size={16} strokeWidth={1.8} />
                <span className="text-gray-500">邮箱：</span>
                <span>{baseInfo.email}</span>
                {hoveredField === 'email' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('email')
                    }}
                  >
                    <XCircle size={14} />
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.gender ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('gender')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <User size={16} strokeWidth={1.8} />
                <span className="text-gray-500">性别：</span>
                <span>{baseInfo.gender}</span>
                {hoveredField === 'gender' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('gender')
                    }}
                  >
                    <XCircle size={14} />
                  </button>
                ) : null}
              </div>
            ) : null}
            {typeof baseInfo?.age === 'number' ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('age')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <Calendar size={16} strokeWidth={1.8} />
                <span className="text-gray-500">年龄：</span>
                <span>{baseInfo.age}</span>
                {hoveredField === 'age' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('age')
                    }}
                  >
                    <XCircle size={14} />
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.nation ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('nation')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">民族：</span>
                <span>{baseInfo.nation}</span>
                {hoveredField === 'nation' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('nation')
                    }}
                  >
                    <XCircle size={14} />
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.household ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('household')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">户籍：</span>
                <span>{baseInfo.household}</span>
                {hoveredField === 'household' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('household')
                    }}
                  >
                    <XCircle size={14} />
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.currentLocation ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('currentLocation')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">现所在地：</span>
                <span>{baseInfo.currentLocation}</span>
                {hoveredField === 'currentLocation' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('currentLocation')
                    }}
                  >
                    <XCircle size={14} />
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.workStartTime ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('workStartTime')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">工作时间：</span>
                <span>{baseInfo.workStartTime}</span>
                {hoveredField === 'workStartTime' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('workStartTime')
                    }}
                  >
                    <XCircle size={14} />
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.politicalStatus ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('politicalStatus')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">政治面貌：</span>
                <span>{baseInfo.politicalStatus}</span>
                {hoveredField === 'politicalStatus' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('politicalStatus')
                    }}
                  >
                    <XCircle size={14} />
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.height ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('height')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">身高：</span>
                <span>{baseInfo.height}cm</span>
                {hoveredField === 'height' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('height')
                    }}
                  >
                    <XCircle size={14} />
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.weight ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('weight')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">体重：</span>
                <span>{baseInfo.weight}kg</span>
                {hoveredField === 'weight' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('weight')
                    }}
                  >
                    <XCircle size={14} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {showModal ? (
        <BaseInfoModal
          baseInfo={baseInfo}
          name={name}
          onClose={(): void => setShowModal(false)}
          onSave={updateBaseInfo}
        />
      ) : null}
    </>
  )
}
