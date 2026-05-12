import { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, addDoc, serverTimestamp, orderBy, deleteDoc, doc } from '../lib/firebase';
import { AppUser, MarketingAsset } from '../types';
import { 
  Image as ImageIcon, 
  Sparkles, 
  Download, 
  Trash2, 
  Plus, 
  Loader2,
  Calendar,
  Zap,
  Layout
} from 'lucide-react';
import { generateImageAI } from '../lib/gemini';
import { motion, AnimatePresence } from 'framer-motion';

interface MarketingCenterProps {
  user: AppUser;
}

export default function MarketingCenter({ user }: MarketingCenterProps) {
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.companyId) return;

    const fetchAssets = async () => {
      try {
        const q = query(
          collection(db, 'marketing_assets'), 
          where('companyId', '==', user.companyId),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketingAsset)));
      } catch (err) {
        console.error("Error fetching assets:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [user.companyId]);

  const handleGenerate = async () => {
    if (!prompt || isGenerating) return;
    
    setIsGenerating(true);
    try {
      const enhancedPrompt = `High-quality professional marketing poster/visual for a business. Subject: ${prompt}. Style: Modern, clean, professional composition. No text if possible, focusing on aesthetics.`;
      const url = await generateImageAI(enhancedPrompt);
      
      if (url) {
        const newAsset = {
          companyId: user.companyId!,
          url,
          prompt,
          type: 'poster' as const,
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'marketing_assets'), newAsset);
        setAssets([{ id: docRef.id, ...newAsset, createdAt: { toDate: () => new Date() } } as any, ...assets]);
        setPrompt('');
      }
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteAsset = async (id: string) => {
    if (confirm('A dëshironi ta fshini këtë dizajn?')) {
      await deleteDoc(doc(db, 'marketing_assets', id));
      setAssets(assets.filter(a => a.id !== id));
    }
  };

  const templates = [
    "Postery urimi për Festat e Fundvitit",
    "Postery për zbritje sezonale 50%",
    "Prezantim i produktit të ri",
    "Mirësevinë në ekipin tonë",
  ];

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Qendra e Marketingut <Sparkles className="text-amber-500" />
          </h2>
          <p className="text-slate-500 font-medium mt-1">Krijo vizuale profesionale për brendin tënd brenda sekondave.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Çfarë dëshiron të krijosh?</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Psh: Një poster modern për urimin e Bajramit me ngjyra gold dhe emerald..."
                className="w-full h-40 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium resize-none"
              />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ide të shpejta</p>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <button 
                    key={t}
                    onClick={() => setPrompt(t)}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !prompt}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
              {isGenerating ? "Duke u gjeneruar..." : "Gjenero Posterin"}
            </button>
          </div>
        </div>

        {/* Gallery */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {assets.map((asset) => (
                  <motion.div 
                    key={asset.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group relative bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-slate-100">
                      <img 
                        src={asset.url} 
                        alt={asset.prompt} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                      <p className="text-white text-sm font-medium line-clamp-2 mb-4 italic">"{asset.prompt}"</p>
                      <div className="flex gap-2">
                        <a 
                          href={asset.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex-1 py-3 bg-white text-slate-900 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
                        >
                          <Download size={14} /> Shkarko
                        </a>
                        <button 
                          onClick={() => deleteAsset(asset.id)}
                          className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {assets.length === 0 && (
                <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon size={48} className="mb-4 opacity-20" />
                  <p className="font-bold">Nuk keni asnjë dizajn ende.</p>
                  <p className="text-xs">Udhëzoni AI më lart për të krijuar posterin tuaj të parë.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
