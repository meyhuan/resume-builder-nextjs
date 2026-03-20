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
          <DialogTitle>Job Preference</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Target Position</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Preferred City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. New York"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Expected Salary</Label>
              <Input
                id="salary"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="Negotiable"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Job Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Freelance">Freelance</SelectItem>
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
            <span>More Info (Optional)</span>
            <ChevronDown 
              className={`h-4 w-4 transition-transform ${showMoreFields ? 'rotate-180' : ''}`}
            />
          </Button>

          {showMoreFields && (
            <div className="space-y-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Preferred Industry</Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Enter here"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentStatus">Current Status</Label>
                  <Input
                    id="currentStatus"
                    value={currentStatus}
                    onChange={(e) => setCurrentStatus(e.target.value)}
                    placeholder="Enter here"
                  />
                </div>
              </div>

              {/* Custom fields */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label>Custom Fields</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addCustomField} className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    <span>Add Field</span>
                  </Button>
                </div>
                {customFields.map((field, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={field.label}
                      onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                      placeholder="Field name"
                      className="w-28 shrink-0"
                    />
                    <Input
                      value={field.value}
                      onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                      placeholder="Field value"
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
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
