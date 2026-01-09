
import React, { useState } from 'react';
import { User, SystemSettings, ChatRoom } from '../types';
import { MessageSquare, X, Lock, Users } from 'lucide-react';
import { UniversalChat } from './UniversalChat';

interface Props {
    user: User;
    settings?: SystemSettings;
    onClose: () => void;
}

export const ChatHub: React.FC<Props> = ({ user, settings, onClose }) => {
    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);

    const rooms = settings?.chatRooms || [];

    if (selectedRoom) {
        return (
            <UniversalChat 
                user={user} 
                roomId={selectedRoom.id} 
                roomName={selectedRoom.name} 
                onClose={() => setSelectedRoom(null)} 
            />
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare size={20} className="text-emerald-400" />
                        <h3 className="font-bold text-sm">Community Hub</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full"><X size={20} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-2">Active Rooms</p>
                    
                    {rooms.filter(r => r.enabled).length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                            <p>No chat rooms active.</p>
                        </div>
                    )}

                    {rooms.filter(r => r.enabled).map(room => (
                        <button 
                            key={room.id}
                            onClick={() => setSelectedRoom(room)}
                            className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all text-left group"
                        >
                            <div className="bg-blue-50 p-3 rounded-full text-blue-600 group-hover:bg-blue-100 transition-colors">
                                {room.type === 'PRIVATE' ? <Lock size={20} /> : <Users size={20} />}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">{room.name}</h4>
                                <p className="text-xs text-slate-500">{room.description || 'Join the conversation'}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
