
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { Send, MessageSquare, Shield, Users, X, Lock } from 'lucide-react';
import { ref, push, onValue, query, limitToLast } from 'firebase/database';
import { rtdb } from '../firebase';

interface Props {
    user: User;
    onClose: () => void;
    isAdmin?: boolean;
    targetUser?: User; // For Admin DM
    roomId?: string; // NEW
    roomName?: string; // NEW
}

export const UniversalChat: React.FC<Props> = ({ user, onClose, isAdmin, targetUser, roomId, roomName }) => {
    const [activeTab, setActiveTab] = useState<'GLOBAL' | 'SUPPORT'>(isAdmin ? 'SUPPORT' : 'GLOBAL');
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const dummyRef = useRef<HTMLDivElement>(null);

    // If Admin is chatting with specific user, lock to Support
    // If roomId is provided, use it directly (bypass tabs)
    const chatPath = roomId 
        ? `chat/rooms/${roomId}`
        : activeTab === 'GLOBAL' 
            ? 'chat/universal' 
            : `chat/dm/${isAdmin ? targetUser?.id : user.id}`;

    useEffect(() => {
        if (activeTab === 'SUPPORT' && isAdmin && !targetUser && !roomId) return;

        const q = query(ref(rtdb, chatPath), limitToLast(50));
        const unsubscribe = onValue(q, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.entries(data).map(([k, v]: any) => ({
                    id: k,
                    ...v
                }));
                setMessages(list);
            } else {
                setMessages([]);
            }
        });

        return () => unsubscribe();
    }, [chatPath, activeTab, isAdmin, targetUser]);

    useEffect(() => {
        dummyRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        
        try {
            const msg = {
                text: input,
                userId: user.id || 'anonymous',
                userName: user.name || 'User',
                role: user.role || 'STUDENT',
                timestamp: new Date().toISOString()
            };

            await push(ref(rtdb, chatPath), msg);
            setInput('');
        } catch (e: any) {
            console.error("Chat Error:", e);
            alert("Failed to send message: " + e.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${roomId ? 'bg-indigo-600' : activeTab === 'GLOBAL' ? 'bg-blue-600' : 'bg-green-600'}`}>
                            {roomId ? <MessageSquare size={20} /> : activeTab === 'GLOBAL' ? <Users size={20} /> : <Shield size={20} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">
                                {roomId ? roomName : activeTab === 'GLOBAL' ? 'Universal Chat' : isAdmin ? `Chat with ${targetUser?.name}` : 'Admin Support'}
                            </h3>
                            <p className="text-[10px] text-slate-400">
                                {roomId ? 'Community Room' : activeTab === 'GLOBAL' ? 'Connect with everyone' : 'Private & Secure'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                </div>

                {/* Tabs (Only for Student and if NO Room ID) */}
                {!isAdmin && !roomId && (
                    <div className="flex bg-slate-100 p-1">
                        <button 
                            onClick={() => setActiveTab('GLOBAL')} 
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'GLOBAL' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={14} /> Community
                        </button>
                        <button 
                            onClick={() => setActiveTab('SUPPORT')} 
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'SUPPORT' ? 'bg-white shadow text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Shield size={14} /> Admin Help
                        </button>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <MessageSquare size={48} className="mb-2 opacity-50" />
                            <p className="text-xs">No messages yet. Say Hi!</p>
                        </div>
                    )}
                    
                    {messages.map((msg) => {
                        const isMe = msg.userId === user.id;
                        const isAdminMsg = msg.role === 'ADMIN';
                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                                    isMe 
                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                    : isAdminMsg
                                        ? 'bg-slate-800 text-white rounded-tl-none border border-green-500/50'
                                        : 'bg-white text-slate-700 rounded-tl-none border border-slate-200'
                                }`}>
                                    {!isMe && (
                                        <p className={`text-[9px] font-bold mb-1 ${isAdminMsg ? 'text-green-400 flex items-center gap-1' : 'text-blue-600'}`}>
                                            {isAdminMsg && <Shield size={8} />} {msg.userName}
                                        </p>
                                    )}
                                    {msg.text}
                                </div>
                                <span className="text-[9px] text-slate-400 mt-1 px-1">
                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        );
                    })}
                    <div ref={dummyRef} />
                </div>

                {/* Input */}
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..." 
                        className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
