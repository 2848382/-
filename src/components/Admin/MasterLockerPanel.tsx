import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { UserProfile, Clue } from '../../types';
import { Archive, Search, Trash2, Plus, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export const MasterLockerPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newItemName, setNewItemName] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => d.data() as UserProfile).filter(u => u.role !== 'admin'));
    });
    return () => unsub();
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = async () => {
    if (!selectedUser || !newItemName.trim()) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        inventory: arrayUnion(newItemName.trim())
      });
      // Update local selection to show new item
      setSelectedUser(prev => prev ? { ...prev, inventory: [...(prev.inventory || []), newItemName.trim()] } : null);
      setNewItemName("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveItem = async (itemName: string) => {
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        inventory: arrayRemove(itemName)
      });
       // Update local selection
       setSelectedUser(prev => prev ? { ...prev, inventory: (prev.inventory || []).filter(i => i !== itemName) } : null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[600px]">
      {/* User Selector */}
      <div className="md:col-span-4 border border-slate-200 bg-white rounded-2xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Search size={16} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="학생 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full font-bold"
          />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredUsers.map(u => (
            <button
              key={u.uid}
              onClick={() => setSelectedUser(u)}
              className={cn(
                "w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-center gap-3",
                selectedUser?.uid === u.uid && "bg-blue-50 border-l-4 border-l-blue-600"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <User size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{u.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{u.studentId}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Item Viewer */}
      <div className="md:col-span-8 border border-slate-200 bg-white rounded-2xl flex flex-col overflow-hidden shadow-sm">
        {selectedUser ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Archive size={18} className="text-blue-600" />
                {selectedUser.name}의 사물함 관제
              </h3>
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  placeholder="지급할 물건명..."
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                  onClick={handleAddItem}
                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              {selectedUser.inventory && selectedUser.inventory.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedUser.inventory.map((item, idx) => (
                    <div key={idx} className="group p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 truncate mr-2">{item}</span>
                      <button 
                        onClick={() => handleRemoveItem(item)}
                        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Archive size={40} className="opacity-20" />
                  <p className="text-sm font-bold">사물함이 비어 있습니다.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Search size={48} className="opacity-10" />
            <p className="text-sm font-bold">대상을 선택하면 실시간 사물함 관제가 시작됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};
