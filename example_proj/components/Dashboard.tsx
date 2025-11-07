import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Torus } from '@react-three/drei';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

// Components
import ChatPanel from './ChatPanel';
import UploadPanel from './UploadPanel';
import VideoPanel from './VideoPanel';
import KnowledgePanel from './KnowledgePanel';
import InsightsPanel from './InsightsPanel';
import AccountSettingsModal from './AccountSettingsModal';
import NotificationCenter from './NotificationCenter';
import VoiceInput from './VoiceInput';
import SearchBar from './SearchBar';

// 3D Scene Component
const Scene3D: React.FC = () => {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      
      <motion.group
        animate={{ 
          rotation: [0, Math.PI * 2, 0],
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: "linear" 
        }}
      >
        <Sphere args={[1, 32, 32]} position={[-2, 0, 0]}>
          <meshStandardMaterial color="#8b5cf6" transparent opacity={0.6} />
        </Sphere>
        <Box args={[1, 1, 1]} position={[2, 0, 0]}>
          <meshStandardMaterial color="#06b6d4" transparent opacity={0.6} />
        </Box>
        <Torus args={[0.8, 0.3, 16, 32]} position={[0, 0, -1]}>
          <meshStandardMaterial color="#10b981" transparent opacity={0.6} />
        </Torus>
      </motion.group>
      
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
};

interface DashboardProps {
  onLogout?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { user, logout } = useAuth();
  const { notifications } = useNotifications();
  const [activePanel, setActivePanel] = useState<'chat' | 'upload' | 'video' | 'knowledge' | 'insights' | 'search'>('chat');
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const panels = [
    { id: 'chat', label: 'AI Chat', icon: '💬', description: 'Ask questions about your documents' },
    { id: 'upload', label: 'Upload', icon: '📁', description: 'Upload and process documents' },
    { id: 'video', label: 'Video Analysis', icon: '🎥', description: 'Analyze video content' },
    { id: 'knowledge', label: 'Knowledge Graph', icon: '🧠', description: 'Explore document relationships' },
    { id: 'insights', label: 'Analytics', icon: '📊', description: 'View usage insights and reports' },
    { id: 'search', label: 'Search', icon: '🔍', description: 'Advanced document search' },
  ] as const;

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    // Initialize dashboard
    console.log('Dashboard initialized for user:', user?.name);
  }, [user]);

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm border-b border-white/20"
      >
        <div className="flex items-center space-x-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg"
          >
            <span className="text-white font-bold text-lg">DS</span>
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-white">DocuSage AI</h1>
            <p className="text-sm text-gray-300">Welcome back, {user?.name}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search Bar */}
          <div className="relative">
            <SearchBar
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onSearch={(query) => {
                setActivePanel('search');
                // Handle search logic
              }}
            />
          </div>

          {/* Voice Input */}
          <VoiceInput />

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <span className="text-xl">🔔</span>
            {unreadNotifications > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
              >
                {unreadNotifications}
              </motion.span>
            )}
          </motion.button>

          {/* Settings */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAccountSettings(true)}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <span className="text-xl">⚙️</span>
          </motion.button>

          {/* Logout */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
          >
            Logout
          </motion.button>
        </div>
      </motion.header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-72 bg-white/5 backdrop-blur-sm border-r border-white/10 p-6"
        >
          <nav className="space-y-3">
            {panels.map((panel, index) => (
              <motion.button
                key={panel.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ x: 5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActivePanel(panel.id)}
                className={`w-full flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 ${
                  activePanel === panel.id
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30 shadow-lg'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-2xl">{panel.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{panel.label}</div>
                  <div className="text-xs opacity-75">{panel.description}</div>
                </div>
              </motion.button>
            ))}
          </nav>

          {/* 3D Scene */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 h-48 rounded-xl overflow-hidden border border-white/10"
          >
            <Scene3D />
          </motion.div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {activePanel === 'chat' && <ChatPanel />}
              {activePanel === 'upload' && <UploadPanel />}
              {activePanel === 'video' && <VideoPanel />}
              {activePanel === 'knowledge' && <KnowledgePanel />}
              {activePanel === 'insights' && <InsightsPanel />}
              {activePanel === 'search' && <div className="p-8 text-white">Search Panel - Coming Soon</div>}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAccountSettings && (
          <AccountSettingsModal
            onClose={() => setShowAccountSettings(false)}
            onLogout={handleLogout}
          />
        )}
        
        {showNotifications && (
          <NotificationCenter
            onClose={() => setShowNotifications(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;