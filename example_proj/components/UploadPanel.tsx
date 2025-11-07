import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Source } from '../types';
import { PlusIcon, FileIcon, LinkIcon, TrashIcon } from './icons';

interface UploadPanelProps {
  sources: Source[];
  onAddSource: (source: Source) => void;
  onDeleteSource: (id: string) => void;
  onSelectSource: (source: Source) => void;
}

const UploadPanel: React.FC<UploadPanelProps> = ({ sources, onAddSource, onDeleteSource, onSelectSource }) => {
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [url, setUrl] = useState('');

  const handleAddUrl = () => {
    if (url.trim()) {
      const newSource: Source = {
        id: new Date().toISOString(),
        type: 'url',
        name: url.split('/').pop() || url,
        url: url,
      };
      onAddSource(newSource);
      setUrl('');
      setShowAddOptions(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newSource: Source = {
        id: new Date().toISOString(),
        type: 'pdf',
        name: file.name,
      };
      onAddSource(newSource);
      setShowAddOptions(false);
    }
  };

  return (
    <div className="glassmorphism rounded-2xl h-full flex flex-col p-6 shadow-2xl">
      <div className="flex-shrink-0 flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Knowledge Base</h2>
        <div className="relative">
          <button
            onClick={() => setShowAddOptions(!showAddOptions)}
            className="bg-blue-600 rounded-full p-2 hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 text-white" />
          </button>
          <AnimatePresence>
            {showAddOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-12 mt-1 w-48 bg-gray-800 rounded-lg shadow-lg z-20"
              >
                <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept=".pdf" />
                <label htmlFor="file-upload" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer rounded-t-lg">
                  <FileIcon className="w-4 h-4" />
                  <span>Upload PDF</span>
                </label>
                <div className="p-2 border-t border-gray-700">
                    <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter URL" className="w-full bg-gray-900 text-sm p-1 rounded border border-gray-600 text-white" />
                    <button onClick={handleAddUrl} className="w-full text-left flex items-center gap-2 px-2 py-2 mt-1 text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg">
                        <LinkIcon className="w-4 h-4" />
                        <span>Add URL</span>
                    </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto -mr-2 pr-2">
        <ul className="space-y-2">
          {sources.map(source => (
            <li key={source.id} className="group flex items-center justify-between bg-gray-900/40 p-3 rounded-lg">
              <button onClick={() => onSelectSource(source)} className="flex items-center gap-3 truncate flex-grow text-left">
                <div className="flex-shrink-0">
                  {source.type === 'pdf' ? <FileIcon className="w-5 h-5 text-purple-400" /> : <LinkIcon className="w-5 h-5 text-green-400" />}
                </div>
                <span className="text-sm text-gray-300 truncate group-hover:text-white">{source.name}</span>
              </button>
              <button onClick={() => onDeleteSource(source.id)} className="flex-shrink-0 text-gray-500 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100">
                <TrashIcon className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UploadPanel;
