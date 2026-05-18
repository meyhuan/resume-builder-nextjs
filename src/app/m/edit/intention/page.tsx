'use client'

import { type ReactElement } from 'react'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { useJobIntentionField } from '@/features/edit/draft/use-draft-field'
import { ModuleEditShell } from '../_components/module-edit-shell'
import { TextField } from '@/features/edit/form-fields/text-field'
import { TagSelectField } from '@/features/edit/form-fields/tag-select-field'
import { AutocompleteField } from '@/features/edit/form-fields/autocomplete-field'
import {
  JOB_TYPE_OPTIONS,
  SALARY_OPTIONS,
  CURRENT_STATUS_OPTIONS,
} from '@/data/dictionaries/base-enums'
import { POPULAR_CITIES } from '@/data/dictionaries/cities'
import { INDUSTRY_OPTIONS } from '@/data/dictionaries/industries'

/**
 * Mobile edit page for "求职意向".
 */
export default function JobIntentionEditPage(): ReactElement {
  const draft = useDraftStore((s) => s.draft)
  const positionF = useJobIntentionField('position')
  const cityF = useJobIntentionField('city')
  const salaryF = useJobIntentionField('salary')
  const typeF = useJobIntentionField('type')
  const industryF = useJobIntentionField('industry')
  const statusF = useJobIntentionField('currentStatus')

  if (!draft) {
    return (
      <ModuleEditShell title="求职意向">
        <div className="text-center text-sm text-slate-500 py-12">加载中…</div>
      </ModuleEditShell>
    )
  }

  return (
    <ModuleEditShell title="求职意向" subtitle="告诉我们你想要什么">
      <TextField
        label="意向岗位"
        value={positionF.value ?? ''}
        onValueChange={positionF.setValue}
        required
        placeholder="例如：前端工程师"
        tip="写具体岗位比写行业更有效"
      />
      <AutocompleteField
        label="意向城市"
        options={POPULAR_CITIES}
        value={cityF.value ?? ''}
        onValueChange={cityF.setValue}
        required
        placeholder="输入或选择城市"
      />
      <AutocompleteField
        label="期望薪资"
        options={SALARY_OPTIONS}
        value={salaryF.value ?? ''}
        onValueChange={salaryF.setValue}
        placeholder="输入或选择薪资范围"
      />
      <TagSelectField
        label="求职类型"
        options={JOB_TYPE_OPTIONS}
        value={typeF.value ?? ''}
        onValueChange={typeF.setValue}
      />
      <AutocompleteField
        label="期望行业"
        options={INDUSTRY_OPTIONS}
        value={industryF.value ?? ''}
        onValueChange={industryF.setValue}
        placeholder="选择或输入行业"
      />
      <TagSelectField
        label="当前状态"
        options={CURRENT_STATUS_OPTIONS}
        value={statusF.value ?? ''}
        onValueChange={statusF.setValue}
      />
    </ModuleEditShell>
  )
}
