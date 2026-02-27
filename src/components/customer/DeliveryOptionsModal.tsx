import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';

interface DeliveryOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JUST_EAT_URL = 'https://www.just-eat.ie/restaurants-street-eatz-waterford-waterford/menu';
const DELIVEROO_URL = 'https://deliveroo.ie/menu/Waterford/waterford/street-eatz-waterford/?day=today&geohash=gc6cq1jscdf2&time=ASAP&fulfillment_method=DELIVERY&timestamp=1772210225';

export function DeliveryOptionsModal({ open, onOpenChange }: DeliveryOptionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border/50 p-6 gap-6">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-2xl font-heading font-bold">Order for Delivery</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm tracking-wide">
            Choose your preferred delivery partner
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <a
            href={JUST_EAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center gap-3 min-h-[52px] rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base px-6 py-4 transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            Just Eat
          </a>

          <a
            href={DELIVEROO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center gap-3 min-h-[52px] rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-base px-6 py-4 transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            Deliveroo
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
