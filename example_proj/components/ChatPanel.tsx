import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { PaperclipIcon, ArrowUpIcon, SparklesIcon, UserIcon } from './icons';
import { generateChatResponse } from '../services/mockAiService';
import Markdown from 'react-markdown';

interface ChatPanelProps {
  sources: Message['citations'];
}

const ChatPanel: React.FC<ChatPanelProps> = ({ sources: knowledgeSources }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMessageId, text: '', sender: 'ai' }]);
    
    abortControllerRef.current = new AbortController();

    try {
      await generateChatResponse(input, null, chunk => {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId ? { ...msg, text: msg.text + chunk } : msg
        ));
      }, abortControllerRef.current.signal);

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error("Failed to get chat response:", error);
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId ? { ...msg, text: "Sorry, I encountered an error." } : msg
        ));
      }
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId ? { ...msg, citations: knowledgeSources?.slice(0,2) } : msg
      ));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="glassmorphism rounded-2xl h-full flex flex-col p-6 shadow-2xl">
      <div className="flex-grow overflow-y-auto mb-4 -mr-2 pr-2">
        <div className="space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex items-start gap-4 ${message.sender === 'user' ? 'justify-end' : ''}`}>
              {message.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="w-5 h-5 text-blue-400" />
                </div>
              )}
              <div className={`p-4 rounded-2xl max-w-lg ${message.sender === 'ai' ? 'bg-gray-800/60' : 'bg-blue-600'}`}>
                <div className="prose prose-sm prose-invert text-white">
                  <Markdown>{message.text}</Markdown>
                </div>
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-400 mb-2">Sources:</h4>
                    <div className="flex flex-wrap gap-2">
                      {message.citations.map((citation, i) => (
                        <a key={i} href={citation.url} target="_blank" rel="noopener noreferrer" className="bg-gray-700/50 text-xs text-gray-300 px-2 py-1 rounded-md hover:bg-gray-600 transition-colors">
                          {citation.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="flex-shrink-0 relative">
        <div className="absolute bottom-3 left-3">
          <button className="text-gray-400 hover:text-white transition-colors">
            <PaperclipIcon className="w-5 h-5" />
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your documents..."
          className="w-full bg-gray-900/50 border border-gray-600 rounded-lg py-3 pr-20 pl-10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          rows={1}
        />
        <div className="absolute bottom-2 right-2">
          <button 
            onClick={handleSendMessage} 
            disabled={isLoading || input.trim() === ''}
            className="bg-blue-600 text-white rounded-lg p-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
