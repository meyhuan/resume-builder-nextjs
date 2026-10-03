import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { JobIntention } from '@/entities/user/job-intention';
import { normalizeJobIntention } from '@/entities/user/job-intention-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchChoice } from '@/components/ui/search-choice';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JOB_TYPE_OPTIONS, RECRUITMENT_TYPE_OPTIONS, SALARY_OPTIONS, CURRENT_STATUS_OPTIONS } from '@/data/dictionaries/base-enums';
import { POPULAR_CITIES } from '@/data/dictionaries/cities';
import { INDUSTRY_OPTIONS } from '@/data/dictionaries/industries';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';

interface CustomField { label: string; value: string }
export interface JobIntentionModalProps {
  readonly jobIntention: JobIntention | null;
  readonly onClose: () => void;
  readonly onSave: (jobIntention: JobIntention) => void;
  readonly initialField?: string;
}

// Hallmark · component: intention form · existing violet tokens · P5 H5 E4 S5 R5 V4
export default function JobIntentionModal(props: JobIntentionModalProps): ReactElement {
  const initial = normalizeJobIntention(props.jobIntention ?? {});
  const [position, setPosition] = useState(initial.position ?? '');
  const [city, setCity] = useState(initial.city ?? '');
  const [salary, setSalary] = useState(initial.salary ?? '');
  const [customSalary, setCustomSalary] = useState(Boolean(initial.salary && !SALARY_OPTIONS.includes(initial.salary)));
  const [type, setType] = useState(initial.type ?? '');
  const [recruitmentType, setRecruitmentType] = useState(initial.recruitmentType ?? '');
  const [industry, setIndustry] = useState(initial.industry ?? '');
  const [currentStatus, setCurrentStatus] = useState(initial.currentStatus ?? '');
  const [showMoreFields, setShowMoreFields] = useState(Boolean(props.initialField &&
    (['industry', 'currentStatus'].includes(props.initialField) || props.initialField.startsWith('custom_'))));
  const contentRef = useRef<HTMLDivElement>(null);
  const salaryRef = useRef<HTMLInputElement>(null);
  const previousCustomSalary = useRef(customSalary);
  const [customFields, setCustomFields] = useState<CustomField[]>(initial.customFields?.map(field => ({ ...field })) ?? []);

  useEffect(() => {
    if (customSalary && !previousCustomSalary.current) salaryRef.current?.focus();
    previousCustomSalary.current = customSalary;
  }, [customSalary]);

  function handleSave(): void {
    const validCustomFields = customFields.filter(field => field.label.trim() && field.value.trim());
    props.onSave({
      ...initial,
      position: position.trim() || undefined,
      city: city.trim() || undefined,
      salary: salary.trim() || undefined,
      type: type || undefined,
      recruitmentType: recruitmentType || undefined,
      industry: industry.trim() || undefined,
      currentStatus: currentStatus.trim() || undefined,
      customFields: validCustomFields.length ? validCustomFields : undefined,
    });
    props.onClose();
  }

  return <Dialog open onOpenChange={open => !open && props.onClose()}>
    <DialogContent aria-describedby={undefined} ref={contentRef} className="max-w-2xl max-h-[90vh] overflow-y-auto"
      onOpenAutoFocus={event => {
        const customIndex = customFields.findIndex(field => `custom_${field.label}` === props.initialField);
        const id = customIndex >= 0 ? `job-custom-${customIndex}` : props.initialField;
        const target = id ? document.getElementById(id) : null;
        if (target && contentRef.current?.contains(target)) {
          event.preventDefault();
          const focusTarget = target instanceof HTMLFieldSetElement
            ? target.querySelector<HTMLInputElement>('input:checked') ?? target.querySelector<HTMLInputElement>('input') : target;
          focusTarget?.focus();
          if (focusTarget instanceof HTMLInputElement && focusTarget.type !== 'radio') focusTarget.select();
        }
      }}>
      <DialogHeader><DialogTitle>求职意向</DialogTitle></DialogHeader>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="position">意向岗位</Label>
            <Input id="position" className="h-11" value={position} onChange={event => setPosition(event.target.value)} placeholder="例如：产品经理" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">意向城市</Label>
            <SearchChoice id="city" label="城市" value={city} onValueChange={setCity} options={['不限', ...POPULAR_CITIES]} placeholder="搜索或选择城市" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary">期望薪资</Label>
          <Select value={customSalary ? '__custom' : salary || '__empty'} onValueChange={value => {
            setCustomSalary(value === '__custom');
            if (value !== '__custom') setSalary(value === '__empty' ? '' : value);
          }}>
            <SelectTrigger id="salary" className="min-h-11"><SelectValue placeholder="选择薪资范围" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty">暂不填写</SelectItem>
              {SALARY_OPTIONS.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              <SelectItem value="__custom">自定义</SelectItem>
            </SelectContent>
          </Select>
          {customSalary && <Input ref={salaryRef} id="salary-custom" aria-label="自定义期望薪资" className="h-11"
            value={salary} onChange={event => setSalary(event.target.value)} placeholder="例如：12-18k·14薪，或 200-300元/天" />}
          <p className="text-xs text-muted-foreground">区间按月薪填写；日薪、年薪或薪数可用自定义。</p>
        </div>
        <ChoiceGroup id="type" label="工作性质" value={type} onValueChange={setType} options={JOB_TYPE_OPTIONS} />
        <ChoiceGroup id="recruitmentType" label="招聘类型" value={recruitmentType} onValueChange={setRecruitmentType} options={RECRUITMENT_TYPE_OPTIONS} />
        <Button type="button" variant="ghost" aria-expanded={showMoreFields} aria-controls="job-more-fields"
          onClick={() => setShowMoreFields(!showMoreFields)} className="min-h-11 w-fit justify-start gap-2 px-2 -ml-2 font-normal text-muted-foreground hover:bg-transparent hover:text-primary active:bg-transparent active:text-primary focus-visible:ring-2 focus-visible:ring-offset-2">
          <span>更多信息（选填）</span><ChevronDown aria-hidden="true" className={`size-4 transition-transform motion-reduce:transition-none ${showMoreFields ? 'rotate-180' : ''}`} />
        </Button>
        {showMoreFields && <div id="job-more-fields" className="space-y-4 border-t pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="industry">期望行业</Label>
              <SearchChoice id="industry" label="行业" value={industry} onValueChange={setIndustry} options={INDUSTRY_OPTIONS} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentStatus">求职状态</Label>
              <SearchChoice id="currentStatus" label="求职状态" value={currentStatus} onValueChange={setCurrentStatus} options={CURRENT_STATUS_OPTIONS} />
            </div>
          </div>
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>自定义字段</Label>
              <Button type="button" variant="ghost" size="sm" className="min-h-11 gap-1 text-xs" onClick={() => setCustomFields([...customFields, { label: '', value: '' }])}>
                <Plus className="size-3" /><span>添加字段</span>
              </Button>
            </div>
            {customFields.map((field, index) => <div key={index} className="flex min-w-0 items-center gap-2">
              <Input aria-label={`自定义字段 ${index + 1} 名称`} value={field.label} placeholder="字段名" className="h-11 w-24 shrink-0"
                onChange={event => setCustomFields(customFields.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} />
              <Input id={`job-custom-${index}`} aria-label={`自定义字段 ${index + 1} 内容`} value={field.value} placeholder="字段值" className="h-11 min-w-0"
                onChange={event => setCustomFields(customFields.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} />
              <Button type="button" variant="ghost" size="sm" aria-label={`删除自定义字段 ${index + 1}`} className="size-11 shrink-0 p-0 text-destructive hover:bg-muted"
                onClick={() => setCustomFields(customFields.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button>
            </div>)}
          </div>
        </div>}
      </div>
      <DialogFooter>
        <Button variant="outline" className="min-h-11" onClick={props.onClose}>取消</Button>
        <Button className="min-h-11" onClick={handleSave}>确定</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
