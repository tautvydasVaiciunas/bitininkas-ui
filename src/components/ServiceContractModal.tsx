import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ServiceContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enforceSigning?: boolean;
  onDismissWithoutSigning?: () => void;
}

const QUERY_KEY = ['profile', 'service-contract'] as const;

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const extractTemplateBody = (value?: string) => {
  if (!value) {
    return '';
  }

  const separator = '\n---\n';
  const index = value.indexOf(separator);
  if (index === -1) {
    return value;
  }

  return value.slice(index + separator.length).trimStart();
};

export const ServiceContractModal = ({
  open,
  onOpenChange,
  enforceSigning = false,
  onDismissWithoutSigning,
}: ServiceContractModalProps) => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.profile.serviceContract(),
    enabled: open,
  });

  const signMutation = useMutation({
    mutationFn: () => api.profile.signServiceContract(),
    onSuccess: (response) => {
      queryClient.setQueryData(QUERY_KEY, response);
    },
  });

  const signedLabel = useMemo(() => {
    if (!data?.signed || !data.signedAt || !data.contractNumber) {
      return null;
    }

    const signedAt = new Date(data.signedAt).toLocaleString('lt-LT');
    return `Pasirašyta: ${signedAt}, Sutartis Nr: ${data.contractNumber}`;
  }, [data?.contractNumber, data?.signed, data?.signedAt]);

  const contractBody = useMemo(() => {
    const shortHash = data?.templateHash ? data.templateHash.slice(0, 12) : '—';
    return [
      '# Paslaugos sutartis',
      '',
      `Sutartis Nr: ${data?.contractNumber ?? '—'}`,
      `Pasirašyta: ${formatDateTime(data?.signedAt)}`,
      `El. paštas: ${data?.userEmail ?? '—'}`,
      `Šablono versija: ${data?.templateVersion ?? '—'}`,
      `Šablono hash: ${shortHash}`,
      '',
      '---',
      '',
      extractTemplateBody(data?.content),
    ].join('\n');
  }, [
    data?.content,
    data?.contractNumber,
    data?.signedAt,
    data?.templateHash,
    data?.templateVersion,
    data?.userEmail,
  ]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && enforceSigning && data && !data.signed) {
      onDismissWithoutSigning?.();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Paslaugos sutartis</DialogTitle>
          <DialogDescription>
            Sutartis sugeneruojama pagal jūsų duomenis. Pasirašius išsaugoma nekintanti sutarties
            kopija.
          </DialogDescription>
        </DialogHeader>
        {signedLabel ? (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            {signedLabel}
          </div>
        ) : null}
        <ScrollArea className="h-[60vh] rounded-md border border-border bg-background p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Įkeliama sutartis...
            </div>
          ) : isError ? (
            <div className="py-10 text-center text-sm text-destructive">
              Nepavyko įkelti sutarties.
            </div>
          ) : (
            <pre className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {contractBody}
            </pre>
          )}
        </ScrollArea>
        <DialogFooter>
          {!data?.signed && data?.canSign ? (
            <Button
              onClick={() => signMutation.mutate()}
              disabled={signMutation.isLoading || isLoading}
            >
              {signMutation.isLoading ? 'Pasirašoma...' : 'Pasirašyti'}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {enforceSigning && data && !data.signed ? 'Atsijungti' : 'Uždaryti'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

