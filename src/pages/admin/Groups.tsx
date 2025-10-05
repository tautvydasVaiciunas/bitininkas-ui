import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function AdminGroups() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Grupės</h1>
            <p className="text-muted-foreground mt-1">Grupių valdymo funkcionalumas greitu metu atsiras čia</p>
          </div>
          <Button disabled>
            <Plus className="mr-2 w-4 h-4" />
            Pridėti grupę
          </Button>
        </div>

        <Card className="shadow-custom">
          <CardHeader>
            <CardTitle>Bus pasiekiama netrukus</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Grupės šiuo metu neturi atskiro API resurso. Kol vyksta backend kūrimas, šiame skydelyje rodomas
            tik informacinis pranešimas.
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
