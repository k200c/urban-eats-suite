import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';

export function StoreClosedOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <XCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
        </motion.div>
        
        <h1 className="font-heading text-4xl font-bold text-foreground mb-4">
          SORRY, WE'RE <span className="text-red-500">CLOSED</span>
        </h1>
        
        <p className="text-muted-foreground text-lg mb-6">
          We're not taking orders right now. Please check back soon!
        </p>
        
        <div className="text-sm text-muted-foreground/70">
          <p>📍 Crystal Sports & Leisure Centre</p>
          <p>🕐 Thu–Fri 12pm–7pm</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
