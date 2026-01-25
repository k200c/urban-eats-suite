import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface WaitTimeBannerProps {
  waitTime: string;
}

export function WaitTimeBanner({ waitTime }: WaitTimeBannerProps) {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-primary/20 border-b border-primary/30 px-4 py-2 w-full max-w-full overflow-hidden"
    >
      <div className="flex items-center justify-center gap-2 text-sm">
        <Clock className="w-4 h-4 text-primary" />
        <span className="text-foreground">
          Current wait time: <span className="font-bold text-primary">{waitTime}</span>
        </span>
      </div>
    </motion.div>
  );
}
