import { useState } from 'react';
import type { ReactElement } from 'react';
import type { JobIntention } from '@/entities/user/job-intention';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';

interface CustomField {
  label: string;
  value: string;
}

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
  const [customFields, setCustomFields] = useState<CustomField[]>(
    (props.jobIntention?.customFields as CustomField[] | undefined)?.map(f => ({ ...f })) ?? []
  );

  function addCustomField(): void {
    setCustomFields([...customFields, { label: '', value: '' }]);
  }

  function removeCustomField(idx: number): void {
    setCustomFields(customFields.filter((_, i) => i !== idx));
  }

  function updateCustomField(idx: number, key: 'label' | 'value', val: string): void {
    const updated = [...customFields];
    updated[idx] = { ...updated[idx], [key]: val };
    setCustomFields(updated);
  }

  function handleSave(): void {
    const validCustomFields = customFields.filter(f => f.label && f.value);
    const updatedJobIntention: JobIntention = {
      position: position || undefined,
      city: city || undefined,
      salary: salary || undefined,
      type: type || undefined,
      industry: industry || undefined,
      currentStatus: currentStatus || undefined,
      customFields: validCustomFields.length > 0 ? validCustomFields : undefined,
    };
    props.onSave(updatedJobIntention);
    props.onClose();
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>求职意向</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">意向岗位</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="移动端开发工程师"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">意向城市</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="武汉"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary">期望薪水</Label>
              <Input
                id="salary"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="面议"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">求职类型</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="全职">全职</SelectItem>
                  <SelectItem value="兼职">兼职</SelectItem>
                  <SelectItem value="实习">实习</SelectItem>
                  <SelectItem value="社招">社招</SelectItem>
                  <SelectItem value="校招">校招</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowMoreFields(!showMoreFields)}
            className="w-full justify-start gap-2"
          >
            <span>更多信息（选填）</span>
            <ChevronDown 
              className={`h-4 w-4 transition-transform ${showMoreFields ? 'rotate-180' : ''}`}
            />
          </Button>

          {showMoreFields && (
            <div className="space-y-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">期望行业</Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="请选择"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentStatus">当前状态</Label>
                  <Input
                    id="currentStatus"
                    value={currentStatus}
                    onChange={(e) => setCurrentStatus(e.target.value)}
                    placeholder="请选择"
                  />
                </div>
              </div>

              {/* Custom fields */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label>自定义字段</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addCustomField} className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    <span>添加字段</span>
                  </Button>
                </div>
                {customFields.map((field, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={field.label}
                      onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                      placeholder="字段名"
                      className="w-28 shrink-0"
                    />
                    <Input
                      value={field.value}
                      onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                      placeholder="字段值"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeCustomField(index)} className="h-8 w-8 p-0 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
