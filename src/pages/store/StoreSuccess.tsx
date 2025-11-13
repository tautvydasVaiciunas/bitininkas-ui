import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

import { StoreLayout } from './StoreLayout';
import { Button } from '@/components/ui/button';

const StoreSuccess = () => {
  return (
    <StoreLayout>
      <div className="flex flex-col items-center justify-center rounded-lg border bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h1 className="mt-4 text-3xl font-bold">Užsakymas priimtas</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Į jūsų el. paštą išsiuntėme užsakymo patvirtinimą ir išankstinę sąskaitą. Jei el. laiško
          nematote, patikrinkite brukalų aplanką.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Button asChild>
            <Link to="/parduotuve">Grįžti į parduotuvę</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/parduotuve/krepselis">Peržiūrėti krepšelį</Link>
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
};

export default StoreSuccess;
