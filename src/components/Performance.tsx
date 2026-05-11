import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, getDocs, where } from '../lib/firebase';
import { AppUser, Task, PerformanceAnalysis } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  User, 
  Target, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Download,
  Brain,
  Search,
  Users,
  Sparkles
} from 'lucide-react';
import { askAI } from '../lib/gemini';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';

interface PerformanceProps {
  user: AppUser;
}

export default function Performance({ user }: PerformanceProps) {
  const [team, setTeam] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const getUsers = async () => {
      const uSnap = await getDocs(collection(db, 'users'));
      setTeam(uSnap.docs.map(d => d.data() as AppUser));
    };
    getUsers();
  }, []);

  const fetchUserData = async (u: AppUser) => {
    setIsAnalyzing(true);
    setAnalysis('');
    const q = query(collection(db, 'tasks'), where('assigneeId', '==', u.uid));
    const snap = await getDocs(q);
    const userTasks = snap.docs.map(d => d.data() as Task);
    setTasks(userTasks);

    // AI Analysis
    const total = userTasks.length;
    const done = userTasks.filter(t => t.status === 'done').length;
    const todo = userTasks.filter(t => t.status === 'todo').length;
    
    const context = `Punëtori: ${u.displayName}. Detyra totale: ${total}. Të kryera: ${done}. Në pritje: ${todo}. Lista e detyrave: ${userTasks.map(t => t.title).join(', ')}.`;
    const prompt = `Duke u bazuar në këto të dhëna, bëj një analizë të shkurtër të performancës në gjuhën shqipe. Vlerëso produktivitetin me një notë 1 deri 10 dhe jep 3 këshilla për përmirësim.`;
    
    const res = await askAI(prompt, "Je një ekspert i resurseve humane dhe menaxhimit të performancës.");
    setAnalysis(res || '');
    setIsAnalyzing(false);
  };

  const selectUser = (u: AppUser) => {
    setSelectedUser(u);
    fetchUserData(u);
  };

  const downloadReport = () => {
      if (!selectedUser || !analysis) return;
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text(`Raporti i Performancës - ${selectedUser.displayName}`, 20, 20);
      doc.setFontSize(12);
      doc.text(`Data: ${new Date().toLocaleDateString('sq-AL')}`, 20, 30);
      doc.text('----------------------------------------------------', 20, 35);
      
      const splitText = doc.splitTextToSize(analysis, 170);
      doc.text(splitText, 20, 45);
      
      doc.save(`Raport_${selectedUser.displayName.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-8">
      {/* Team List Sidebar */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Users size={20} className="text-blue-600" />
                Ekipi
            </h3>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{team.length} ANËTARË</span>
          </div>
          
          <div className="relative mb-4">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input type="text" placeholder="Kërko..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {team.map(u => (
              <button 
                key={u.uid}
                onClick={() => selectUser(u)}
                className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left",
                    selectedUser?.uid === u.uid ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-50 text-slate-600"
                )}
              >
                <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-10 h-10 rounded-full bg-slate-100" />
                <div className="overflow-hidden">
                    <p className="text-xs font-bold truncate">{u.displayName}</p>
                    <p className={cn("text-[10px] font-medium opacity-70", selectedUser?.uid === u.uid ? "text-white" : "text-slate-400")}>
                        {u.role === 'admin' ? 'Menaxher' : 'Anëtar'}
                    </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
            <div className="flex items-center gap-3 mb-4">
                <Brain className="text-blue-400" size={24} />
                <h4 className="font-bold">Analiza me AI</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
                Zgjidhni një anëtar të ekipit për të gjeneruar një raport të detajuar të performancës me anë të inteligjencës artificiale.
            </p>
        </div>
      </div>

      {/* Analysis Content */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {selectedUser ? (
            <motion.div 
              key={selectedUser.uid}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <img src={selectedUser.photoURL || `https://ui-avatars.com/api/?name=${selectedUser.displayName}`} className="w-20 h-20 rounded-[2rem] shadow-xl" />
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">{selectedUser.displayName}</h2>
                        <p className="text-slate-500 font-medium">{selectedUser.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                             <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">Aktiv</span>
                        </div>
                    </div>
                </div>
                <button 
                    disabled={!analysis}
                    onClick={downloadReport}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-30 self-start md:self-center"
                >
                    <Download size={18} /> Shkarko Raportin
                </button>
              </div>

              {/* Mini Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Detyra të kryera</p>
                    <p className="text-3xl font-bold text-emerald-600">{tasks.filter(t => t.status === 'done').length}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Detyra totale</p>
                    <p className="text-3xl font-bold text-blue-600">{tasks.length}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Efikasiteti</p>
                    <p className="text-3xl font-bold text-indigo-600">
                        {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0}%
                    </p>
                </div>
              </div>

              {/* AI Report */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 mb-8 bg-indigo-50 w-fit py-1.5 px-4 rounded-full">
                    <Sparkles size={16} className="text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Raporti i Rendimentit</span>
                </div>
                
                {isAnalyzing ? (
                   <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                            <Brain size={48} className="text-indigo-200" />
                        </motion.div>
                        <p className="text-sm font-medium animate-pulse">Agjenti AI po analizon të dhënat...</p>
                   </div>
                ) : (
                  <div className="prose prose-slate max-w-none">
                     <ReactMarkdown>{analysis || "Zgjidhni një përdorues për të filluar analizën."}</ReactMarkdown>
                  </div>
                )}
                
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full translate-x-1/2 -translate-y-1/2 -z-10 blur-3xl opacity-50"></div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 p-20 text-center border-4 border-dashed border-slate-50 rounded-[3rem]">
                <BarChart3 size={80} strokeWidth={1} className="mb-6 opacity-40" />
                <h3 className="text-2xl font-bold text-slate-400">Zgjidhni një anëtar të ekipit</h3>
                <p className="max-w-xs mt-2 text-sm">Zgjidhni dikë nga lista në të majtë për të parë raportin e tyre të performancës.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

