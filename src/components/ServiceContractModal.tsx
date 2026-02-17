import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ServiceContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUERY_KEY = ['profile', 'service-contract'] as const;

export const ServiceContractModal = ({ open, onOpenChange }: ServiceContractModalProps) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Paslaugos sutartis</DialogTitle>
          <DialogDescription>
            Sutartis sugeneruojama pagal jūsų duomenis. Pasirašius išsaugoma nekintanti sutarties kopija.
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
              {data?.content}
            </pre>
          )}
        </ScrollArea>
        <DialogFooter>
          {!data?.signed && data?.canSign ? (
            <Button onClick={() => signMutation.mutate()} disabled={signMutation.isLoading || isLoading}>
              {signMutation.isLoading ? 'Pasirašoma...' : 'Pasirašyti'}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Uždaryti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

