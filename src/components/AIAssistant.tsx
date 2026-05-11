import { useState, useRef, useEffect } from 'react';
import { askAI, generateImageAI } from '../lib/gemini';
import { AppUser } from '../types';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Trash2, 
  Copy, 
  Download, 
  Image as ImageIcon,
  Wand2,
  Cpu,
  BrainCircuit,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface AIAssistantProps {
  user: AppUser;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image';
}

export default function AIAssistant({ user }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: `Përshëndetje ${user.displayName}! Unë jam Agjenti tuaj AI. Si mund t'ju ndihmoj sot me menaxhimin e ekipit apo strategjinë e biznesit?`,
      type: 'text'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, type: 'text' }]);
    setIsLoading(true);

    // Check if user wants an image
    const isImageRequest = userMessage.toLowerCase().includes('gjenero imazh') || 
                          userMessage.toLowerCase().includes('krijo imazh') ||
                          userMessage.toLowerCase().includes('vizato');

    if (isImageRequest) {
      const imgUrl = await generateImageAI(userMessage);
      if (imgUrl) {
         setMessages(prev => [...prev, { role: 'assistant', content: imgUrl, type: 'image' }]);
      } else {
         setMessages(prev => [...prev, { role: 'assistant', content: "Më vjen keq, nuk munda të gjeneroja imazhin.", type: 'text' }]);
      }
    } else {
      const response = await askAI(userMessage, `Ti je një asistent i lartë ekzekutiv për platformën "Agjenti AI". Përdoruesi është ${user.displayName} me rol ${user.role}. Ndihmoje atë me strategji, email-e, detyra ose pyetje të përgjithshme biznesi.`);
      setMessages(prev => [...prev, { role: 'assistant', content: response || "Nuk munda të kthej përgjigje.", type: 'text' }]);
    }

    setIsLoading(false);
  };

  const clearChat = () => {
    setMessages([
        { 
          role: 'assistant', 
          content: `Përshëndetje! Unë jam gati për detyra të reja.`,
          type: 'text'
        }
    ]);
  };

  const quickActions = [
    { label: 'Shkruaj një email për ekipin', icon: Wand2 },
    { label: 'Analizo strategjinë 6 mujore', icon: BrainCircuit },
    { label: 'Gjenero imazh për marketing', icon: ImageIcon },
    { label: 'Si të përmirësoj performancën?', icon: Zap },
  ];

  return (
    <div className="h-full flex gap-8">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50 rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
        <header className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden">
                    <Sparkles size={24} />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-slate-900">Agjenti juaj AI</h2>
                   <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Fuqizuar nga Gemini</p>
                </div>
            </div>
            <button 
                onClick={clearChat}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
                <Trash2 size={20} />
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <AnimatePresence>
                {messages.map((msg, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={i}
                        className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md",
                            msg.role === 'user' ? "bg-slate-900 text-white" : "bg-white text-indigo-600 border border-indigo-100"
                        )}>
                            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                        </div>
                        <div className={cn(
                            "max-w-[85%] p-6 rounded-3xl text-sm leading-relaxed",
                            msg.role === 'user' ? "bg-slate-900 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-sm"
                        )}>
                            {msg.type === 'text' ? (
                                <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-a:text-indigo-600">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <img src={msg.content} alt="AI Generated" className="rounded-2xl w-full h-auto shadow-lg" />
                                    <button 
                                        className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider"
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = msg.content;
                                            link.download = 'ai-image.png';
                                            link.click();
                                        }}
                                    >
                                        <Download size={14} /> Shkarko Imazhin
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
            {isLoading && (
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-md">
                        <Bot size={20} className="animate-pulse" />
                    </div>
                    <div className="bg-white p-6 rounded-3xl rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                </div>
            )}
            <div ref={scrollRef} />
        </div>

        <footer className="p-8 bg-white border-t border-slate-100">
            <form onSubmit={handleSend} className="relative group">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Më pyet çdo gjë rreth biznesit..."
                    className="w-full pl-6 pr-16 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-base"
                />
                <button 
                    disabled={isLoading || !input.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group-focus-within:scale-105"
                >
                    <Send size={24} className="-mr-1 rotate-45" />
                </button>
            </form>
        </footer>
      </div>

      {/* Sidebar Info */}
      <div className="hidden xl:flex flex-col gap-6 w-80">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Cpu size={20} />
                </div>
                <h3 className="font-bold text-slate-900">Veprime të Shpejta</h3>
            </div>
            <div className="space-y-3">
                {quickActions.map(action => (
                    <button 
                        key={action.label}
                        onClick={() => setInput(action.label)}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all text-left group"
                    >
                        <action.icon size={18} className="text-slate-400 group-hover:text-indigo-600" />
                        <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 leading-tight">{action.label}</span>
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] text-white shadow-xl">
            <h4 className="font-bold text-lg mb-2">Platforma Agjenti AI</h4>
            <p className="text-xs text-indigo-100 leading-relaxed mb-6">
                Përdorni fuqinë e inteligjencës artificiale për të optimizuar çdo aspekt të biznesit tuaj. Unë mund të shkruaj, analizoj dhe vizualizoj idetë tuaja.
            </p>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-200">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                Gati për bashkëpunim
            </div>
        </div>
      </div>
    </div>
  );
}
