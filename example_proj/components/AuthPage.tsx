import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoIcon, MailIcon, LockIcon, UserIcon } from './icons';

interface AuthPageProps {
    onLoginSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

    const formVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
    };

    return (
        <div className="h-full w-full flex items-center justify-center">
            <motion.div 
                className="glassmorphism rounded-2xl w-full max-w-md p-8 shadow-2xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                <div className="flex flex-col items-center mb-8">
                    <LogoIcon className="h-12 w-12 text-blue-400" />
                    <h1 className="text-3xl font-bold mt-2 text-gray-100">DocuSage AI</h1>
                    <p className="text-gray-400">Unlock the power of your documents.</p>
                </div>

                <AnimatePresence mode="wait">
                    {authMode === 'login' ? (
                        <motion.div
                            key="login"
                            variants={formVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <LoginForm onLoginSuccess={onLoginSuccess} />
                            <p className="text-center text-sm text-gray-400 mt-6">
                                Don't have an account?{' '}
                                <button onClick={() => setAuthMode('signup')} className="font-semibold text-blue-400 hover:text-blue-300 transition">
                                    Sign Up
                                </button>
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="signup"
                            variants={formVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <SignUpForm onLoginSuccess={onLoginSuccess} />
                            <p className="text-center text-sm text-gray-400 mt-6">
                                Already have an account?{' '}
                                <button onClick={() => setAuthMode('login')} className="font-semibold text-blue-400 hover:text-blue-300 transition">
                                    Log In
                                </button>
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const LoginForm: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onLoginSuccess(); }}>
        <InputWithIcon icon={<MailIcon className="w-5 h-5" />} type="email" placeholder="Email" />
        <InputWithIcon icon={<LockIcon className="w-5 h-5" />} type="password" placeholder="Password" />
        <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
            Log In
        </button>
    </form>
);

const SignUpForm: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onLoginSuccess(); }}>
        <InputWithIcon icon={<UserIcon className="w-5 h-5" />} type="text" placeholder="Full Name" />
        <InputWithIcon icon={<MailIcon className="w-5 h-5" />} type="email" placeholder="Email" />
        <InputWithIcon icon={<LockIcon className="w-5 h-5" />} type="password" placeholder="Password" />
        <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
            Create Account
        </button>
    </form>
);

const InputWithIcon: React.FC<{ icon: React.ReactNode; type: string; placeholder: string }> = ({ icon, type, placeholder }) => (
    <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            {icon}
        </span>
        <input
            type={type}
            placeholder={placeholder}
            required
            className="w-full bg-gray-900/50 border border-gray-600 rounded-lg py-3 pr-4 pl-10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
    </div>
);


export default AuthPage;
