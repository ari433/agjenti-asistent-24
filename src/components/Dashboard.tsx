import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, where, orderBy, limit, getDocs } from '../lib/firebase';
import { AppUser, Task, Goal, TaskStatus } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  TrendingUp, 
  AlertCircle,
  Lightbulb,
  ArrowRight,
  Target,
  Sparkles,
  Zap,
  Activity,
  Users,
  Image as ImageIcon
} from 'lucide-react';
import { askAI } from '../lib/gemini';
import { motion } from 'framer-motion';
import { formatDate, cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface DashboardProps {
  user: AppUser;
}

export default function Dashboard({ user }: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [membersCount, setMembersCount] = useState(0);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (!user.companyId) return;

    if (user.role === 'admin') {
      const uQuery = query(collection(db, 'users'), where('companyId', '==', user.companyId));
      getDocs(uQuery).then(snapshot => setMembersCount(snapshot.size));
    }
    
    const tasksQuery = query(
      collection(db, 'tasks'), 
      where('companyId', '==', user.companyId),
      orderBy('createdAt', 'desc'), 
      limit(10)
    );
    const goalsQuery = query(
      collection(db, 'goals'), 
      where('companyId', '==', user.companyId),
      where('status', '==', 'active')
    );

    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    const unsubGoals = onSnapshot(goalsQuery, (snapshot) => {
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)));
    });

    return () => {
      unsubTasks();
      unsubGoals();
    };
  }, [user.companyId]); // Properly add dependencies

  const getAIAdvice = async () => {
    if (loadingAI) return;
    setLoadingAI(true);
    try {
      const context = `Përdoruesi: ${user.displayName}. Rolet: ${user.role}. Qëllimet aktive: ${goals.length}. Detyrat e fundit: ${tasks.map(t => t.title).join(', ')}.`;
      const prompt = `Si një asistent strategjik i nivelit të lartë, analizo gjendjen aktuale të biznesit dhe jep një këshillë "Next-Level" për menaxherin (max 3 fjali).
      Përdor gjuhën shqipe, ton profesional dhe vizionar.`;
      const advice = await askAI(prompt, "Je një asistent ekzekutiv AI për biznese.");
      setAiAdvice(advice || '');
    } catch (err) {
      console.error("Dashboard AI Advice error:", err);
    } finally {
      setLoadingAI(false);
    }
  };

  // Only run initial advice once when tasks load first time
  useEffect(() => {
    if (tasks.length > 0 && !aiAdvice && !loadingAI) {
      getAIAdvice();
    }
  }, [tasks.length > 0]);

  const stats = [
    { label: 'Detyra Totale', value: tasks.length, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Qëllime Aktive', value: goals.length, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: user.role === 'admin' ? 'Anëtarë Ekipi' : 'Efikasiteti', value: user.role === 'admin' ? membersCount : '84%', icon: user.role === 'admin' ? Users : TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Në Pritje', value: tasks.filter(t => t.status === TaskStatus.TODO).length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const chartData = [
    { name: 'Hën', kryer: 4, plan: 6 },
    { name: 'Mar', kryer: 7, plan: 5 },
    { name: 'Mër', kryer: 5, plan: 8 },
    { name: 'Enj', kryer: 9, plan: 7 },
    { name: 'Pre', kryer: 12, plan: 10 },
    { name: 'Sht', kryer: 8, plan: 6 },
    { name: 'Die', kryer: 3, plan: 4 },
  ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 text-indigo-600 mb-1">
             <Activity size={16} />
             <span className="text-xs font-black uppercase tracking-[0.2em]">Qendra e Komandës</span>
           </div>
          <h1 className="text-5xl font-black text-slate-900 leading-tight tracking-tight">
            Mirësevini, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{user?.displayName?.split(' ')[0] || 'Mik'}</span>
          </h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">Sot po shohim një rritje prej 12% në produktivitetin e ekipit.</p>
        </div>
        <div className="flex items-center gap-3">
             <div className="px-5 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-bold text-slate-700">Sistemi: Optimale</span>
             </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", stat.bg)}>
              <stat.icon className={stat.color} size={28} />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{stat.label}</p>
            <p className="text-4xl font-black text-slate-900 mt-1">{stat.value}</p>
            <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none transform group-hover:scale-150 transition-transform">
                <stat.icon size={120} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm"
          >
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">Trendi i Performancës</h3>
                   <p className="text-slate-400 text-sm">Analiza javore e detyrave të përfunduara.</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                       <span className="text-xs font-bold text-slate-500">Të Kryera</span>
                   </div>
                   <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                       <span className="text-xs font-bold text-slate-500">Të Planifikuara</span>
                   </div>
                </div>
             </div>
             
             <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorKryer" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} 
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                        itemStyle={{ fontWeight: 700, fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="kryer" 
                        stroke="#2563eb" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorKryer)" 
                        animationDuration={2000}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="plan" 
                        stroke="#e2e8f0" 
                        strokeWidth={2} 
                        strokeDasharray="5 5" 
                        fill="transparent" 
                      />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[300px]"
            >
                <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6 bg-white/20 w-fit py-1 px-4 rounded-full backdrop-blur-md">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Vision Strategjik</span>
                </div>
                <div className="text-xl font-bold leading-relaxed mb-8 italic">
                    {loadingAI ? (
                        <div className="flex gap-2">
                            <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                    ) : (
                    <ReactMarkdown>{aiAdvice || 'Po mbledh informacione për të dhënë këshillën më të mirë...'}</ReactMarkdown>
                    )}
                </div>
                </div>
                <button 
                    onClick={getAIAdvice}
                    className="w-full bg-white text-indigo-700 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-lg mt-auto relative z-10"
                >
                    Analizë e Re <ArrowRight size={18} />
                </button>
                <div className="absolute top-[-30%] right-[-20%] w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl"></div>
            </motion.div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between">
                <div>
                   <div className="flex items-center gap-2 mb-6 bg-white/10 w-fit py-1 px-4 rounded-full">
                        <Zap size={16} className="text-amber-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Nisje e Shpejtë</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Veprime të Mencura</h3>
                    <p className="text-slate-400 text-sm mb-8">AI sugjeron këto veprime bazuar në prioritetet e javës.</p>
                </div>
                <div className="space-y-3">
                    <button className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-between group">
                        <span className="text-sm font-bold">Rishiko detyrat High-Priority</span>
                        <ArrowRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                    <button 
                        onClick={() => {/* This will be handled by context or tab change */}}
                        className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-between group"
                    >
                        <span className="text-sm font-bold">Gjenero Raportin e Performancës</span>
                        <ArrowRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                    <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'marketing' }))}
                        className="w-full text-left p-4 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl hover:bg-indigo-500/30 transition-all flex items-center justify-between group shadow-lg"
                    >
                        <div className="flex items-center gap-3">
                            <ImageIcon size={18} className="text-indigo-300" />
                            <span className="text-sm font-bold">Gjenero Imazh Marketingu</span>
                        </div>
                        <Sparkles size={16} className="text-amber-400 group-hover:scale-125 transition-transform" />
                    </button>
                </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
             <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center justify-between">
                    Aktiviteti i Fundit
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-tighter">Live</span>
                </h3>
                <div className="space-y-6">
                    {tasks.slice(0, 4).map((task, i) => (
                        <div key={task.id} className="relative pl-6 border-l-2 border-slate-100 pb-2 last:pb-0">
                            <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-tight">{formatDate(task.createdAt?.toDate())}</p>
                            <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{task.title}</h4>
                            <p className="text-[10px] text-slate-500 font-medium">Nga: {task.assigneeName}</p>
                        </div>
                    ))}
                    {tasks.length === 0 && <p className="text-sm text-slate-400 italic">Asnjë aktivitet akoma.</p>}
                </div>
             </div>

             <div className="bg-[#1e293b] text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-2 mb-8 bg-white/10 w-fit py-1 px-4 rounded-full">
                    <Target size={16} className="text-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-50">Qëllimet në Fokus</span>
                </div>
                <div className="space-y-10 relative z-10">
                    {goals.slice(0, 3).map(goal => (
                        <div key={goal.id} className="group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="max-w-[70%]">
                                    <h4 className="font-black text-lg group-hover:text-blue-400 transition-colors">{goal.title}</h4>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                                        {goal.period === '1m' ? 'Strategjia 1 Mujore' : goal.period === '6m' ? 'Plani 6 Mujor' : 'Vizioni vjeçar'}
                                    </p>
                                </div>
                                <div className="p-2 bg-white/5 rounded-xl border border-white/10 text-blue-400">
                                    <TrendingUp size={16} />
                                </div>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-3">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: goal.status === 'completed' ? '100%' : '45%' }}
                                    className={cn(
                                        "h-full rounded-full",
                                        goal.status === 'completed' ? "bg-emerald-500" : "bg-blue-500"
                                    )}
                                />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase">
                                <span>Progresi</span>
                                <span className={goal.status === 'completed' ? "text-emerald-400" : "text-blue-400"}>
                                    {goal.status === 'completed' ? '100%' : '45%'}
                                </span>
                            </div>
                        </div>
                    ))}
                    {goals.length === 0 && <p className="text-slate-500 italic text-sm text-center">Nuk ka qëllime aktive.</p>}
                </div>
                
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 rounded-full blur-[60px]"></div>
                <div className="mt-8 pt-8 border-t border-white/5">
                    <button className="w-full flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors group">
                        Shiko Roadnap-in e Plotë
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
}


