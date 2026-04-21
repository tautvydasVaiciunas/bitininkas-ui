import { useEffect, useMemo, useState } from 'react';
import { ChevronsUpDown, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface UserMultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSearch?: (input: string) => void;
}

export function UserMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Pasirinkite vartotojus',
  emptyText = 'Nėra rezultatų',
  disabled = false,
  loading = false,
  hasMore = false,
  onLoadMore,
  onSearch,
}: UserMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [knownOptions, setKnownOptions] = useState<Record<string, MultiSelectOption>>({});

  useEffect(() => {
    if (!options.length) {
      return;
    }
    setKnownOptions((prev) => {
      const next = { ...prev };
      for (const option of options) {
        next[option.value] = option;
      }
      return next;
    });
  }, [options]);

  const mappedOptions = useMemo(() => {
    const map = new Map<string, MultiSelectOption>(Object.entries(knownOptions));
    options.forEach((option) => map.set(option.value, option));
    return map;
  }, [knownOptions, options]);

  const toggleValue = (newValue: string, selectedOption?: MultiSelectOption) => {
    if (selectedOption) {
      setKnownOptions((prev) => {
        if (prev[selectedOption.value]) {
          return prev;
        }
        return { ...prev, [selectedOption.value]: selectedOption };
      });
    }

    if (value.includes(newValue)) {
      onChange(value.filter((item) => item !== newValue));
    } else {
      onChange([...value, newValue]);
    }
  };

  const selectedOptions = value
    .map((item) => mappedOptions.get(item) ?? { value: item, label: item })
    .filter((option): option is MultiSelectOption => Boolean(option));

  const selectedSummary = useMemo(() => {
    if (value.length === 0) {
      return placeholder;
    }
    if (selectedOptions.length === 0) {
      return `Pasirinkta ${value.length} vartotoj${value.length === 1 ? 'as' : 'ai'}`;
    }

    const labels = selectedOptions.map((option) => option.label);
    if (labels.length <= 2) {
      return labels.join(', ');
    }
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }, [placeholder, selectedOptions, value.length]);

  return (
    <div className="space-y-2">
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (disabled) return;
          setOpen(next);
          if (!next) {
            setSearchValue('');
            onSearch?.('');
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">
              {selectedSummary}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
          <CommandInput
            placeholder="Ieškoti vartotojų..."
            value={searchValue}
            onValueChange={(nextValue) => {
              setSearchValue(nextValue);
              onSearch?.(nextValue);
            }}
          />
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandList
            className="max-h-64 overflow-y-auto overscroll-contain"
            onWheelCapture={(event) => event.stopPropagation()}
          >
            <CommandGroup>
                {options.map((option) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.description ?? ''}`}
                      onSelect={() => {
                        toggleValue(option.value, option);
                      }}
                      className="flex items-start gap-2"
                    >
                      <Check className={cn('mt-1 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{option.label}</span>
                        {option.description ? (
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        ) : null}
                      </div>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </CommandList>
          {hasMore ? (
            <div className="border-t border-border/60 px-3 py-2 text-center">
              <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={loading}>
                {loading ? 'Kraunama...' : 'Krauti daugiau'}
              </Button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <Badge key={option.value} variant="secondary" className="flex items-center gap-1">
              <span>{option.label}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={() => toggleValue(option.value)}
                aria-label={`Pašalinti ${option.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
