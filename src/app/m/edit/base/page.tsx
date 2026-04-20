'use client'

import { type ReactElement } from 'react'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import {
  useBaseInfoField,
  useNameField,
} from '@/features/edit/draft/use-draft-field'
import { ModuleEditShell } from '../_components/module-edit-shell'
import { TextField } from '@/features/edit/form-fields/text-field'
import { NumberField } from '@/features/edit/form-fields/number-field'
import { TagSelectField } from '@/features/edit/form-fields/tag-select-field'
import { AutocompleteField } from '@/features/edit/form-fields/autocomplete-field'
import { GENDER_OPTIONS, POLITICAL_STATUS_OPTIONS } from '@/data/dictionaries/base-enums'
import { POPULAR_CITIES } from '@/data/dictionaries/cities'

/**
 * Mobile edit page for "基础信息".
 * Binds inputs directly to draft-store via `useBaseInfoField` helpers.
 */
export default function BaseInfoEditPage(): ReactElement {
  const draft = useDraftStore((s) => s.draft)
  const nameF = useNameField()
  const titleF = useBaseInfoField('title')
  const phoneF = useBaseInfoField('phone')
  const emailF = useBaseInfoField('email')
  const genderF = useBaseInfoField('gender')
  const ageF = useBaseInfoField('age')
  const locationF = useBaseInfoField('location')
  const politicalF = useBaseInfoField('politicalStatus')

  if (!draft) {
    return (
      <ModuleEditShell title="基础信息">
        <div className="text-center text-sm text-slate-500 py-12">加载中…</div>
      </ModuleEditShell>
    )
  }

  return (
    <ModuleEditShell title="基础信息" subtitle="让招聘者快速认识你">
      <TextField
        label="姓名"
        value={nameF.value}
        onValueChange={nameF.setValue}
        required
        placeholder="请输入真实姓名"
        tip="真实姓名，招聘者会查证"
      />
      <TextField
        label="职位名称"
        value={titleF.value ?? ''}
        onValueChange={titleF.setValue}
        placeholder="例如：高级前端工程师"
      />
      <TextField
        label="手机号"
        value={phoneF.value ?? ''}
        onValueChange={phoneF.setValue}
        required
        type="tel"
        inputMode="tel"
        placeholder="11 位手机号"
      />
      <TextField
        label="邮箱"
        value={emailF.value ?? ''}
        onValueChange={emailF.setValue}
        required
        type="email"
        inputMode="email"
        placeholder="example@mail.com"
      />
      <TagSelectField
        label="性别"
        options={GENDER_OPTIONS}
        value={genderF.value ?? ''}
        onValueChange={genderF.setValue}
      />
      <NumberField
        label="年龄"
        value={ageF.value as number | undefined}
        onValueChange={ageF.setValue}
        min={14}
        max={80}
        placeholder="岁"
      />
      <AutocompleteField
        label="所在城市"
        options={POPULAR_CITIES}
        value={locationF.value ?? ''}
        onValueChange={locationF.setValue}
        placeholder="输入或选择城市"
      />
      <TagSelectField
        label="政治面貌"
        options={POLITICAL_STATUS_OPTIONS}
        value={politicalF.value ?? ''}
        onValueChange={politicalF.setValue}
      />
    </ModuleEditShell>
  )
}
