import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Source } from '../types';
import { XIcon } from './icons';

interface SourcePreviewModalProps {
  source: Source | null;
  onClose: () => void;
}

const SourcePreviewModal: React.FC<SourcePreviewModalProps> = ({ source, onClose }) => {
  return (
    <AnimatePresence>
      {source && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="glassmorphism rounded-2xl w-full max-w-3xl h-[80vh] shadow-2xl p-6 relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white truncate">{source.name}</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-grow bg-gray-900/40 rounded-lg p-4 overflow-y-auto">
              <p className="text-gray-300 whitespace-pre-wrap">
                {`This is a mock preview for "${source.name}".\n\nIn a real application, the content of the PDF or website would be displayed here.\n\nSource Type: ${source.type}\n`}
                {source.url && `Source URL: ${source.url}\n\n`}
                {`Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam. Proin sed libero.`}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SourcePreviewModal;
