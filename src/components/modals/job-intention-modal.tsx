import { useState } from 'react';
import type { ReactElement } from 'react';
import type { JobIntention } from '@/entities/user/job-intention';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown } from 'lucide-react';

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
              <Input
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="社招"
              />
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
