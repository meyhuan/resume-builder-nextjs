'use client'

import { type ReactElement } from 'react'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import {
  useBaseInfoField,
  useNameField,
} from '@/features/edit/draft/use-draft-field'
import { ModuleEditShell } from '../_components/module-edit-shell'
import { chain, validateEmail, validatePhone, validateRequired } from '../_components/validators'
import type { ValidationResult } from '../_components/module-edit-shell'
import { CustomBaseFields } from '../_components/custom-base-fields'
import { MobileAvatarField } from '../_components/mobile-avatar-field'
import { TextField } from '@/features/edit/form-fields/text-field'
import { EmailField } from '@/features/edit/form-fields/email-field'
import { MonthPickerField } from '@/features/edit/form-fields/month-picker-field'
import { NumberField } from '@/features/edit/form-fields/number-field'
import { TagSelectField } from '@/features/edit/form-fields/tag-select-field'
import { AutocompleteField } from '@/features/edit/form-fields/autocomplete-field'
import { GENDER_OPTIONS, POLITICAL_STATUS_OPTIONS } from '@/data/dictionaries/base-enums'
import { CITY_OPTIONS } from '@/data/dictionaries/cities'

/**
 * Mobile edit page for "基础信息".
 * Binds inputs directly to draft-store via `useBaseInfoField` helpers.
 */
export default function BaseInfoEditPage(): ReactElement {
  const draft = useDraftStore((s) => s.draft)
  const nameF = useNameField()
  const phoneF = useBaseInfoField('phone')
  const emailF = useBaseInfoField('email')
  const genderF = useBaseInfoField('gender')
  const ageF = useBaseInfoField('age')
  const locationF = useBaseInfoField('currentLocation')
  const workStartF = useBaseInfoField('workStartTime')
  const politicalF = useBaseInfoField('politicalStatus')
  const avatarF = useBaseInfoField('avatarUrl')

  if (!draft) {
    return (
      <ModuleEditShell title="基础信息">
        <div className="text-center text-sm text-slate-500 py-12">加载中…</div>
      </ModuleEditShell>
    )
  }

  const validate = (): ValidationResult =>
    chain(
      validateRequired([
        { label: '姓名', value: nameF.value },
        { label: '手机号', value: phoneF.value as string | undefined },
        { label: '邮箱', value: emailF.value as string | undefined },
      ]),
      validatePhone(phoneF.value as string | undefined),
      validateEmail(emailF.value as string | undefined),
    )

  return (
    <ModuleEditShell title="基础信息" subtitle="让招聘者快速认识你" validate={validate}>
      <MobileAvatarField
        value={avatarF.value as string | undefined}
        onChange={(next): void => avatarF.setValue(next)}
      />
      <TextField
        label="姓名"
        value={nameF.value}
        onValueChange={nameF.setValue}
        required
        placeholder="请输入真实姓名"
        tip="真实姓名，招聘者会查证"
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
      <EmailField
        value={emailF.value ?? ''}
        onValueChange={emailF.setValue}
        required
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
        placeholder="如：25"
      />
      <AutocompleteField
        label="所在城市"
        options={CITY_OPTIONS}
        value={locationF.value ?? draft.baseInfo?.location ?? ''}
        onValueChange={locationF.setValue}
        placeholder="输入或选择城市"
      />
      <MonthPickerField
        label="工作开始月份"
        value={workStartF.value ?? ''}
        onValueChange={workStartF.setValue}
      />
      <TagSelectField
        label="政治面貌"
        options={POLITICAL_STATUS_OPTIONS}
        value={politicalF.value ?? ''}
        onValueChange={politicalF.setValue}
      />
      <CustomBaseFields />
    </ModuleEditShell>
  )
}
