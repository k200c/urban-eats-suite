import { motion } from 'framer-motion';
import { KitchenDisplaySystem } from '@/components/staff/KitchenDisplaySystem';

export function OperationsContent() {
  return (
    <div className="h-full p-4 overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <KitchenDisplaySystem />
      </motion.div>
    </div>
  );
}
