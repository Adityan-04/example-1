import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircleIcon, UserIcon, MailIcon, LockIcon } from './icons';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
    const [name, setName] = useState('John Doe');
    const [email, setEmail] = useState('john.doe@example.com');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        // Reset form when modal is opened, in case it was closed without saving
        if (isOpen) {
            setName('John Doe');
            setEmail('john.doe@example.com');
            setCurrentPassword('');
            setNewPassword('');
        }
    }, [isOpen]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real application, you would send this data to your backend.
        console.log("Saving user settings:", { name, email, newPassword: '***' });
        onClose(); // Close modal after "saving"
    };

    return (
        <AnimatePresence>
            {isOpen && (
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
                        className="glassmorphism rounded-2xl w-full max-w-lg shadow-2xl p-8 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                            <XCircleIcon className="w-8 h-8" />
                        </button>
                        
                        <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>

                        <form onSubmit={handleSave} className="space-y-6">
                           <InputWithIcon icon={<UserIcon className="w-5 h-5" />} label="Full Name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                           <InputWithIcon icon={<MailIcon className="w-5 h-5" />} label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                           
                           <div className="pt-4 border-t border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-300 mb-4">Change Password</h3>
                                <div className="space-y-4">
                                    <InputWithIcon icon={<LockIcon className="w-5 h-5" />} label="Current Password" type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                                    <InputWithIcon icon={<LockIcon className="w-5 h-5" />} label="New Password" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                </div>
                           </div>

                           <div className="flex justify-end pt-4">
                               <button 
                                 type="submit"
                                 className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    Save Changes
                               </button>
                           </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const InputWithIcon: React.FC<{ 
    icon: React.ReactNode; 
    label: string; 
    type: string; 
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ icon, label, type, placeholder, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
        <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                {icon}
            </span>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={type !== 'password'} // Passwords might not always be required to change
                className="w-full bg-gray-900/50 border border-gray-600 rounded-lg py-3 pr-4 pl-10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
        </div>
    </div>
);


export default AccountSettingsModal;