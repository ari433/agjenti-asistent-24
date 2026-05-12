import { useState } from 'react';
import { db, collection, addDoc, serverTimestamp, setDoc, doc, getDocs, query, where, limit, getDoc } from '../lib/firebase';
import { AppUser, Company } from '../types';
import { motion } from 'framer-motion';
import { Building2, Users, ArrowRight, Loader2, Sparkles, ShieldCheck, Briefcase } from 'lucide-react';
import { cn } from '../lib/utils';

interface CompanyOnboardingProps {
  user: AppUser;
  onComplete: (companyId: string) => void;
}

export default function CompanyOnboarding({ user, onComplete }: CompanyOnboardingProps) {
  const [mode, setMode] = useState<'selection' | 'create' | 'join'>('selection');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Form
  const [companyName, setCompanyName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Join Form
  const [enteredCode, setEnteredCode] = useState('');

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !joinCode) return;
    setLoading(true);
    setError(null);

    try {
      // Create company
      const companyRef = await addDoc(collection(db, 'companies'), {
        name: companyName,
        joinCode: joinCode.trim().toUpperCase(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        trialStartedAt: serverTimestamp(),
        subscriptionPlan: 'free',
        subscriptionStatus: 'trial'
      });

      // Create lookup mapping
      await setDoc(doc(db, 'join_codes', joinCode.trim().toUpperCase()), {
        companyId: companyRef.id
      });

      // Update user with companyId and ensure they exist in DB
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        companyId: companyRef.id,
        role: 'admin',
        joinedAt: serverTimestamp(),
        lastActive: serverTimestamp()
      }, { merge: true });

      onComplete(companyRef.id);
    } catch (err: any) {
      console.error("Company Creation Error Details:", err);
      if (err.message?.includes('permission-denied') || err.code === 'permission-denied') {
        setError("Nuk keni leje për të krijuar kompaninë. Sigurohuni që jeni të kyçur saktë.");
      } else {
        setError("Dështoi krijimi i kompanisë. Mund të ketë një gabim teknik, provoni përsëri.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredCode) return;
    setLoading(true);
    setError(null);

    const normalizedCode = enteredCode.trim().toUpperCase();

    try {
      console.log("Attempting join with code:", normalizedCode);
      const codeSnap = await getDoc(doc(db, 'join_codes', normalizedCode));
 
      if (!codeSnap.exists()) {
        console.warn("No company found for code:", normalizedCode);
        setError(`Kodi "${normalizedCode}" nuk u gjet. Provoni përsëri.`);
        setLoading(false);
        return;
      }
 
      const companyId = codeSnap.data().companyId;
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        companyId: companyId,
        role: 'member',
        lastActive: serverTimestamp(),
        joinedAt: serverTimestamp()
      }, { merge: true });
 
      console.log("Join successful");
      onComplete(companyId);
    } catch (err: any) {
      console.error("Join Company Error Detailed:", err);
      let errorMsg = "Ndodhi një gabim gjatë lidhjes. Sigurohuni që keni internet.";
      if (err.message?.includes('permission-denied') || err.code === 'permission-denied') {
        errorMsg = "Gabim qasjeje: Nuk keni leje për t'u bashkuar. Provo të hysh prapë në llogari.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="bg-slate-900 p-10 text-white relative">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-1 mb-4 shadow-lg overflow-hidden border border-slate-700">
             <img src="https://i.ibb.co/PZHvQNzh/634350365-1974948583450669-5304249738558335774-n.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-3xl font-black mb-2">Mirësevini në Asistentin AI</h2>
          <p className="text-slate-400">Për të filluar, ju lutem konfiguroni ambientin tuaj të punës.</p>
        </div>

        <div className="p-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 italic">
              {error}
            </div>
          )}

          {mode === 'selection' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => setMode('create')}
                className="group p-8 border-2 border-slate-100 rounded-[2rem] hover:border-slate-900 transition-all text-left"
              >
                <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Building2 size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Hap Biznes</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Krijoni një hapësirë pune për ekipin tuaj.</p>
              </button>

              <button 
                onClick={() => setMode('join')}
                className="group p-8 border-2 border-slate-100 rounded-[2rem] hover:border-slate-900 transition-all text-left"
              >
                <div className="w-14 h-14 bg-white border border-slate-200 text-slate-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Bashkohu Ekipit</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Përdorni kodin që keni marrë nga kompania juaj për të hyrë.</p>
              </button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreateCompany} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Emri i Biznesit</label>
                <input 
                  autoFocus
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold"
                  placeholder="Psh: Tech Solutions SH.P.K"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Kodi i Hyrjes (Fjalëkalimi)</label>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">Siguri e Lartë</span>
                </div>
                <input 
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono font-bold tracking-widest"
                  placeholder="PSH: TECH2024"
                />
                <p className="text-[10px] text-slate-400 italic px-2">Këtë kod do t'ua dërgoni kolegëve që duan të bashkohen.</p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setMode('selection')}
                  className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600"
                >
                  Prapa
                </button>
                <button 
                  disabled={loading}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : <>Krijo Biznesin <ArrowRight size={20} /></>}
                </button>
              </div>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoinCompany} className="space-y-8">
              <div className="space-y-2 text-center">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Vendos Kodin e Kompanisë</p>
                <input 
                  autoFocus
                  required
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  className="w-full p-6 bg-slate-900 border border-slate-800 text-white rounded-3xl outline-none focus:ring-4 focus:ring-slate-700 transition-all font-mono text-3xl font-black text-center tracking-[0.2em] placeholder:text-slate-700"
                  placeholder="******"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => setMode('selection')}
                  className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 text-sm"
                >
                  Prapa
                </button>
                <button 
                  disabled={loading}
                  className="flex-[2] py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : <>Bashkohu Bashkë <ArrowRight size={20} /></>}
                </button>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-2xl flex items-start gap-3 border border-slate-100">
                 <ShieldCheck size={18} className="text-slate-600 mt-0.5 shrink-0" />
                 <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                   Pas kyçjes, të dhënat tuaja do të sinkronizohen automatikisht me ekipin.
                 </p>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
