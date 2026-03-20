import { useState } from 'react';
import type { ReactElement } from 'react';
import type { BaseInfo } from '@/entities/user/base-info';
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
  const [avatarUrl] = useState(props.baseInfo?.avatarUrl ?? '');
  const [showAvatar, setShowAvatar] = useState(props.baseInfo?.showAvatar ?? false);
  const [nation, setNation] = useState(props.baseInfo?.nation ?? '');
  const [household, setHousehold] = useState(props.baseInfo?.household ?? '');
  const [currentLocation, setCurrentLocation] = useState(props.baseInfo?.currentLocation ?? '');
  const [workStartTime, setWorkStartTime] = useState(props.baseInfo?.workStartTime ?? '');
  const [politicalStatus, setPoliticalStatus] = useState(props.baseInfo?.politicalStatus ?? '');
  const [height, setHeight] = useState(props.baseInfo?.height ?? '');
  const [weight, setWeight] = useState(props.baseInfo?.weight ?? '');
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>(
    (props.baseInfo?.customFields as CustomField[] | undefined)?.map(f => ({ ...f })) ?? []
  );

  function addCustomField(): void {
    setCustomFields([...customFields, { label: '', value: '' }]);
  }

  function removeCustomField(index: number): void {
    setCustomFields(customFields.filter((_, i) => i !== index));
  }

  function updateCustomField(index: number, key: 'label' | 'value', val: string): void {
    const updated = [...customFields];
    updated[index] = { ...updated[index], [key]: val };
    setCustomFields(updated);
  }

  function handleSave(): void {
    const validCustomFields = customFields.filter(f => f.label && f.value);
    const updatedBaseInfo: BaseInfo = {
      title,
      phone: phone || undefined,
      email: email || undefined,
      gender: gender || undefined,
      age: age ? Number(age) : undefined,
      avatarUrl: showAvatar ? (avatarUrl || undefined) : undefined,
      showAvatar,
      nation: nation || undefined,
      household: household || undefined,
      currentLocation: currentLocation || undefined,
      workStartTime: workStartTime || undefined,
      politicalStatus: politicalStatus || undefined,
      height: height || undefined,
      weight: weight || undefined,
      customFields: validCustomFields.length > 0 ? validCustomFields : undefined,
    };
    props.onSave(updatedBaseInfo, name);
    props.onClose();
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Basic Information</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Professional Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Photo</Label>
            <Select
              value={showAvatar ? 'show' : 'hide'}
              onValueChange={(val) => setShowAvatar(val === 'show')}
            >
              <SelectTrigger id="avatar">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="show">Show</SelectItem>
                <SelectItem value="hide">Hide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
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
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="33"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nation">Nationality</Label>
                  <Input
                    id="nation"
                    value={nation}
                    onChange={(e) => setNation(e.target.value)}
                    placeholder="Enter here"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="household">Hometown</Label>
                  <Input
                    id="household"
                    value={household}
                    onChange={(e) => setHousehold(e.target.value)}
                    placeholder="Enter here"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentLocation">Current Location</Label>
                  <Input
                    id="currentLocation"
                    value={currentLocation}
                    onChange={(e) => setCurrentLocation(e.target.value)}
                    placeholder="Enter here"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workStartTime">Work Start Date</Label>
                  <Input
                    id="workStartTime"
                    value={workStartTime}
                    onChange={(e) => setWorkStartTime(e.target.value)}
                    placeholder="Enter here"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="politicalStatus">Political Status</Label>
                  <Input
                    id="politicalStatus"
                    value={politicalStatus}
                    onChange={(e) => setPoliticalStatus(e.target.value)}
                    placeholder="Enter here"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="Height (cm)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Weight (kg)"
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
