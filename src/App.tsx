/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  signInWithGoogle, 
  signOut, 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  onSnapshot,
  collection,
  query,
  orderBy,
  where
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Target, 
  MessageCircle, 
  TrendingUp, 
  Sparkles, 
  LogOut, 
  Users,
  Menu,
  X,
  FileText,
  AlertCircle,
  Building2,
  Copy,
  Check,
  Bell,
  CheckCircle,
  Clock,
  CreditCard,
  Layout,
  Loader2
} from 'lucide-react';
import { AppUser, Task, Goal, ChatMessage, Company, Notification as AppNotification } from './types';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import CompanyOnboarding from './components/CompanyOnboarding';
import Dashboard from './components/Dashboard';
import TasksBoard from './components/TasksBoard';
import GoalsManager from './components/GoalsManager';
import AIAssistant from './components/AIAssistant';
import Performance from './components/Performance';
import TeamChat from './components/TeamChat';
import TeamManagement from './components/TeamManagement';
import MarketingCenter from './components/MarketingCenter';
import Pricing from './components/Pricing';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [profileTimeout, setProfileTimeout] = useState(false);

  useEffect(() => {
    const handleTabChange = (e: any) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('changeTab', handleTabChange);
    return () => window.removeEventListener('changeTab', handleTabChange);
  }, []);

  useEffect(() => {
    if (appUser?.uid && appUser?.companyId) {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', appUser.uid),
        where('companyId', '==', appUser.companyId),
        orderBy('createdAt', 'desc')
      );
      const unsub = onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
      }, (err) => {
        console.warn("Notifications snapshot error:", err);
      });
      return () => unsub();
    }
  }, [appUser?.uid, appUser?.companyId]);

  const markAsRead = async (id: string) => {
    await setDoc(doc(db, 'notifications', id), { read: true }, { merge: true });
  };

  useEffect(() => {
    if (appUser?.companyId) {
      const unsub = onSnapshot(doc(db, 'companies', appUser.companyId), (docSnap) => {
        if (docSnap.exists()) {
          const companyData = { id: docSnap.id, ...docSnap.data() } as Company;
          setCompany(companyData);
        }
      }, (err) => {
        console.warn("Company snapshot error:", err);
      });
      return () => unsub();
    }
  }, [appUser?.companyId]);

  const copyJoinCode = () => {
    if (company?.joinCode) {
      navigator.clipboard.writeText(company.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      console.log("Auth state changed:", u?.uid);
      setUser(u);
      setError(null);
      
      if (unsubUser) { unsubUser(); unsubUser = null; }

      if (u) {
        const userDocRef = doc(db, 'users', u.uid);
        
        // Use onSnapshot for everything. It handles initial fetch + updates.
        unsubUser = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setAppUser(docSnap.data() as AppUser);
            setLoading(false);
          } else {
            // Profile doesn't exist, let's try to create it
            console.log("Profile not found, creating one...");
            const isInitialAdmin = u.email === 'aiagjenti@gmail.com'; 
            const newUser: AppUser = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || 'Përdorues',
              photoURL: u.photoURL || '',
              role: isInitialAdmin ? 'admin' : 'member',
              lastActive: serverTimestamp(),
              joinedAt: serverTimestamp()
            };
            
            try {
              await setDoc(userDocRef, newUser);
              // The next snapshot trigger will setAppUser and setLoading(false)
            } catch (err: any) {
              console.error("Error creating profile:", err);
              setError("Nuk keni leje për të krijuar profilin tuaj. Kontaktoni mbështetjen teknike.");
              setLoading(false);
            }
          }
        }, (err) => {
           console.error("User snapshot error:", err);
           // If we ALREADY have data, don't show a full-screen error, just log it
           if (!appUser) {
             setError(`Gabim në lidhje me profilin: ${err.message}`);
             setLoading(false);
           }
        });
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
    };
  }, []);

  if (error) {
    const isQuotaError = error.includes('Quota exceeded');
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 text-center font-sans">
        <div className="bg-white p-12 rounded-[50px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] max-w-md w-full border border-slate-100">
           <div className="w-24 h-24 bg-slate-900 rounded-[30px] flex items-center justify-center mx-auto mb-10 shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20"></div>
             <AlertCircle className="w-12 h-12 text-white relative z-10" />
           </div>
           
           <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Qasja u kufizua përkohësisht</h2>
           <p className="text-slate-500 mb-12 leading-relaxed text-lg">
             {isQuotaError 
               ? "Sistemi ka arritur kapacitetin maksimal të përpunimit për sot. Qasja e plotë do të rikthehet automatikisht në orët në vijim." 
               : "Ndodhi një problem në lidhje me serverin. Ju lutem provoni të rifreskoni faqen pas pak."}
           </p>

           <div className="space-y-4">
             <button 
               onClick={() => window.location.reload()}
               className="w-full bg-slate-900 text-white font-black py-5 rounded-[22px] hover:bg-black transition-all shadow-xl active:scale-95 text-lg"
             >
               Rifresko Faqen
             </button>
             
             <button 
               onClick={() => signOut()}
               className="w-full bg-slate-50 text-slate-500 font-bold py-4 rounded-[18px] hover:bg-slate-100 transition-all text-sm"
             >
               Dilni nga llogaria
             </button>
           </div>
           
           <div className="mt-12 flex items-center justify-center gap-2">
             <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse"></div>
             <p className="text-[10px] text-slate-300 uppercase tracking-[0.3em] font-black">AI AGJENTI PREMIUM</p>
           </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full mb-6"
        />
        <p className="text-slate-500 font-medium">Duke u lidhur...</p>
      </div>
    );
  }

  const handleLogin = async () => {
    setAuthLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("Dritarja e kyçjes u bllokua. Ju lutem lejoni 'Pop-ups' në browserin tuaj.");
      } else {
        setError("Ndodhi një gabim gjatë kyçjes. Provo përsëri.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F0F2F7] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-slate-100"
        >
          <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3 overflow-hidden border-4 border-white">
             <img src="https://i.ibb.co/PZHvQNzh/634350365-1974948583450669-5304249738558335774-n.jpg" alt="Asistenti AI" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Asistenti AI</h1>
          <p className="text-slate-500 mb-10 font-medium leading-relaxed">
            Platforma juaj inteligjente për menaxhimin e ekipeve dhe rritjen e biznesit.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleLogin}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white font-black py-4 px-6 rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5 brightness-200" alt="Google" />
                  Vazhdo me Google
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-left">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-red-600 font-bold leading-tight">{error}</p>
              </div>
            )}
            
            <div className="pt-6 border-t border-slate-100 italic">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Siguri e lartë e garantuar nga Google
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4"
        />
        <p className="text-slate-500 font-medium">Duke ngarkuar profilin tuaj...</p>
      </div>
    );
  }

  // Handle Onboarding if no companyId
  if (!appUser.companyId) {
    return (
      <CompanyOnboarding 
        user={appUser} 
        onComplete={(companyId) => {
          setAppUser(prev => prev ? { ...prev, companyId } : null);
        }} 
      />
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Paneli kryesor', icon: LayoutDashboard },
    { id: 'tasks', label: 'Detyrat', icon: CheckSquare },
    { id: 'goals', label: 'Qëllimet', icon: Target },
    { id: 'chat', label: 'Biseda në ekip', icon: MessageCircle },
    { id: 'performance', label: 'Performanca', icon: TrendingUp },
    { id: 'marketing', label: 'Marketing AI', icon: Layout },
    { id: 'team', label: 'Ekipi', icon: Users, adminOnly: true },
    { id: 'ai', label: 'Asistenti AI', icon: Sparkles },
    { id: 'billing', label: 'Llogaria', icon: CreditCard, adminOnly: true },
  ].filter(item => !item.adminOnly || appUser?.role === 'admin');

  const isTrialExpired = () => {
    if (!company || company.subscriptionStatus === 'active') return false;
    if (!company.trialStartedAt) return false;
    const start = company.trialStartedAt.toDate();
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return diff > 7 * 24 * 60 * 60 * 1000;
  };

  const isPaid = company?.subscriptionStatus === 'active';

  return (
    <div className="flex h-screen bg-[#F5F6F8] font-sans overflow-hidden">
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-[#F5F6F8] border-r border-slate-200 w-72 flex flex-col transition-all duration-300 fixed lg:static inset-y-0 left-0 z-40",
          !isSidebarOpen && "-translate-x-full lg:translate-x-0 lg:w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3">
          {company?.logo ? (
            <img src="https://i.ibb.co/PZHvQNzh/634350365-1974948583450669-5304249738558335774-n.jpg" alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white shrink-0 shadow-sm border border-slate-100" />
          ) : (
            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
               <img src="https://i.ibb.co/PZHvQNzh/634350365-1974948583450669-5304249738558335774-n.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
          )}
          {isSidebarOpen && (
            <span className="font-bold text-xl text-slate-800 truncate">
              {company?.name || "Asistenti AI"}
            </span>
          )}
        </div>

        <nav className="flex-1 px-4 mt-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group text-slate-600",
                    activeTab === item.id ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "hover:bg-slate-100"
                  )}
                >
                  <div className="relative">
                    <item.icon size={20} className={cn(activeTab === item.id ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                    {item.id === 'ai' && (
                       <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-4 py-2">
           <button 
             onClick={() => setShowNotifications(!showNotifications)}
             className={cn(
               "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group relative",
               showNotifications ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-100"
             )}
           >
             <div className="relative">
                <Bell size={20} className={showNotifications ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"} />
                {notifications.filter(n => !n.read).length > 0 && (
                   <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                      {notifications.filter(n => !n.read).length}
                   </span>
                )}
             </div>
             {isSidebarOpen && <span className="font-medium text-sm">Njoftimet</span>}
           </button>
        </div>

        <div className="p-4 border-t border-slate-200">
          {company && isSidebarOpen && (
              <div className="mb-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                       <Building2 size={14} className="text-blue-600" />
                       <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest truncate">{company.name}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-blue-100">
                      <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Kodi i Ftesës</p>
                          <p className="text-xs font-black text-slate-800 font-mono">{company.joinCode}</p>
                      </div>
                      <button 
                        onClick={copyJoinCode}
                        className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-blue-600"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                  </div>
              </div>
          )}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm mb-4 overflow-hidden">
            <img 
              src={appUser?.photoURL || "https://ui-avatars.com/api/?name=User"} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full bg-slate-100 shrink-0"
            />
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{appUser?.displayName}</p>
                <p className="text-xs text-slate-500 capitalize">{appUser?.role === 'admin' ? 'Menaxher' : 'Anëtar'}</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => signOut()}
            className={cn(
              "flex items-center gap-3 w-full p-3 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-red-600 transition-colors",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium text-sm">Dilni</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-white lg:rounded-tl-[3rem] shadow-2xl relative transition-all duration-300">
        <AnimatePresence>
          {showNotifications && (
            <motion.div 
               initial={{ opacity: 0, x: 50 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 50 }}
               className="absolute top-8 right-8 w-80 max-h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 z-[100] flex flex-col overflow-hidden"
            >
               <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Njoftime</h4>
                  <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-slate-200 rounded-lg">
                    <X size={16} />
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs italic">Nuk keni njoftime.</div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => markAsRead(n.id)}
                        className={cn(
                          "p-3 rounded-2xl cursor-pointer transition-all border border-transparent",
                          n.read ? "opacity-60 bg-white" : "bg-blue-50/50 border-blue-50 shadow-sm"
                        )}
                      >
                         <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                              n.type === 'task' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                            )}>
                               {n.type === 'task' ? <CheckCircle size={14} /> : <MessageCircle size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-xs font-black text-slate-900">{n.title}</p>
                               <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{n.message}</p>
                               <div className="flex items-center gap-1 mt-2 text-[9px] text-slate-400 font-bold">
                                  <Clock size={10} />
                                  {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString() : 'Tani'}
                               </div>
                            </div>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-8 h-full"
          >
            {(isTrialExpired() && activeTab !== 'billing') ? (
              <Pricing company={company!} />
            ) : (
              <>
                {activeTab === 'dashboard' && <Dashboard user={appUser!} />}
                {activeTab === 'tasks' && <TasksBoard user={appUser!} />}
                {activeTab === 'goals' && <GoalsManager user={appUser!} />}
                {activeTab === 'chat' && <TeamChat user={appUser!} />}
                {activeTab === 'performance' && <Performance user={appUser!} />}
                {activeTab === 'marketing' && (
                  !isPaid ? <Pricing company={company!} /> : <MarketingCenter user={appUser!} />
                )}
                {activeTab === 'team' && <TeamManagement user={appUser!} />}
                {activeTab === 'ai' && <AIAssistant user={appUser!} />}
                {activeTab === 'billing' && <Pricing company={company!} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

