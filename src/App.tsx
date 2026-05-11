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
  orderBy
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
  AlertCircle
} from 'lucide-react';
import { AppUser, Task, Goal, ChatMessage } from './types';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import Dashboard from './components/Dashboard';
import TasksBoard from './components/TasksBoard';
import GoalsManager from './components/GoalsManager';
import AIAssistant from './components/AIAssistant';
import Performance from './components/Performance';
import TeamChat from './components/TeamChat';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        console.log("Auth state changed:", u?.email);
        setUser(u);
        if (u) {
          const userDocRef = doc(db, 'users', u.uid);
          let userDoc;
          
          try {
            userDoc = await getDoc(userDocRef);
          } catch (e: any) {
            console.error("Error fetching user doc:", e);
            // If it's a permission error, maybe the doc doesn't exist yet and we can try to create it
            // but usually getDoc on non-existent doc doesn't fail permissions if allowed.
            throw e;
          }
          
          if (userDoc.exists()) {
            const data = userDoc.data() as AppUser;
            setAppUser(data);
            // Update last active
            try {
              await setDoc(userDocRef, { lastActive: serverTimestamp() }, { merge: true });
            } catch (e) {
              console.warn("Could not update last active:", e);
            }
          } else {
            console.log("New user detected, creating doc...");
            // First time login - set as member (or admin if email matches admin list)
            const isInitialAdmin = u.email === 'aiagjenti@gmail.com'; 
            const newUser: AppUser = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || 'Përdorues',
              photoURL: u.photoURL || '',
              role: isInitialAdmin ? 'admin' : 'member',
              lastActive: serverTimestamp()
            };
            await setDoc(userDocRef, newUser);
            setAppUser(newUser);
          }
        } else {
          setAppUser(null);
        }
      } catch (err: any) {
        console.error("Auth initialization error:", err);
        let msg = "Ndodhi një gabim gjatë lidhjes me Firebase.";
        if (err.message?.includes("permissions")) {
          msg = "Gabim: Nuk keni leje për të parë këtë informacion. Sigurohuni që emaili juaj është i verifikuar.";
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-red-100">
           <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
           <h2 className="text-2xl font-bold text-slate-900 mb-2">Gabim në Lidhje</h2>
           <p className="text-slate-500 mb-6">{error}</p>
           <button 
             onClick={() => window.location.reload()}
             className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
           >
             Provo përsëri
           </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F0F2F7] flex flex-col items-center justify-center p-4">
        {/* ... login UI ... */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3 overflow-hidden">
             <div className="text-white font-bold text-4xl">AA</div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Agjenti AI Asistent</h1>
          <p className="text-slate-500 mb-8">Platforma juaj inteligjente për menaxhimin e ekipeve dhe strategjisë.</p>
          
          <button 
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Vazhdo me Google
          </button>
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

  const menuItems = [
    { id: 'dashboard', label: 'Paneli kryesor', icon: LayoutDashboard },
    { id: 'tasks', label: 'Detyrat', icon: CheckSquare },
    { id: 'goals', label: 'Qëllimet', icon: Target },
    { id: 'chat', label: 'Biseda në ekip', icon: MessageCircle },
    { id: 'performance', label: 'Performanca', icon: TrendingUp },
    { id: 'ai', label: 'Asistenti AI', icon: Sparkles },
  ];

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
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <span className="text-white font-bold text-xl">AA</span>
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-xl text-slate-800 truncate">Agjenti AI</span>
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
                  <item.icon size={20} className={cn(activeTab === item.id ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                  {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-200">
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
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-8 h-full"
          >
            {activeTab === 'dashboard' && <Dashboard user={appUser!} />}
            {activeTab === 'tasks' && <TasksBoard user={appUser!} />}
            {activeTab === 'goals' && <GoalsManager user={appUser!} />}
            {activeTab === 'chat' && <TeamChat user={appUser!} />}
            {activeTab === 'performance' && <Performance user={appUser!} />}
            {activeTab === 'ai' && <AIAssistant user={appUser!} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

