import { useState, useEffect, useRef } from 'react';
import { db, collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, limit, where } from '../lib/firebase';
import { AppUser, ChatMessage } from '../types';
import { Send, Image as ImageIcon, Smile, MoreHorizontal, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamChatProps {
  user: AppUser;
}

export default function TeamChat({ user }: TeamChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user.companyId) return;

    const q = query(
      collection(db, 'messages'), 
      where('companyId', '==', user.companyId),
      orderBy('createdAt', 'asc'), 
      limit(100)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    });
    return () => unsub();
  }, [user.companyId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user.companyId) return;

    const content = newMessage;
    setNewMessage('');

    await addDoc(collection(db, 'messages'), {
      senderId: user.uid,
      senderName: user.displayName,
      senderPhoto: user.photoURL,
      content,
      createdAt: serverTimestamp(),
      companyId: user.companyId
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
      <header className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden">
             <MessageCircle size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Biseda e Ekipit</h2>
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">● Online tani</p>
          </div>
        </div>
        <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => {
          const isOwn = msg.senderId === user.uid;
          const showAvatar = i === 0 || messages[i-1].senderId !== msg.senderId;
          
          return (
            <div key={msg.id} className={cn("flex items-end gap-3", isOwn ? "flex-row-reverse" : "flex-row")}>
              {!isOwn && (
                <div className="w-8 h-8 shrink-0">
                   {showAvatar && (
                     <img 
                        src={msg.senderPhoto || `https://ui-avatars.com/api/?name=${msg.senderName}`} 
                        alt="" 
                        className="w-8 h-8 rounded-full shadow-sm bg-white"
                     />
                   )}
                </div>
              )}
              <div className={cn("max-w-[70%] space-y-1", isOwn ? "items-end" : "items-start")}>
                {showAvatar && !isOwn && <p className="text-[10px] font-bold text-slate-400 ml-1 uppercase">{msg.senderName}</p>}
                <div className={cn(
                  "p-4 rounded-2xl text-sm shadow-sm",
                  isOwn ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-slate-800 rounded-bl-none border border-slate-100"
                )}>
                  {msg.content}
                </div>
                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">
                    {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }) : 'Po dërgohet...'}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <footer className="p-6 bg-white border-t border-slate-100">
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-3">
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Shkruaj një mesazh..."
              className="w-full pl-6 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400">
               <button type="button" className="hover:text-blue-600 transition-colors"><ImageIcon size={20} /></button>
               <button type="button" className="hover:text-blue-600 transition-colors"><Smile size={20} /></button>
            </div>
          </div>
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Send size={24} className="-mr-1 rotate-45" />
          </button>
        </form>
      </footer>
    </div>
  );
}


