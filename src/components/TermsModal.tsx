import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import termsContent from '../../docs/T&C.md?raw';

interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TermsModal = ({ open, onOpenChange }: TermsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Naudojimosi taisyklės</DialogTitle>
          <DialogDescription>
            Šios taisyklės galioja visiems „Bus medaus“ platformos vartotojams. Perskaitykite jas
            atidžiai prieš tęsdami.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] rounded-md border border-border bg-background p-4">
          <pre className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {termsContent}
          </pre>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Uždaryti</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
