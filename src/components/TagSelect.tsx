import { useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import type { HiveTag } from '@/lib/types';
import { cn } from '@/lib/utils';

export type TagSelectProps = {
  tags: HiveTag[];
  value?: string | null;
  onChange: (tagId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowCreate?: boolean;
  onCreateTag?: (name: string) => void;
  creatingTag?: boolean;
  emptyText?: string;
};

export function TagSelect({
  tags,
  value,
  onChange,
  disabled,
  placeholder = 'Pasirinkite žyma',
  allowCreate = false,
  onCreateTag,
  creatingTag = false,
  emptyText = 'Žymu nera',
}: TagSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedTag = useMemo(() => tags.find((tag) => tag.id === value) ?? null, [tags, value]);
  const normalizedSearch = search.trim();
  const tagNameSet = useMemo(() => new Set(tags.map((tag) => tag.name.toLowerCase())), [tags]);
  const canCreate = allowCreate && normalizedSearch.length > 0 && !tagNameSet.has(normalizedSearch.toLowerCase());

  const handleSelect = (tagId: string | null) => {
    onChange(tagId);
    setOpen(false);
    setSearch('');
  };

  const handleCreate = () => {
    if (!onCreateTag || !normalizedSearch) {
      return;
    }
    onCreateTag(normalizedSearch);
    if (!creatingTag) {
      setSearch('');
    }
  };

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('w-full justify-between', disabled && 'cursor-not-allowed opacity-80')}
          disabled={disabled}
        >
          <span className="truncate">{selectedTag?.name ?? placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Ieškoti žymos..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {tags.map((tag) => (
              <CommandItem
                key={tag.id}
                value={tag.name}
                onSelect={() => handleSelect(tag.id)}
                className="flex items-center gap-2"
              >
                <span>{tag.name}</span>
                {value === tag.id ? <span className="ml-auto text-xs text-muted-foreground">Pasirinkta</span> : null}
              </CommandItem>
            ))}
          </CommandList>
          <CommandSeparator />
          <div className="flex items-center gap-2 p-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => handleSelect(null)}>
              Išvalyti
            </Button>
            {allowCreate ? (
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={handleCreate}
                disabled={!canCreate || creatingTag}
              >
                {creatingTag ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Nauja žyma
              </Button>
            ) : null}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
