import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, orderBy, where } from '../lib/firebase';
import { AppUser, Goal, GoalPeriod, GoalStatus, TaskStatus } from '../types';
import { 
  Plus, 
  Target, 
  TrendingUp, 
  Calendar, 
  Flag,
  MoreVertical,
  X,
  Trophy,
  Rocket,
  ShieldCheck,
  Wand2,
  Sparkles,
  Loader2,
  Check
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { askAI } from '../lib/gemini';

interface GoalsManagerProps {
  user: AppUser;
}

interface AIRoadmap {
  goals: { title: string; description: string; period: GoalPeriod }[];
  tasks: { title: string; description: string; priority: 'low' | 'medium' | 'high' }[];
}

export default function GoalsManager({ user }: GoalsManagerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAIPlanning, setIsAIPlanning] = useState(false);
  const [aiVision, setAiVision] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRoadmap, setGeneratedRoadmap] = useState<AIRoadmap | null>(null);
  
  // Form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [period, setPeriod] = useState<GoalPeriod>('1m');

  useEffect(() => {
    if (!user.companyId) return;

    const q = query(
      collection(db, 'goals'), 
      where('companyId', '==', user.companyId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)));
    });
    return () => unsub();
  }, [user.companyId]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role !== 'admin') {
      alert('Vetëm menaxherët mund të vendosin qëllime.');
      return;
    }
    
    await addDoc(collection(db, 'goals'), {
      title,
      description: desc,
      period,
      status: 'active',
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      companyId: user.companyId
    });
    
    setTitle('');
    setDesc('');
    setIsAdding(false);
  };

  const handleGenerateRoadmap = async () => {
    if (!aiVision.trim()) return;
    setIsGenerating(true);
    setGeneratedRoadmap(null);

    const prompt = `Si një menaxher strategjik AI, krijo një plan veprimi për këtë vizion: "${aiVision}". 
    Përgjigju VETËM me një objekt JSON që ka këtë strukturë:
    {
      "goals": [
        {"title": "string", "description": "string", "period": "1m" | "6m" | "12m"}
      ],
      "tasks": [
        {"title": "string", "description": "string", "priority": "low" | "medium" | "high"}
      ]
    }
    Krijo saktësisht 3 qëllime (një për çdo periudhë) dhe 5 detyra operacionale fillestare. Përdor gjuhën shqipe.`;

    try {
      const res = await askAI(prompt, "Je një ekspert i planifikimit strategjik.");
      const jsonStr = res?.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(jsonStr || '{}') as AIRoadmap;
      setGeneratedRoadmap(data);
    } catch (error) {
      console.error("AI Error:", error);
      alert("Ndodhi një gabim gjatë gjenerimit. Provoni përsëri.");
    } finally {
      setIsGenerating(false);
    }
  };

  const applyRoadmap = async () => {
    if (!generatedRoadmap) return;
    
    try {
      for (const g of generatedRoadmap.goals) {
        await addDoc(collection(db, 'goals'), {
          ...g,
          status: 'active',
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          companyId: user.companyId
        });
      }

      for (const t of generatedRoadmap.tasks) {
        await addDoc(collection(db, 'tasks'), {
          ...t,
          status: TaskStatus.TODO,
          assigneeId: user.uid,
          reporterId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          companyId: user.companyId
        });
      }

      setIsAIPlanning(false);
      setGeneratedRoadmap(null);
      setAiVision('');
    } catch (e) {
      console.error(e);
    }
  };

  const toggleStatus = async (goal: Goal) => {
    const nextStatus: GoalStatus = goal.status === 'active' ? 'completed' : 'active';
    await updateDoc(doc(db, 'goals', goal.id), { status: nextStatus });
  };

  const deleteGoal = async (id: string) => {
    if (confirm('A jeni të sigurt?')) {
      await deleteDoc(doc(db, 'goals', id));
    }
  };

  const periods: Record<GoalPeriod, { label: string, icon: any, color: string }> = {
    '1m': { label: 'Strategjia 1 Mujore', icon: Rocket, color: 'text-blue-600' },
    '6m': { label: 'Plani 6 Mujor', icon: TrendingUp, color: 'text-purple-600' },
    '12m': { label: 'Vizioni 1 Vjeçar', icon: Trophy, color: 'text-amber-600' }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Qëllimet Strategjike</h1>
          <p className="text-slate-500">Vendosni rrugëtimin e kompanisë suaj.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAIPlanning(true)}
            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
          >
            <Wand2 size={18} className="text-blue-400" />
            AI Projektuesi
          </button>
          {user.role === 'admin' && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg"
            >
              <Plus size={18} />
              Vendos Qëllim
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(Object.keys(periods) as GoalPeriod[]).map(p => (
          <div key={p} className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className={cn("p-2 rounded-xl bg-white shadow-sm", periods[p].color)}>
                 {(() => { const Icon = periods[p].icon; return <Icon size={20} />; })()}
               </div>
               <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{periods[p].label}</h3>
            </div>
            
            <AnimatePresence>
              {goals.filter(g => g.period === p).map((goal, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={goal.id}
                  className={cn(
                    "p-6 rounded-3xl border transition-all duration-300 relative group overflow-hidden",
                    goal.status === 'completed' ? "bg-emerald-50 border-emerald-100 opacity-75" : "bg-white border-slate-100 shadow-sm hover:shadow-md"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                       <Flag size={16} />
                    </div>
                    {user.role === 'admin' && (
                      <button 
                         onClick={() => deleteGoal(goal.id)}
                         className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                         <X size={16} />
                      </button>
                    )}
                  </div>
                  
                  <h4 className={cn("text-lg font-bold mb-2", goal.status === 'completed' ? "text-emerald-900 line-through" : "text-slate-900")}>
                    {goal.title}
                  </h4>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6">
                    {goal.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        <Calendar size={12} />
                        {formatDate(goal.createdAt?.toDate())}
                    </div>
                    <button 
                        onClick={() => toggleStatus(goal)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-tight uppercase transition-all",
                            goal.status === 'completed' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-600 hover:text-white"
                        )}
                    >
                        {goal.status === 'completed' ? (
                            <>
                                <ShieldCheck size={12} />
                                I Arritur
                            </>
                        ) : 'Marko si i kryer'}
                    </button>
                  </div>
                  {goal.status === 'completed' && <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {goals.filter(g => g.period === p).length === 0 && (
                <div className="p-8 border-2 border-dashed border-slate-100 rounded-[2rem] text-center text-slate-300 italic text-sm">
                    Nuk ka qëllime për këtë periudhë.
                </div>
            )}
          </div>
        ))}
      </div>

      {/* Goal Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-slate-900">Vendos Qëllim Strategjik</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Titulli i Qëllimit</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Psh. Rritja e shitjeve me 20%..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">Periudha Kohore</label>
                    <select 
                        required
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as GoalPeriod)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    >
                        <option value="1m">Strategjia 1 Mujore</option>
                        <option value="6m">Plani 6 Mujor</option>
                        <option value="12m">Vizioni 1 Vjeçar</option>
                    </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Përshkrimi / Detajet</label>
                  <textarea 
                    rows={3}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Shpjegoni se si do të arrihet ky qëllim..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Anulo
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700"
                  >
                    Ruaj Qëllimin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Roadmapper Modal */}
      <AnimatePresence>
        {isAIPlanning && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100"
            >
                <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                            <Sparkles className="text-blue-400" />
                            AI Projektuesi
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">Shndërroni vizionin tuaj në një plan konkret veprimi.</p>
                    </div>
                    <button onClick={() => setIsAIPlanning(false)} className="p-2 hover:bg-white/10 rounded-full relative z-10">
                        <X size={20} />
                    </button>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                </div>

                <div className="p-8 space-y-6">
                    {!generatedRoadmap ? (
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Çfarë dëshironi të arrini?</label>
                            <textarea 
                                autoFocus
                                value={aiVision}
                                onChange={(e) => setAiVision(e.target.value)}
                                placeholder="Psh: Dua të dixhitalizoj biznesin tim dhe të filloj të shes online..."
                                rows={4}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-lg"
                            />
                            <button 
                                onClick={handleGenerateRoadmap}
                                disabled={isGenerating || !aiVision.trim()}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Duke hartuar strategjinë...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={20} />
                                        Gjenero Roadmap
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="max-h-[400px] overflow-y-auto space-y-6 pr-2">
                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Qëllimet e Sugjeruara</h4>
                                    <div className="space-y-3">
                                        {generatedRoadmap.goals.map((g, i) => (
                                            <div key={i} className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">{g.period}</span>
                                                    <h5 className="font-bold text-indigo-900">{g.title}</h5>
                                                </div>
                                                <p className="text-xs text-indigo-700/70">{g.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detyrat Operacionale</h4>
                                    <div className="space-y-2">
                                        {generatedRoadmap.tasks.map((t, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    t.priority === 'high' ? "bg-red-500" : t.priority === 'medium' ? "bg-amber-500" : "bg-blue-500"
                                                )}></div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{t.title}</p>
                                                    <p className="text-[10px] text-slate-400">{t.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-slate-100">
                                <button 
                                    onClick={() => setGeneratedRoadmap(null)}
                                    className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    Rishkruaj vizionin
                                </button>
                                <button 
                                    onClick={applyRoadmap}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 flex items-center justify-center gap-2 transition-all"
                                >
                                    <Check size={20} />
                                    Zbato Planin
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

