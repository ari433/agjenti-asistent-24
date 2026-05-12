import { useState, useRef, useEffect } from 'react';
import { askAI, generateImageAI } from '../lib/gemini';
import { AppUser, Task, Goal } from '../types';
import { db, collection, onSnapshot, query, where } from '../lib/firebase';
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
  Zap,
  ListTodo,
  AlertTriangle,
  Target,
  Briefcase
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user.companyId) return;
    
    // Live Context Listeners
    const qTasks = query(collection(db, 'tasks'), where('companyId', '==', user.companyId));
    const qGoals = query(collection(db, 'goals'), where('companyId', '==', user.companyId));

    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const allTasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      
      // Determine if a NEW task was assigned to the user
      setTasks(prev => {
        const myActiveTasks = allTasks.filter(t => t.assigneeId === user.uid && t.status !== 'done');
        const prevMyActiveTasks = prev.filter(t => t.assigneeId === user.uid && t.status !== 'done');
        
        if (allTasks.length > 0 && messages.length === 0) {
            let welcomeMsg = `Përshëndetje **${user.displayName}**! 👋\n\n`;
            if (myActiveTasks.length > 0) {
              welcomeMsg += `Kam identifikuar **${myActiveTasks.length} detyra** të hapura për ju. Detyra juaj e rradhës është: **"${myActiveTasks[0].title}"**.\n\nDëshironi ndihmë për ta përfunduar këtë detyrë sot?`;
            } else {
              welcomeMsg += `Shkëlqyeshëm! Nuk keni detyra të pambaruara për momentin. A doni të gjenerojmë ndonjë ide të re marketingu apo të analizojmë qëllimet e kompanisë?`;
            }
            setMessages([{ role: 'assistant', content: welcomeMsg, type: 'text' }]);
        } else if (myActiveTasks.length > prevMyActiveTasks.length && messages.length > 0) {
             // New task detected while chatting
             const newTasks = myActiveTasks.filter(nt => !prevMyActiveTasks.find(pt => pt.id === nt.id));
             if (newTasks.length > 0) {
                setMessages(m => [...m, { 
                    role: 'assistant', 
                    content: `🔔 **Njoftim i Ri:** Sapo ju është caktuar një detyrë e re: **"${newTasks[0].title}"**. \n\nDëshironi të më jepni detajet që të fillojmë menjëherë me planin e punës?`, 
                    type: 'text' 
                }]);
             }
        }
        return allTasks;
      });
    });

    const unsubGoals = onSnapshot(qGoals, (snap) => {
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal)));
    });

    return () => {
      unsubTasks();
      unsubGoals();
    };
  }, [user.companyId, user.uid, user.displayName, messages.length]);

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

    const isImageRequest = userMessage.toLowerCase().includes('gjenero imazh') || 
                          userMessage.toLowerCase().includes('krijo imazh') ||
                          userMessage.toLowerCase().includes('vizato') ||
                          userMessage.toLowerCase().includes('poster');

    setThinkingStep(isImageRequest ? "Duke ideuar vizualin..." : "Duke analizuar të dhënat tuaja...");

    try {
      if (isImageRequest) {
        setThinkingStep("Duke gjeneruar imazhin (kjo mund të zgjasë pak)...");
        const isPoster = userMessage.toLowerCase().includes('poster');
        const enhancedPrompt = isPoster 
          ? `Krijo një poster profesional marketingu për biznes. Tema: ${userMessage}. Stili: Modern, minimalist, me ngjyra profesionale.`
          : userMessage;

        const imgUrl = await generateImageAI(enhancedPrompt);
        if (imgUrl) {
           setMessages(prev => [...prev, { role: 'assistant', content: imgUrl, type: 'image' }]);
        } else {
           setMessages(prev => [...prev, { role: 'assistant', content: "Më vjen keq, nuk munda të gjeneroja këtë vizual momentalisht.", type: 'text' }]);
        }
      } else if (userMessage.toLowerCase().includes('pdf') || userMessage.toLowerCase().includes('raport')) {
        const response = await askAI(userMessage, `Ti je një hartues raportesh profesionale. Krijo një përmbledhje të performancës mbështetur në të dhënat e ekipit.`);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response + "\n\n*(Njoftim: Mund të gjeneroni raporte zyrtare PDF te faqja 'Performanca')*", 
          type: 'text' 
        }]);
      } else {
        setThinkingStep("Duke hartuar përgjigjen strategjike...");
        const myTasks = tasks.filter(t => t.assigneeId === user.uid);
        const otherTasks = tasks.filter(t => t.assigneeId !== user.uid);
        
        const context = `
        Ti je "Agjenti", truri i inteligjencës artificiale për këtë biznes. 
        Përdoruesi: ${user.displayName} (Rol: ${user.role})
        
        TË DHËNAT E SISTEMIT (Live Context):
        - DETYRAT E PËRDORUESIT AKTUAL: ${JSON.stringify(myTasks.map(t => ({ titulli: t.title, statusi: t.status, afati: t.dueDate })))}
        - DETYRAT E EKIPIT: ${JSON.stringify(otherTasks.map(t => ({ titulli: t.title, punonjesi: t.assigneeName, statusi: t.status })))}
        - OBJEKTIVAT E KOMPANISË: ${JSON.stringify(goals.map(g => ({ titulli: g.title, progresi: g.progress })))}
        
        UDHËZIME:
        1. Nëse përdoruesi pyet "çfarë kam sot?", fokusohu specifikisht te detyrat e tij aktive.
        2. Nëse një detyrë është "pending", sugjero hapat e parë si mund ta nisë atë.
        3. Ji shumë proaktiv. Nëse sheh që ka shumë detyra të pambaruara, shpreh shqetësim profesional dhe jep zgjidhje.
        4. Kur përdoruesi kërkon ndihmë për një detyrë konkrete, analizo titullin dhe jep ide kreative.
        5. Përgjigju në SHQIP të saktë, pa gabime drejtshkrimore.
        `;

        const response = await askAI(userMessage, context);
        setMessages(prev => [...prev, { role: 'assistant', content: response || "Nuk munda të kthej përgjigje.", type: 'text' }]);
      }
    } catch (error) {
      console.error("Agent error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Ndodhi një gabim teknik. Provo përsëri.", type: 'text' }]);
    } finally {
      setIsLoading(false);
      setThinkingStep('');
    }
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
    { label: 'Çfarë detyrash kanë ekipa sot?', icon: ListTodo },
    { label: 'Analizo qëllimet tona strategjike', icon: BrainCircuit },
    { label: 'Gjenero imazh për marketing', icon: ImageIcon },
    { label: 'Detyrat e mia aktive', icon: Zap },
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
                    <div className="bg-white p-6 rounded-3xl rounded-tl-none border border-slate-100 shadow-sm flex flex-col gap-2">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                        {thinkingStep && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">{thinkingStep}</p>}
                    </div>
                </div>
            )}
            <div ref={scrollRef} />
        </div>

        <footer className="p-8 bg-white border-t border-slate-100">
            <div className="flex gap-2 mb-4">
                <button 
                  type="button"
                  onClick={() => setInput("Gjenero një poster profesional për marketing")}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
                >
                    <ImageIcon size={14} /> Gjenero Imazh
                </button>
                <button 
                  type="button"
                  onClick={() => setInput("Analizo performancën e ekipit")}
                  className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-2"
                >
                    <Target size={14} /> Analizo Biznesin
                </button>
            </div>
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
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-800 text-indigo-400 rounded-xl">
                    <ListTodo size={20} />
                </div>
                <h3 className="font-bold">Hapësira juaj e Punës</h3>
            </div>
            <div className="space-y-4">
               <div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Detyrat Aktive</p>
                  <div className="space-y-2">
                     {tasks.filter(t => t.assigneeId === user.uid && t.status !== 'done').slice(0, 3).map(task => (
                        <div key={task.id} className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                           <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                           <span className="text-[11px] font-medium truncate">{task.title}</span>
                        </div>
                     ))}
                     {tasks.filter(t => t.assigneeId === user.uid && t.status !== 'done').length === 0 && (
                        <p className="text-[11px] text-slate-400 italic">Nuk ka detyra aktive.</p>
                     )}
                  </div>
               </div>
               
               <div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Qëllimet e Kompanisë</p>
                   <div className="space-y-2">
                     {goals.slice(0, 2).map(goal => (
                        <div key={goal.id} className="space-y-1">
                           <div className="flex justify-between text-[10px] font-bold">
                              <span className="truncate max-w-[120px]">{goal.title}</span>
                              <span className="text-indigo-400">{goal.progress}%</span>
                           </div>
                           <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${goal.progress}%` }}></div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex-1">
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
