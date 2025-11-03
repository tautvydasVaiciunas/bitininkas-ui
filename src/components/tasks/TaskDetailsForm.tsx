import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type TaskFrequency } from '@/lib/types';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const monthOptions = [
  { value: 1, label: 'Sausis' },
  { value: 2, label: 'Vasaris' },
  { value: 3, label: 'Kovas' },
  { value: 4, label: 'Balandis' },
  { value: 5, label: 'Gegužė' },
  { value: 6, label: 'Birželis' },
  { value: 7, label: 'Liepa' },
  { value: 8, label: 'Rugpjūtis' },
  { value: 9, label: 'Rugsėjis' },
  { value: 10, label: 'Spalis' },
  { value: 11, label: 'Lapkritis' },
  { value: 12, label: 'Gruodis' },
];

const frequencyOptions: { value: TaskFrequency; label: string }[] = [
  { value: 'once', label: 'Vienkartinė' },
  { value: 'weekly', label: 'Kas savaitę' },
  { value: 'monthly', label: 'Kas mėnesį' },
  { value: 'seasonal', label: 'Sezoninė' },
];

export type TaskDetailsFormStep = { id?: string; title: string; contentText: string };

export interface TaskDetailsFormValues {
  title: string;
  description: string;
  category: string;
  frequency: TaskFrequency;
  defaultDueDays: string;
  seasonMonths: number[];
  steps: TaskDetailsFormStep[];
}

export interface TaskDetailsFormProps {
  values: TaskDetailsFormValues;
  onChange: (updater: (previous: TaskDetailsFormValues) => TaskDetailsFormValues) => void;
  disabled?: boolean;
  className?: string;
}

export function TaskDetailsForm({ values, onChange, disabled = false, className }: TaskDetailsFormProps) {
  const updateValues = (updater: (previous: TaskDetailsFormValues) => TaskDetailsFormValues) => {
    onChange(updater);
  };

  const handleFieldChange = (field: keyof TaskDetailsFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      updateValues((previous) => ({ ...previous, [field]: value }));
    };

  const handleFrequencyChange = (value: TaskFrequency) => {
    updateValues((previous) => ({ ...previous, frequency: value }));
  };

  const handleToggleSeasonMonth = (month: number, checked: boolean) => {
    updateValues((previous) => {
      const nextMonths = checked
        ? Array.from(new Set([...previous.seasonMonths, month]))
        : previous.seasonMonths.filter((value) => value !== month);
      nextMonths.sort((a, b) => a - b);
      return { ...previous, seasonMonths: nextMonths };
    });
  };

  const handleAddStep = () => {
    updateValues((previous) => ({
      ...previous,
      steps: [...previous.steps, { title: '', contentText: '' }],
    }));
  };

  const handleUpdateStep = (index: number, changes: Partial<TaskDetailsFormStep>) => {
    updateValues((previous) => ({
      ...previous,
      steps: previous.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...changes } : step,
      ),
    }));
  };

  const handleRemoveStep = (index: number) => {
    updateValues((previous) => {
      if (previous.steps.length <= 1) {
        return previous;
      }
      const nextSteps = previous.steps.filter((_, stepIndex) => stepIndex !== index);
      return { ...previous, steps: nextSteps };
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="task-title">Pavadinimas</Label>
          <Input
            id="task-title"
            value={values.title}
            onChange={handleFieldChange('title')}
            placeholder="Pvz., Pavasarinė apžiūra"
            disabled={disabled}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="task-description">Aprašymas</Label>
          <Textarea
            id="task-description"
            value={values.description}
            onChange={handleFieldChange('description')}
            placeholder="Trumpai aprašykite užduotį"
            disabled={disabled}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-category">Kategorija</Label>
          <Input
            id="task-category"
            value={values.category}
            onChange={handleFieldChange('category')}
            placeholder="Pvz., Sezoninės priežiūros"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-frequency">Dažnumas</Label>
          <Select
            value={values.frequency}
            onValueChange={(next) => handleFrequencyChange(next as TaskFrequency)}
            disabled={disabled}
          >
            <SelectTrigger id="task-frequency">
              <SelectValue placeholder="Pasirinkite dažnumą" />
            </SelectTrigger>
            <SelectContent>
              {frequencyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-default-due">Numatytasis terminas (dienomis)</Label>
          <Input
            id="task-default-due"
            type="number"
            min={1}
            value={values.defaultDueDays}
            onChange={handleFieldChange('defaultDueDays')}
            disabled={disabled}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sezoniniai mėnesiai</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {monthOptions.map((month) => {
            const checked = values.seasonMonths.includes(month.value);
            return (
              <label key={month.value} className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(state) => handleToggleSeasonMonth(month.value, state === true)}
                  disabled={disabled}
                />
                {month.label}
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Žingsniai</h3>
          <Button type="button" variant="outline" onClick={handleAddStep} disabled={disabled}>
            <Plus className="mr-2 h-4 w-4" />
            Pridėti žingsnį
          </Button>
        </div>
        <div className="space-y-3">
          {values.steps.map((step, index) => (
            <div key={step.id ?? index} className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Žingsnis {index + 1}</h4>
                {values.steps.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStep(index)}
                    disabled={disabled}
                    aria-label={`Pašalinti ${index + 1}-ą žingsnį`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`task-step-title-${index}`}>Pavadinimas</Label>
                <Input
                  id={`task-step-title-${index}`}
                  value={step.title}
                  onChange={(event) => handleUpdateStep(index, { title: event.target.value })}
                  disabled={disabled}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`task-step-description-${index}`}>Instrukcijos</Label>
                <Textarea
                  id={`task-step-description-${index}`}
                  value={step.contentText}
                  onChange={(event) => handleUpdateStep(index, { contentText: event.target.value })}
                  placeholder="Aprašykite žingsnio veiksmus"
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
