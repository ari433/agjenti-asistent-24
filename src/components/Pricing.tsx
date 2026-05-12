import { useState } from 'react';
import { Company } from '../types';
import { 
  CreditCard, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  Loader2,
  Building2,
  AlertCircle
} from 'lucide-react';
import { db, doc, updateDoc, serverTimestamp } from '../lib/firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PricingProps {
  company: Company;
  onSuccess?: () => void;
}

export default function Pricing({ company, onSuccess }: PricingProps) {
  const [step, setStep] = useState<'pricing' | 'checkout' | 'success'>('pricing');
  const [selectedPlan, setSelectedPlan] = useState<{id: string, name: string, price: string} | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');
  const [loading, setLoading] = useState(false);

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setStep('checkout');
  };

  const handleCompletePayment = async () => {
    setLoading(true);
    try {
      // Professional artificial delay for security check appearance
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      await updateDoc(doc(db, 'companies', company.id), {
        subscriptionPlan: selectedPlan?.id,
        subscriptionStatus: 'active',
        paymentMethod: paymentMethod,
        activatedAt: serverTimestamp()
      });

      setStep('success');
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isTrialExpired = () => {
    if (!company.trialStartedAt) return false;
    const start = company.trialStartedAt.toDate();
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return diff > 7 * 24 * 60 * 60 * 1000;
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={48} strokeWidth={3} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Pagesa u Krye!</h2>
          <p className="text-slate-500 font-medium text-lg">
            Ju faleminderit që zgjodhët Agjentin AI. Llogaria juaj tani është aktive me të gjitha benefitet e paketës {selectedPlan?.name}.
          </p>
          <div className="pt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Duke ju ridrejtuar te Dashboard...
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'checkout') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row shadow-2xl overflow-hidden">
        {/* Order Summary (Professional Left Panel) */}
        <div className="md:w-[450px] bg-white p-12 flex flex-col justify-between border-r border-slate-100">
          <div className="space-y-12">
            <div className="flex items-center gap-3">
              <img src="https://i.ibb.co/PZHvQNzh/634350365-1974948583450669-5304249738558335774-n.jpg" alt="Logo" className="w-12 h-12 object-contain" />
              <div className="h-6 w-px bg-slate-200" />
              <span className="font-black text-xl text-slate-900 tracking-tight">Checkout</span>
            </div>
            
            <div className="space-y-6">
              <div className="pb-6 border-b border-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Përmbledhja e Porosisë</p>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-slate-900 text-lg">{selectedPlan?.name}</h3>
                    <p className="text-sm text-slate-500 font-medium">Pagesë e njëhershme për qasje vjetore</p>
                  </div>
                  <span className="text-xl font-black text-slate-900">{selectedPlan?.price}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>Nëntotali</span>
                  <span>{selectedPlan?.price}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>TVSH (18%)</span>
                  <span>0.00€</span>
                </div>
                <div className="flex justify-between pt-4 border-t-2 border-dashed border-slate-100 text-2xl font-black text-slate-900">
                  <span>Totali</span>
                  <span>{selectedPlan?.price}</span>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setStep('pricing')}
            className="text-slate-400 hover:text-slate-900 font-bold text-sm transition-colors flex items-center gap-2"
          >
            ← Kthehu te Planet
          </button>
        </div>

        {/* Payment Methods (Professional Right Panel) */}
        <div className="flex-1 p-8 md:p-20 flex items-center justify-center">
          <div className="max-w-md w-full space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Metoda e Pagesës</h2>
              <p className="text-slate-400 font-medium">Të gjitha transaksionet janë të siguruara dhe enkriptuara.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setPaymentMethod('card')}
                className={cn(
                  "p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 font-bold",
                  paymentMethod === 'card' ? "border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                )}
              >
                <CreditCard size={24} />
                <span className="text-sm">Kartelë / Apple Pay</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('bank')}
                className={cn(
                  "p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 font-bold",
                  paymentMethod === 'bank' ? "border-amber-400 bg-amber-50 text-amber-700 shadow-lg shadow-amber-100" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                )}
              >
                <Building2 size={24} />
                <span className="text-sm">Transfer Bankar</span>
              </button>
            </div>

            {paymentMethod === 'card' ? (
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Numri i Kartelës</label>
                    <div className="relative">
                      <input type="text" placeholder="#### #### #### ####" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium" />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                        <div className="w-8 h-5 bg-slate-200 rounded" />
                        <div className="w-8 h-5 bg-slate-200 rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Skadimi</label>
                      <input type="text" placeholder="MM / YY" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CVC</label>
                      <input type="text" placeholder="***" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-400 p-8 rounded-[2rem] text-slate-900 space-y-6 shadow-xl shadow-amber-100">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-black/10">
                    <span className="font-black">Raiffeisen Bank</span>
                    <Building2 size={24} />
                  </div>
                  <div className="space-y-4 text-sm font-bold">
                    <div>
                      <p className="opacity-60 text-[10px] uppercase mb-1">Përfituesi</p>
                      <p>AGJENTI AI SH.P.K.</p>
                    </div>
                    <div>
                      <p className="opacity-60 text-[10px] uppercase mb-1">Numri i Llogarisë (IBAN)</p>
                      <p className="font-mono text-lg">1501 0000 1234 5678</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl">
                      <p className="opacity-60 text-[10px] uppercase mb-1">Përshkrimi (Referenca)</p>
                      <p>REF-{company.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={handleCompletePayment}
              disabled={loading}
              className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={20} /> Konfirmo Pagesën {selectedPlan?.price}
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-tight">
              Duke vazhduar, ju pranoni kushtet tona të shërbimit.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const plans = [
    {
      id: 'pro',
      name: 'PRO Paketa',
      price: '50€',
      description: 'Ideale për biznese mesatare',
      features: [
        'Deri në 10 njerëz në ekip',
        'PDF Raporte të pakufizuara',
        '10 Postera AI në muaj',
        'Suport në chat',
        'Llogoja e personalizuar'
      ],
      color: 'blue'
    },
    {
      id: 'unlimited',
      name: 'UNLIMITED Paketa',
      price: '100€',
      description: 'Fuqia e plotë e Agjentit AI',
      features: [
        'Anëtarë të pakufizuar',
        'Çdo gjë e pakufizuar',
        'Prioritet në gjenerim',
        'Marketing Center Full',
        'Analitika e avancuar'
      ],
      recommended: true,
      color: 'indigo'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-5xl w-full space-y-12">
        <div className="text-center space-y-4">
          {isTrialExpired() && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full text-xs font-black uppercase tracking-widest animate-pulse mb-4">
              <AlertCircle size={14} /> Trial 7 ditë ka përfunduar
            </div>
          )}
          <h2 className="text-5xl font-black text-slate-900 tracking-tight">Zgjidhni Planet Tonë</h2>
          <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
            Vazhdoni punën tuaj me Agjentin AI duke zgjedhur njërën nga paketat profesionale.
          </p>
          
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl inline-block mt-4">
            <p className="text-blue-700 text-sm font-bold flex items-center gap-2">
              <Building2 size={16} /> Pagesa mund të bëhet direkt me kartelë ose transfer bankar (Raiffeisen Bank)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <motion.div 
              key={plan.id}
              whileHover={{ y: -5 }}
              className={cn(
                "relative bg-white p-10 rounded-[3rem] border shadow-2xl transition-all",
                plan.recommended ? "border-indigo-600 ring-4 ring-indigo-50" : "border-slate-100"
              )}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Më e Shitura
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{plan.name}</h3>
                  <p className="text-slate-500 font-medium">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-slate-400 font-bold">/ një herë</span>
                </div>

                <div className="space-y-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", plan.color === 'blue' ? "bg-blue-100 text-blue-600" : "bg-indigo-100 text-indigo-600")}>
                        <CheckCircle2 size={12} strokeWidth={3} />
                      </div>
                      <span className="text-slate-600 font-medium text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleSelectPlan(plan)}
                  className={cn(
                    "w-full py-5 rounded-[1.5rem] font-black transition-all flex items-center justify-center gap-2 group shadow-xl",
                    plan.color === 'blue' 
                      ? "bg-slate-900 text-white hover:bg-slate-800" 
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  )}
                >
                  Përzgjidhni Paketën <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                
                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-tight">
                  <ShieldCheck size={10} className="inline mr-1" /> Aktivizim i menjëhershëm
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
           <p className="text-slate-400 font-medium flex items-center justify-center gap-2">
             <Clock size={16} /> Keni nevojë për faturë profesionale për biznesin tuaj? Na kontaktoni.
           </p>
        </div>
      </div>
    </div>
  );
}
