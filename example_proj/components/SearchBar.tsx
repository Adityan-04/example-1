import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, XIcon } from '@heroicons/react/outline';

interface SearchBarProps {
  onFocus?: () => void;
  onBlur?: () => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onFocus,
  onBlur,
  onSearch,
  placeholder = "Search documents, ask questions...",
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Generate suggestions based on query
    if (query.length > 2) {
      const mockSuggestions = [
        'What is the main topic?',
        'Summarize the key points',
        'Find related documents',
        'Compare with other sources',
        'Extract important data'
      ].filter(s => s.toLowerCase().includes(query.toLowerCase()));
      setSuggestions(mockSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      setIsFocused(false);
      onBlur?.();
    }, 200);
  };

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      // Add to recent searches
      const newRecent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem('recentSearches', JSON.stringify(newRecent));

      // Clear input and suggestions
      setQuery('');
      setSuggestions([]);
      
      // Call search handler
      onSearch?.(searchQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setQuery('');
      setSuggestions([]);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleRecentClick = (recent: string) => {
    setQuery(recent);
    handleSearch(recent);
  };

  const clearQuery = () => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <motion.div
        className={`relative flex items-center bg-white/10 backdrop-blur-sm rounded-xl border transition-all duration-200 ${
          isFocused 
            ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' 
            : 'border-white/20 hover:border-white/30'
        }`}
        animate={{
          scale: isFocused ? 1.02 : 1,
        }}
      >
        <div className="pl-4 pr-2">
          <SearchIcon className="w-5 h-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder-gray-400 py-3 pr-4 focus:outline-none"
        />
        
        {query && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={clearQuery}
            className="p-1 mr-2 text-gray-400 hover:text-white transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </motion.button>
        )}
      </motion.div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {isFocused && (suggestions.length > 0 || recentSearches.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl z-50"
          >
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-2">
                <div className="text-xs text-gray-400 px-3 py-2 font-medium">Suggestions</div>
                {suggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <SearchIcon className="w-4 h-4 text-gray-400" />
                      <span>{suggestion}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="p-2 border-t border-white/10">
                <div className="text-xs text-gray-400 px-3 py-2 font-medium">Recent Searches</div>
                {recentSearches.map((recent, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (suggestions.length + index) * 0.05 }}
                    onClick={() => handleRecentClick(recent)}
                    className="w-full text-left px-3 py-2 text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 text-gray-400">🕒</div>
                      <span>{recent}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
