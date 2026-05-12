import { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, doc, updateDoc, deleteDoc, getDoc } from '../lib/firebase';
import { AppUser, Company } from '../types';
import { 
  Users, 
  Shield, 
  User as UserIcon, 
  Trash2, 
  Search,
  Mail,
  Calendar,
  Clock,
  MoreVertical,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface TeamManagementProps {
  user: AppUser;
}

export default function TeamManagement({ user }: TeamManagementProps) {
  const [members, setMembers] = useState<AppUser[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.companyId) return;

    const fetchContext = async () => {
      try {
        const cSnap = await getDoc(doc(db, 'companies', user.companyId!));
        if (cSnap.exists()) setCompany({ id: cSnap.id, ...cSnap.data() } as Company);

        const q = query(
          collection(db, 'users'), 
          where('companyId', '==', user.companyId)
        );
        const snapshot = await getDocs(q);
        setMembers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser)));
      } catch (err) {
        console.error("Error fetching context:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, [user.companyId]);

  const toggleRole = async (member: AppUser) => {
    if (member.uid === user.uid) return; // Cannot demote self
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    await updateDoc(doc(db, 'users', member.uid), { role: newRole });
    setMembers(members.map(m => m.uid === member.uid ? { ...m, role: newRole } : m));
  };

  const removeMember = async (memberUid: string) => {
    if (memberUid === user.uid) return;
    if (confirm('A jeni të sigurt që dëshironi të largoni këtë anëtar?')) {
      await updateDoc(doc(db, 'users', memberUid), { companyId: null, role: 'member' });
      setMembers(members.filter(m => m.uid !== memberUid));
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF() as any;
    doc.setFontSize(22);
    doc.text(company?.name || 'Agjenti AI', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Lista Zyrtare e Ekipit - Gjeneruar më: ${new Date().toLocaleDateString()}`, 14, 28);
    
    const tableData = members.map(m => [
      m.displayName,
      m.email,
      m.role.toUpperCase(),
      m.joinedAt ? new Date(m.joinedAt.toDate()).toLocaleDateString() : 'N/A'
    ]);

    doc.autoTable({
      head: [['Emri', 'Email', 'Roli', 'Data e Bashkimit']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 }
    });

    doc.save(`ekipi-${company?.name || 'biznes'}.pdf`);
  };

  const filteredMembers = members.filter(m => 
    m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Menaxhimi i Ekipit</h2>
          <p className="text-slate-500 font-medium mt-1">Shikoni kush është regjistruar dhe menaxhoni qasjen e tyre.</p>
        </div>
        <button 
          onClick={exportPDF}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Calendar size={18} /> Shkarko Listën (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Totali i Anëtarëve</p>
            <p className="text-2xl font-black text-slate-900">{members.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administratorë</p>
            <p className="text-2xl font-black text-slate-900">{members.filter(m => m.role === 'admin').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktivë Sot</p>
            <p className="text-2xl font-black text-slate-900">{members.length} <span className="text-xs font-normal text-slate-400">/ {members.length}</span></p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Kërko me emër ose email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Anëtari</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Roli</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bashkuar më</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Veprimet</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.uid} className="border-t border-slate-50 hover:bg-slate-50/30 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <img 
                        src={member.photoURL || `https://ui-avatars.com/api/?name=${member.displayName}`} 
                        alt="" 
                        className="w-12 h-12 rounded-2xl object-cover shadow-sm"
                      />
                      <div>
                        <p className="font-black text-slate-900">{member.displayName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">ID: {member.uid.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <Mail size={14} className="text-slate-400" />
                      {member.email}
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit",
                      member.role === 'admin' ? "bg-indigo-50 text-indigo-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {member.role === 'admin' ? <Shield size={12} /> : <UserIcon size={12} />}
                      {member.role}
                    </span>
                  </td>
                  <td className="p-6 font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                       <Clock size={14} />
                       {member.joinedAt ? new Date(member.joinedAt.toDate()).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {member.uid !== user.uid && (
                        <>
                          <button 
                            onClick={() => toggleRole(member)}
                            className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title={member.role === 'admin' ? 'Hiq Admin' : 'Bëj Admin'}
                          >
                            <Shield size={18} />
                          </button>
                          <button 
                            onClick={() => removeMember(member.uid)}
                            className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Largo nga Ekipi"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <div className="p-20 text-center text-slate-400 italic">Nuk u gjet asnjë anëtar.</div>
          )}
        </div>
      </div>
    </div>
  );
}
