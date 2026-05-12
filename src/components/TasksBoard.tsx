import { useState, useEffect, useMemo } from 'react';
import { db, collection, onSnapshot, query, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, orderBy, getDocs, where } from '../lib/firebase';
import { AppUser, Task, TaskStatus, TaskPriority, TaskDeliverable } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar as CalendarIcon,
  User as UserIcon,
  ChevronDown,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  Upload,
  Link,
  Type,
  ExternalLink,
  Clock,
  Sparkles,
  Timer
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { sendNotification } from '../lib/NotificationService';
import { askAI } from '../lib/gemini';

interface TasksBoardProps {
  user: AppUser;
}

export default function TasksBoard({ user }: TasksBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Deliverable Modal State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deliverableType, setDeliverableType] = useState<'text' | 'link' | 'file'>('text');
  const [deliverableContent, setDeliverableContent] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  
  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    if (!user.companyId) return;

    const q = query(
      collection(db, 'tasks'), 
      where('companyId', '==', user.companyId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    const getUsers = async () => {
        const uQuery = query(
          collection(db, 'users'),
          where('companyId', '==', user.companyId)
        );
        const uSnap = await getDocs(uQuery);
        setUsers(uSnap.docs.map(d => d.data() as AppUser));
    };
    getUsers();

    return () => unsub();
  }, [user.companyId]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAssignee) return;

    const assignee = users.find(u => u.uid === newAssignee);

    await addDoc(collection(db, 'tasks'), {
      title: newTitle,
      description: '',
      assigneeId: newAssignee,
      assigneeName: assignee?.displayName || 'Pa emër',
      dueDate: newDueDate || new Date().toISOString(),
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      companyId: user.companyId,
      deliverables: []
    });

    // Send notification
    if (newAssignee !== user.uid) {
      await sendNotification(
        newAssignee,
        user.companyId,
        'Detyrë e Re',
        `${user.displayName} ju ka caktuar një detyrë të re: ${newTitle}`,
        'task'
      );
    }

    setNewTitle('');
    setNewAssignee('');
    setNewDueDate('');
    setIsAdding(false);
  };

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    await updateDoc(doc(db, 'tasks', taskId), { status });
  };

  const submitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !deliverableContent) return;
    setIsAiAnalyzing(true);

    try {
      const newDeliverable: TaskDeliverable = {
        id: Math.random().toString(36).substr(2, 9),
        type: deliverableType,
        content: deliverableContent,
        submittedAt: new Date().toISOString(),
        submittedBy: user.uid
      };

      const updatedDeliverables = [...(selectedTask.deliverables || []), newDeliverable];

      // AI Analysis
      const prompt = `Analizo këtë detyrë dhe dorëzimin e punës. 
      Detyra: "${selectedTask.title}"
      Duke përdorur këtë përshkrim: "${selectedTask.description}"
      Punë e dorëzuar (${deliverableType}): "${deliverableContent}"
      
      A përputhet dorëzimi me kërkesën? Kthe përgjigjen në Shqip si një paragraf i shkurtër profesional. 
      Nëse është shumë larg kërkesës, thuaje me njerëzi.`;

      const analysis = await askAI(prompt, "Ti je një analist i performancës së punës.");
      
      await updateDoc(doc(db, 'tasks', selectedTask.id), {
        deliverables: updatedDeliverables,
        status: TaskStatus.DONE,
        aiAnalysis: analysis,
        isAiValidated: true
      });

      // Notify creator
      if (selectedTask.createdBy !== user.uid) {
        await sendNotification(
          selectedTask.createdBy,
          user.companyId,
          'Detyrë e Kryer',
          `${user.displayName} ka përfunduar detyrën: ${selectedTask.title}`,
          'task',
          selectedTask.id
        );
      }

      setDeliverableContent('');
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const getCountdown = (dueDate: string) => {
    const now = new Date().getTime();
    const deadline = new Date(dueDate).getTime();
    const diff = deadline - now;

    if (diff < 0) return { text: "E tejkaluar", color: "text-red-500" };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return { text: `${days}d ${hours}h mbetur`, color: "text-blue-500" };
    return { text: `${hours}h mbetur`, color: "text-amber-500" };
  };

  const updatePriority = async (taskId: string, priority: TaskPriority) => {
    await updateDoc(doc(db, 'tasks', taskId), { priority });
  };

  const deleteTask = async (taskId: string) => {
    if (confirm('A jeni të sigurt që dëshironi të fshini këtë detyrë?')) {
      await deleteDoc(doc(db, 'tasks', taskId));
    }
  };

  const generatePDF = async () => {
    const element = document.getElementById('tasks-table');
    if (!element) return;
    
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Raporti_Detyrave_${new Date().toLocaleDateString()}.pdf`);
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.assigneeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors: Record<TaskStatus, { bg: string, text: string, label: string }> = {
    [TaskStatus.TODO]: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Për të bërë' },
    [TaskStatus.IN_PROGRESS]: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Në proces' },
    [TaskStatus.DONE]: { bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'E kryer' },
    [TaskStatus.STUCK]: { bg: 'bg-red-100', text: 'text-red-600', label: 'E bllokuar' }
  };

  const priorityColors: Record<TaskPriority, { bg: string, text: string, label: string }> = {
    [TaskPriority.LOW]: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'E ulët' },
    [TaskPriority.MEDIUM]: { bg: 'bg-amber-100', text: 'text-amber-600', label: 'Mesatare' },
    [TaskPriority.HIGH]: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'E lartë' },
    [TaskPriority.CRITICAL]: { bg: 'bg-red-600', text: 'text-white', label: 'Kritike' }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Menaxhimi i Detyrave</h1>
          <p className="text-slate-500">Organizoni dhe monitoroni punën e ekipit tuaj.</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={generatePDF}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors shadow-sm"
            >
                <FileSpreadsheet size={18} />
                PDF
            </button>
            <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg"
            >
                <Plus size={18} />
                Detyrë e Re
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Kërko detyra ose persona..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium text-sm hover:bg-slate-50 shadow-sm">
            <Filter size={16} /> Filter
        </button>
      </div>

      {/* Task Creation Modal */}
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
                <h3 className="text-2xl font-bold text-slate-900">Shto Detyrë të Re</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Emri i Detyrës</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Shkruaj çfarë duhet bërë..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">Personi (I caktuari)</label>
                    <select 
                        required
                        value={newAssignee}
                        onChange={(e) => setNewAssignee(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    >
                        <option value="">Zgjidh personin...</option>
                        {users.map(u => (
                            <option key={u.uid} value={u.uid}>{u.displayName}</option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">Afati (Data & Ora)</label>
                    <input 
                      type="datetime-local" 
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
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
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700"
                  >
                    Ruaj Detyrën
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task Table (Monday.com Style) */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden" id="tasks-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-100">
                <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider pl-8">Detyra</th>
                <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Personi</th>
                <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Statusi</th>
                <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Prioriteti</th>
                <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Data</th>
                <th className="p-5 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-slate-400 italic">
                    Nuk u gjet asnjë detyrë.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={task.id} 
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="p-5 pl-8 font-semibold text-slate-900">{task.title}</td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(task.assigneeName)}&background=random`} 
                          alt="" 
                          className="w-7 h-7 rounded-full shadow-sm"
                        />
                        <span className="text-sm font-medium text-slate-700">{task.assigneeName}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="relative group/select w-fit">
                        <select 
                          value={task.status}
                          onChange={(e) => updateStatus(task.id, e.target.value as TaskStatus)}
                          className={cn(
                            "text-xs font-bold px-3 py-1.5 pr-8 rounded-lg outline-none cursor-pointer appearance-none transition-all",
                            statusColors[task.status].bg,
                            statusColors[task.status].text
                          )}
                        >
                          {Object.entries(statusColors).map(([key, val]) => (
                            <option key={key} value={key} className="bg-white text-slate-900">{val.label}</option>
                          ))}
                        </select>
                        <ChevronDown className={cn("absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50", statusColors[task.status].text)} size={14} />
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="relative group/select w-fit">
                        <select 
                          value={task.priority}
                          onChange={(e) => updatePriority(task.id, e.target.value as TaskPriority)}
                          className={cn(
                            "text-xs font-bold px-3 py-1.5 pr-8 rounded-lg outline-none cursor-pointer appearance-none transition-all",
                            priorityColors[task.priority].bg,
                            priorityColors[task.priority].text
                          )}
                        >
                           {Object.entries(priorityColors).map(([key, val]) => (
                            <option key={key} value={key} className="bg-white text-slate-900">{val.label}</option>
                          ))}
                        </select>
                        <ChevronDown className={cn("absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50", priorityColors[task.priority].text)} size={14} />
                      </div>
                    </td>
                    <td className="p-5 text-sm font-medium">
                      <div className="space-y-1">
                         <div className="flex items-center gap-1.5 text-slate-500">
                           <CalendarIcon size={12} />
                           {formatDate(task.dueDate)}
                         </div>
                         <div className={cn("text-[10px] font-black flex items-center gap-1 uppercase tracking-tight", getCountdown(task.dueDate).color)}>
                           <Timer size={10} />
                           {getCountdown(task.dueDate).text}
                         </div>
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {task.assigneeId === user.uid && task.status !== TaskStatus.DONE && (
                          <button 
                            onClick={() => setSelectedTask(task)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                          >
                             <Upload size={16} /> Dorëzo
                          </button>
                        )}
                        {task.status === TaskStatus.DONE && (
                          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-[10px] font-black uppercase">
                             <CheckCircle2 size={12} /> E Kryer
                          </div>
                        )}
                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Deliverable/Submission Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto"
            >
               <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Dorëzimi i Punës</h3>
                    <p className="text-slate-500 text-sm font-medium mt-1">{selectedTask.title}</p>
                  </div>
                  <button onClick={() => setSelectedTask(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors">
                    <X size={24} />
                  </button>
               </div>

               <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl">
                 {(['text', 'link', 'file'] as const).map(type => (
                   <button
                     key={type}
                     onClick={() => setDeliverableType(type)}
                     className={cn(
                       "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all",
                       deliverableType === type ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                     )}
                   >
                     {type === 'text' && <Type size={14} />}
                     {type === 'link' && <Link size={14} />}
                     {type === 'file' && <Upload size={14} />}
                     {type.toUpperCase()}
                   </button>
                 ))}
               </div>

               <form onSubmit={submitDeliverable} className="space-y-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                     {deliverableType === 'link' ? 'URL e Projektit' : 'Detajet e Punës'}
                   </label>
                   <textarea 
                     required
                     value={deliverableContent}
                     onChange={(e) => setDeliverableContent(e.target.value)}
                     className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-100 transition-all min-h-[150px] font-medium"
                     placeholder={deliverableType === 'link' ? "https://github.com/..." : "Shkruani detajet ose ngarkoni përmbajtjen..."}
                   />
                 </div>

                 <div className="flex gap-4">
                    <button 
                      type="submit"
                      disabled={isAiAnalyzing}
                      className="flex-[2] py-5 bg-blue-600 text-white rounded-3xl font-black shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isAiAnalyzing ? (
                        <>
                          <Sparkles className="animate-pulse" />
                          Duke analizuar me AI...
                        </>
                      ) : (
                        <>Dorëzo Përfundimisht <CheckCircle2 /></>
                      )}
                    </button>
                 </div>
               </form>

               {selectedTask.deliverables && selectedTask.deliverables.length > 0 && (
                 <div className="pt-8 border-t border-slate-100 space-y-4">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest pl-2">Dorëzimet e Mëparshme</h4>
                    <div className="space-y-3">
                       {selectedTask.deliverables.map(d => (
                         <div key={d.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group/d">
                            <div className="flex items-center justify-between mb-2">
                               <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                     {d.type === 'link' ? <Link size={14} /> : <FileSpreadsheet size={14} />}
                                  </div>
                                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-tighter">Përfunduar</span>
                               </div>
                               <span className="text-[10px] font-bold text-slate-400">{new Date(d.submittedAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap">{d.content}</p>
                            {d.type === 'link' && (
                              <a href={d.content} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs font-black text-blue-600 flex items-center gap-1 hover:underline">
                                 Hap Linkun <ExternalLink size={12} />
                              </a>
                            )}
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               {selectedTask.aiAnalysis && (
                  <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <Sparkles size={100} className="text-indigo-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                       <Sparkles size={16} className="text-indigo-600" />
                       <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Analiza AI (VisionSync)</span>
                    </div>
                    <p className="text-sm text-indigo-800 font-medium leading-relaxed italic">
                      "{selectedTask.aiAnalysis}"
                    </p>
                  </div>
               )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


