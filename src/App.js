import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, GoogleAuthProvider, 
  signInWithPopup, signOut, signInWithCustomToken, signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  BookOpen, Star, PlusCircle, GraduationCap, Search, 
  Trash2, CheckCircle2, LogOut, X, AlertCircle,
  Folder, Tags, Plus, Layers, Menu, 
  RotateCcw, ChevronLeft, ChevronRight, Play, FolderPlus, Upload
} from 'lucide-react';

// --- Firebase 配置 ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const appId = typeof __app_id !== 'undefined' ? __app_id : "my-vocab-app";

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('library');
  const [vocabList, setVocabList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // 處理認證
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          // 在預覽環境中，若無 token 則使用匿名登入確保功能正常
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 監聽 Firestore 數據
  useEffect(() => {
    if (!user) return;
    
    // 監聽單字庫
    const vocabQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'vocabulary'));
    const unsubVocab = onSnapshot(vocabQuery, 
      (snap) => {
        setVocabList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Vocab Sync Error:", error)
    );

    // 監聽分類
    const catQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'categories'));
    const unsubCat = onSnapshot(catQuery, 
      (snap) => {
        setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Category Sync Error:", error)
    );

    return () => { unsubVocab(); unsubCat(); };
  }, [user]);

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setShowLogoutConfirm(false);
  };

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50">
      <div className="animate-bounce bg-indigo-600 p-4 rounded-3xl mb-4">
        <GraduationCap className="text-white w-8 h-8" />
      </div>
      <div className="font-black text-slate-400 text-sm tracking-widest uppercase">載入數據中...</div>
    </div>
  );

  if (!user) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 max-w-sm w-full border border-slate-100">
        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200">
          <GraduationCap className="text-white w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">學測單字雲</h1>
        <p className="text-slate-500 font-medium">個人化的英文單字學習助手</p>
        <button 
          onClick={() => signInWithPopup(auth, googleProvider)} 
          className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" /> 
          使用 Google 登入
        </button>
        <div className="pt-4 text-slate-300 text-xs font-mono tracking-widest uppercase">v1.2.3 PRO</div>
      </div>
    </div>
  );

  const navigation = [
    { id: 'library', label: '單字庫', icon: <BookOpen /> },
    { id: 'database', label: '分類管理', icon: <Tags /> },
    { id: 'fav', label: '收藏清單', icon: <Star /> },
    { id: 'add', label: '新增單字', icon: <PlusCircle /> },
    { id: 'quiz', label: '學習模式', icon: <GraduationCap /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans antialiased text-slate-900">
      {/* Sidebar Desktop */}
      <aside className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out z-50 flex flex-col`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl"><GraduationCap className="text-white w-6 h-6" /></div>
            <h1 className="font-bold text-xl text-slate-800 tracking-tight">單字雲</h1>
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}><X size={20}/></button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navigation.map(item => (
            <button 
              key={item.id} 
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {React.cloneElement(item.icon, { size: 20 })} 
              <span className="font-bold">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl truncate border border-slate-100">
             <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-8 h-8 rounded-full shadow-sm bg-indigo-100" alt="avt" />
             <div className="flex flex-col truncate">
               <span className="text-xs font-black text-slate-700 truncate">{user.displayName || '使用者'}</span>
               <span className="text-[9px] text-slate-400 truncate">{user.email || 'Anonymous'}</span>
             </div>
          </div>
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-red-500 text-sm font-bold transition-colors">
            <LogOut size={16} /> 登出帳號
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg"><GraduationCap className="text-white w-5 h-5" /></div>
          <span className="font-black text-slate-800">學測單字雲</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-50 rounded-xl text-slate-600"><Menu size={20}/></button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:ml-64 md:p-10 max-w-5xl">
        {activeTab === 'library' && <VocabLibrary vocab={vocabList} user={user} title="所有單字" db={db} appId={appId} categories={categories} showToast={showToast} />}
        {activeTab === 'database' && <CategoryManager categories={categories} vocab={vocabList} user={user} db={db} appId={appId} showToast={showToast} />}
        {activeTab === 'fav' && <VocabLibrary vocab={vocabList.filter(v => v.favorite)} user={user} title="收藏清單" db={db} appId={appId} categories={categories} showToast={showToast} />}
        {activeTab === 'add' && <AddVocab user={user} showToast={showToast} db={db} appId={appId} setActiveTab={setActiveTab} categories={categories} />}
        {activeTab === 'quiz' && <Quiz vocab={vocabList} categories={categories} db={db} user={user} appId={appId} />}
      </main>

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-xs w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto"><LogOut size={32}/></div>
            <h3 className="text-xl font-black">確定要登出嗎？</h3>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-slate-100 rounded-2xl font-bold text-slate-600">取消</button>
              <button onClick={handleLogout} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-100">確定登出</button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 font-bold text-sm animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-green-400" /> {message}
        </div>
      )}

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .backface-hidden { backface-visibility: hidden; }
        .preserve-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}

// --- 單字庫組件 ---
function VocabLibrary({ vocab, user, title, db, appId, categories, showToast }) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [activeCatSelector, setActiveCatSelector] = useState(null);

  const filtered = vocab
    .filter(v => (posFilter === 'all' || v.pos === posFilter))
    .filter(v => 
      v.word?.toLowerCase().includes(search.toLowerCase()) || 
      v.definition?.includes(search)
    )
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleAddCategory = async (vId, catId) => {
    if (!catId) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', vId);
    await updateDoc(docRef, {
      categoryIds: arrayUnion(catId)
    });
    showToast(`已成功加入分類`);
    setActiveCatSelector(null);
  };

  const handleBulkAddCategory = async (catId) => {
    if (!catId || selectedIds.length === 0) return;
    for (const id of selectedIds) {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', id);
      await updateDoc(docRef, {
        categoryIds: arrayUnion(catId)
      });
    }
    showToast(`已將 ${selectedIds.length} 個單字加入分類`);
    setSelectedIds([]);
    setIsBulkMode(false);
  };

  const toggleFav = async (e, item) => {
    e.stopPropagation();
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', item.id);
    await updateDoc(docRef, { favorite: !item.favorite });
  };

  const deleteItem = async (e, id) => {
    e.stopPropagation();
    if(window.confirm('確定刪除這個單字嗎？')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', id));
      showToast('單字已刪除');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{title}</h2>
        <div className="flex gap-2">
          {isBulkMode && (
            <button onClick={() => setSelectedIds(filtered.map(v => v.id))} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm">全選</button>
          )}
          <button 
            onClick={() => { setIsBulkMode(!isBulkMode); setSelectedIds([]); }} 
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${isBulkMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500'}`}
          >
            {isBulkMode ? '完成選取' : '批量管理'}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="搜尋單字、解釋..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <select 
          className="px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm font-bold text-slate-600 outline-none"
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
        >
          <option value="all">所有詞性</option>
          <option value="n.">名詞 (n.)</option>
          <option value="v.">動詞 (v.)</option>
          <option value="adj.">形容詞 (adj.)</option>
          <option value="adv.">副詞 (adv.)</option>
          <option value="phr.">片語 (phr.)</option>
        </select>
      </div>

      {isBulkMode && selectedIds.length > 0 && (
        <div className="sticky top-20 z-30 bg-indigo-900 text-white p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl border border-white/10 animate-in slide-in-from-top-4">
          <span className="font-bold flex items-center gap-2">
            <Layers size={18} /> 已選取 {selectedIds.length} 個單字
          </span>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              className="flex-1 md:w-48 px-3 py-2 bg-indigo-800 text-white rounded-xl border border-indigo-700 text-sm font-bold outline-none" 
              onChange={(e) => handleBulkAddCategory(e.target.value)} 
              value=""
            >
              <option value="" disabled>加入分類至...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button 
              onClick={async () => {
                if(window.confirm(`確定刪除這 ${selectedIds.length} 個單字嗎？`)) {
                  for(const id of selectedIds) {
                    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', id));
                  }
                  showToast('批量刪除成功');
                  setSelectedIds([]);
                  setIsBulkMode(false);
                }
              }}
              className="bg-red-500 hover:bg-red-600 p-2 rounded-xl"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 pb-20">
        {filtered.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-white rounded-[3rem] border border-dashed border-slate-200">
             <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-300"><BookOpen size={32}/></div>
             <p className="text-slate-400 font-bold">找不到相關單字</p>
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className={`bg-white border rounded-3xl transition-all duration-300 group ${selectedIds.includes(item.id) ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/30' : 'border-slate-100 shadow-sm hover:shadow-md'} overflow-hidden`}>
              <div className="relative flex items-center justify-between gap-3 px-4 py-4 md:px-5 md:py-5 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                <div className="flex items-center gap-3">
                  {isBulkMode ? (
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedIds.includes(item.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 bg-white'}`}>
                      {selectedIds.includes(item.id) && <CheckCircle2 size={16} />}
                    </button>
                  ) : (
                    <button onClick={(e) => toggleFav(e, item)} className="p-1 relative z-10 hover:scale-125 transition-transform"><Star className={`w-6 h-6 ${item.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} /></button>
                  )}
                  <div>
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                      {item.word} 
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-tighter font-black">{item.pos}</span>
                    </h3>
                    <p className="text-slate-500 text-sm truncate max-w-[200px] sm:max-w-md font-medium">{item.definition}</p>
                  </div>
                </div>

                {!isBulkMode && (
                  <div className="flex items-center gap-1 md:gap-2 relative z-10">
                    {activeCatSelector === item.id ? (
                      <div className="flex items-center gap-1 bg-indigo-50 p-1 rounded-xl border border-indigo-100 animate-in fade-in zoom-in-95">
                        <select 
                          autoFocus 
                          className="text-xs bg-transparent border-none outline-none font-bold text-indigo-600 px-2" 
                          onChange={(e) => handleAddCategory(item.id, e.target.value)} 
                          onBlur={() => setTimeout(() => setActiveCatSelector(null), 200)} 
                          value=""
                        >
                           <option value="" disabled>分類至</option>
                           {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={(e) => { e.stopPropagation(); setActiveCatSelector(null); }} className="text-indigo-300 p-1"><X size={14}/></button>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setActiveCatSelector(item.id); }} className="p-2 text-slate-200 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="加入分類"><FolderPlus size={18} /></button>
                    )}
                    <button onClick={(e) => deleteItem(e, item.id)} className="p-2 text-slate-100 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                  </div>
                )}
              </div>
              
              {expandedId === item.id && (
                <div className="px-5 pb-5 md:px-14 animate-in slide-in-from-top-2">
                  <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Example Sentence</p>
                        <p className="font-bold text-slate-700 leading-relaxed text-lg italic">"{item.exampleEng}"</p>
                        <p className="text-slate-400 text-sm font-medium">{item.exampleChn}</p>
                     </div>
                     
                     <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/50">
                       {(!item.categoryIds || item.categoryIds.length === 0) ? (
                         <span className="text-[10px] text-slate-300 font-bold italic">尚無分類</span>
                       ) : (
                         item.categoryIds.map(cid => {
                           const cat = categories.find(c => c.id === cid);
                           if (!cat) return null;
                           return (
                             <span key={cid} className="group/tag flex items-center gap-1 text-[10px] bg-white text-indigo-600 border border-indigo-100 px-3 py-1 rounded-full font-black uppercase shadow-sm">
                               <Tags size={10} /> {cat.name}
                               <button 
                                 onClick={async (e) => {
                                   e.stopPropagation();
                                   const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', item.id);
                                   await updateDoc(docRef, { categoryIds: arrayRemove(cid) });
                                 }}
                                 className="hover:text-red-500"
                               >
                                 <X size={10} />
                               </button>
                             </span>
                           );
                         })
                       )}
                     </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- 測驗與練習組件 --- (延用原邏輯並優化)
function Quiz({ vocab, categories, db, user, appId }) {
  const [config, setConfig] = useState({ range: 'all', type: 'choice', limit: '10' });
  const [gameState, setGameState] = useState('config'); 
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAns, setSelectedAns] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const startMode = () => {
    let pool = [...vocab];
    if (config.range === 'fav') pool = pool.filter(v => v.favorite);
    else if (config.range !== 'all') pool = pool.filter(v => v.categoryIds?.includes(config.range));

    if (pool.length < 1) {
      alert('該範圍目前沒有單字');
      return;
    }

    let shuffled = pool.sort(() => Math.random() - 0.5);
    if (config.limit !== 'all') {
      shuffled = shuffled.slice(0, parseInt(config.limit));
    }

    if (config.type === 'choice') {
      if (pool.length < 4) { alert('四選一測驗至少需要4個單字才能隨機出選項'); return; }
      const qData = shuffled.map(q => {
        const wrong = pool.filter(v => v.id !== q.id).sort(() => Math.random() - 0.5).slice(0, 3);
        return { question: q, options: [q, ...wrong].sort(() => Math.random() - 0.5) };
      });
      setQuestions(qData);
      setGameState('playing_choice');
    } else {
      setQuestions(shuffled.map(q => ({ question: q })));
      setGameState('playing_card');
    }
    setCurrentIdx(0);
    setScore(0);
  };

  const handleAnswer = (optionId) => {
    if (selectedAns !== null) return;
    setSelectedAns(optionId);
    if (optionId === questions[currentIdx].question.id) setScore(score + 1);
    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(currentIdx + 1);
        setSelectedAns(null);
      } else {
        setGameState('result');
      }
    }, 1000);
  };

  const toggleFav = async (item) => {
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', item.id);
    await updateDoc(docRef, { favorite: !item.favorite });
  };

  if (gameState === 'config') return (
    <div className="max-w-md mx-auto py-10 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">學習模式</h2>
        <p className="text-slate-500 font-medium">選擇適合你的練習方式</p>
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2 tracking-widest">學習方式</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfig({...config, type:'choice'})} className={`p-4 rounded-2xl border-2 font-bold transition-all ${config.type==='choice' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 hover:bg-slate-50'}`}>四選一測驗</button>
              <button onClick={() => setConfig({...config, type:'card'})} className={`p-4 rounded-2xl border-2 font-bold transition-all ${config.type==='card' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 hover:bg-slate-50'}`}>翻卡練習</button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2 tracking-widest">選擇範圍</label>
            <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={config.range} onChange={e => setConfig({...config, range: e.target.value})}>
              <option value="all">所有單字 ({vocab.length})</option>
              <option value="fav">收藏單字 ({vocab.filter(v=>v.favorite).length})</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({vocab.filter(v=>v.categoryIds?.includes(c.id)).length})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2 tracking-widest">測驗題數</label>
            <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={config.limit} onChange={e => setConfig({...config, limit: e.target.value})}>
              <option value="10">10 題</option>
              <option value="20">20 題</option>
              <option value="50">50 題</option>
              <option value="all">該範圍全部單字</option>
            </select>
          </div>
        </div>
        <button onClick={startMode} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all shadow-indigo-100 flex items-center justify-center gap-2">
          <Play size={20} fill="currentColor" /> 開始學習
        </button>
      </div>
    </div>
  );

  if (gameState === 'playing_choice') {
    const q = questions[currentIdx];
    return (
      <div className="max-w-2xl mx-auto py-6 space-y-8 animate-in fade-in">
        <div className="flex justify-between items-center px-4">
          <button onClick={()=>setGameState('config')} className="text-slate-400 font-bold flex items-center gap-1 hover:text-slate-600 transition-colors"><ChevronLeft size={16}/> 退出</button>
          <div className="text-indigo-600 font-black px-4 py-1 bg-indigo-50 rounded-full text-sm">進度 {currentIdx + 1} / {questions.length}</div>
        </div>
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl relative border border-slate-50 text-center flex flex-col items-center justify-center min-h-[280px] gap-2">
          <button onClick={() => toggleFav(q.question)} className="absolute top-8 right-8 p-2 hover:scale-125 transition-transform">
             <Star className={`w-8 h-8 ${q.question.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
          </button>
          <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-4 py-1.5 rounded-full uppercase tracking-widest">{q.question.pos}</span>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 break-all">{q.question.word}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {q.options.map(opt => (
            <button key={opt.id} onClick={() => handleAnswer(opt.id)} className={`p-6 rounded-[2rem] font-bold text-lg text-left transition-all border-2 shadow-sm
              ${selectedAns === null ? 'bg-white border-white hover:border-indigo-600 hover:shadow-md' : 
                opt.id === q.question.id ? 'bg-green-500 border-green-500 text-white translate-y-[-2px]' : 
                selectedAns === opt.id ? 'bg-red-500 border-red-500 text-white' : 'bg-white opacity-50'}`}>
              <span className={`text-xs opacity-60 mr-2 uppercase font-black ${selectedAns !== null ? 'text-white' : 'text-slate-400'}`}>{opt.pos}</span> {opt.definition}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameState === 'playing_card') {
    const q = questions[currentIdx];
    return (
      <div className="max-w-xl mx-auto py-6 space-y-8 animate-in slide-in-from-right-10">
        <div className="flex justify-between items-center px-4">
          <button onClick={()=>setGameState('config')} className="text-slate-400 font-bold flex items-center gap-1 hover:text-slate-600 transition-colors"><ChevronLeft size={16}/> 退出</button>
          <div className="text-indigo-600 font-black px-4 py-1 bg-indigo-50 rounded-full text-sm">{currentIdx + 1} / {questions.length}</div>
        </div>
        <div className="perspective-1000 h-[450px] cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
             {/* Front */}
             <div className="absolute inset-0 backface-hidden bg-white border border-slate-100 rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center p-8 space-y-4">
               <span className="text-indigo-600 font-black uppercase text-xs tracking-widest bg-indigo-50 px-4 py-1.5 rounded-full">{q.question.pos}</span>
               <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 break-all">{q.question.word}</h2>
               <div className="mt-12 bg-slate-50 p-4 rounded-2xl flex items-center gap-2 text-slate-400 text-sm font-bold group-hover:bg-indigo-50 group-hover:text-indigo-400 transition-colors">
                 <RotateCcw size={16} /> 點擊翻轉查看解釋
               </div>
             </div>
             {/* Back */}
             <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 text-white rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center p-10 text-center space-y-8 overflow-hidden">
               <div className="space-y-2">
                 <span className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.3em]">DEFINITION</span>
                 <h2 className="text-3xl md:text-5xl font-black">{q.question.definition}</h2>
               </div>
               <div className="w-20 h-1 bg-white/20 rounded-full"></div>
               <div className="space-y-3 max-w-sm">
                 <p className="text-indigo-50 font-bold italic leading-relaxed text-lg">"{q.question.exampleEng}"</p>
                 <p className="text-indigo-200/80 text-sm font-medium">{q.question.exampleChn}</p>
               </div>
               <p className="text-white/40 text-[10px] font-bold mt-4 uppercase tracking-widest">點擊翻回正面</p>
             </div>
          </div>
        </div>
        <div className="flex justify-between items-center px-8">
          <button onClick={() => toggleFav(q.question)} className="flex items-center gap-2 font-bold text-slate-400 hover:text-yellow-500 transition-colors">
             <Star className={q.question.favorite ? 'fill-yellow-400 text-yellow-400' : ''} /> 收藏單字
          </button>
          <div className="flex gap-4">
            <button 
              disabled={currentIdx === 0} 
              onClick={() => { setCurrentIdx(currentIdx-1); setIsFlipped(false); }} 
              className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft/>
            </button>
            <button 
              onClick={() => { if(currentIdx+1 < questions.length) { setCurrentIdx(currentIdx+1); setIsFlipped(false); } else { setGameState('result'); } }} 
              className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              <ChevronRight/>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-10 text-center space-y-8 animate-in zoom-in-95">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl space-y-8 border border-slate-50">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-800">學習完成！</h2>
          <p className="text-slate-400 font-bold">今天也進步了一點點</p>
        </div>
        
        {config.type === 'choice' && (
          <div className="relative inline-block">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-slate-100" />
              <circle 
                cx="80" cy="80" r="70" 
                stroke="currentColor" strokeWidth="14" 
                fill="transparent" className="text-indigo-600" 
                strokeDasharray={440} 
                strokeDashoffset={440 - (440 * score) / questions.length} 
                strokeLinecap="round" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-indigo-600">{Math.round((score/questions.length)*100)}%</span>
            </div>
          </div>
        )}
        
        <div className="bg-slate-50 p-6 rounded-[2rem] space-y-1">
          <p className="text-slate-400 font-black text-xs uppercase tracking-widest">統計數據</p>
          <p className="text-slate-800 font-black text-xl">
            {config.type === 'choice' ? `答對了 ${score} / ${questions.length} 題` : `複習完畢！共觀看 ${questions.length} 個單字`}
          </p>
        </div>

        <button onClick={() => setGameState('config')} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 transition-colors">
          回學習首頁
        </button>
      </div>
    </div>
  );
}

// --- 分類管理組件 ---
function CategoryManager({ categories, vocab, user, db, appId, showToast }) {
  const [newCatName, setNewCatName] = useState('');
  
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'categories'), { 
      name: newCatName, 
      createdAt: serverTimestamp() 
    });
    setNewCatName('');
    showToast('分類已建立');
  };

  const deleteCat = async (id) => {
    if(window.confirm('確定要刪除這個分類嗎？（不會刪除該分類下的單字）')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'categories', id));
      showToast('分類已刪除');
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-black text-slate-900 tracking-tight">分類管理</h2>
      <div className="flex gap-2">
        <input 
          className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold" 
          placeholder="輸入新分類名稱 (如：基礎 4000 單)..." 
          value={newCatName} 
          onChange={e => setNewCatName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCategory()}
        />
        <button onClick={addCategory} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2">
          <Plus size={24}/> <span>建立</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-300 font-bold border-2 border-dashed border-slate-100 rounded-[2.5rem]">
            尚無分類，請先建立
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all hover:border-indigo-100">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Folder size={24} fill="currentColor" className="opacity-20" /></div>
                 <div>
                   <p className="font-black text-slate-800">{cat.name}</p>
                   <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{vocab.filter(v=>v.categoryIds?.includes(cat.id)).length} 個單字</p>
                 </div>
               </div>
               <button onClick={() => deleteCat(cat.id)} className="text-slate-100 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2"><Trash2 size={18}/></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- 新增單字組件 --- (完整補全版)
function AddVocab({ user, showToast, db, appId, setActiveTab, categories }) {
  const [mode, setMode] = useState('single');
  const [formData, setFormData] = useState({ 
    word: '', 
    pos: 'n.', 
    definition: '', 
    exampleEng: '', 
    exampleChn: '', 
    targetCat: '' 
  });
  const [bulkText, setBulkText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'single' && (!formData.word || !formData.definition)) {
      showToast('請填寫單字與解釋');
      return;
    }

    setIsProcessing(true);
    try {
      const vocabColl = collection(db, 'artifacts', appId, 'users', user.uid, 'vocabulary');
      
      if (mode === 'single') {
        await addDoc(vocabColl, {
          ...formData,
          categoryIds: formData.targetCat ? [formData.targetCat] : [],
          favorite: false,
          createdAt: serverTimestamp()
        });
        showToast('新增成功');
      } else {
        const lines = bulkText.split('\n').filter(l => l.trim() !== '');
        if (lines.length === 0) throw new Error('沒有資料可匯入');
        
        for (const line of lines) {
          const p = line.split(';').map(s => s.trim());
          if (p.length >= 3) {
            let catIds = [];
            // 若有指定分類名稱，試圖尋找或建立
            if (p[5]) {
               let cat = categories.find(c => c.name === p[5]);
               if (!cat) {
                 const catRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'categories'), { 
                   name: p[5], 
                   createdAt: serverTimestamp() 
                 });
                 catIds = [catRef.id];
               } else catIds = [cat.id];
            }
            
            await addDoc(vocabColl, {
              word: p[0], 
              pos: p[1] || 'n.', 
              definition: p[2], 
              exampleEng: p[3] || '', 
              exampleChn: p[4] || '',
              favorite: false, 
              categoryIds: catIds, 
              createdAt: serverTimestamp()
            });
          }
        }
        showToast(`成功匯入 ${lines.length} 個單字`);
      }
      setActiveTab('library');
    } catch (error) { 
      console.error(error);
      showToast('發生錯誤，請確認格式'); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-5">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">{mode === 'single' ? '新增單字' : '批量匯入'}</h2>
        <div className="inline-flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          <button onClick={() => setMode('single')} className={`px-8 py-2 rounded-xl text-sm font-black transition-all ${mode === 'single' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>手動新增</button>
          <button onClick={() => setMode('bulk')} className={`px-8 py-2 rounded-xl text-sm font-black transition-all ${mode === 'bulk' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>批量匯入</button>
        </div>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-xl border border-slate-50">
        {mode === 'single' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-2 tracking-widest">單字 (Word)</label>
                <input 
                  autoFocus
                  required
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                  placeholder="例如: persistent"
                  value={formData.word}
                  onChange={e => setFormData({...formData, word: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-2 tracking-widest">詞性 (POS)</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none cursor-pointer"
                  value={formData.pos}
                  onChange={e => setFormData({...formData, pos: e.target.value})}
                >
                  <option value="n.">名詞 (n.)</option>
                  <option value="v.">動詞 (v.)</option>
                  <option value="adj.">形容詞 (adj.)</option>
                  <option value="adv.">副詞 (adv.)</option>
                  <option value="phr.">片語 (phr.)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2 tracking-widest">中文解釋 (Definition)</label>
              <input 
                required
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                placeholder="例如: 堅持不懈的；持續的"
                value={formData.definition}
                onChange={e => setFormData({...formData, definition: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2 tracking-widest">英文例句 (English Example)</label>
              <textarea 
                rows="2"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none" 
                placeholder="She is persistent in pursuing her dreams."
                value={formData.exampleEng}
                onChange={e => setFormData({...formData, exampleEng: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2 tracking-widest">例句翻譯 (Chinese Example)</label>
              <input 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                placeholder="她在追求夢想的道路上堅持不懈。"
                value={formData.exampleChn}
                onChange={e => setFormData({...formData, exampleChn: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2 tracking-widest">加入分類 (Category)</label>
              <select 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none cursor-pointer"
                value={formData.targetCat}
                onChange={e => setFormData({...formData, targetCat: e.target.value})}
              >
                <option value="">暫不分類</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isProcessing}
              className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {isProcessing ? '處理中...' : '確認新增單字'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-100 p-5 rounded-[2rem] space-y-2">
              <div className="flex items-center gap-2 text-amber-600 font-black">
                <AlertCircle size={20}/> 格式說明
              </div>
              <p className="text-amber-800/70 text-sm font-medium leading-relaxed">
                每一行一個單字，欄位之間使用「分號 <span className="font-bold">;</span>」隔開：<br/>
                <code className="bg-white/50 px-1 rounded font-bold">單字 ; 詞性 ; 中文解釋 ; 英文例句 ; 例句翻譯 ; 分類名稱</code>
              </p>
              <div className="bg-white/40 p-2 rounded-lg font-mono text-[10px] text-amber-900/40">
                apple; n.; 蘋果; I like apples.; 我喜歡蘋果; 水果類
              </div>
            </div>

            <textarea 
              rows="8"
              className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
              placeholder="請輸入多筆資料..."
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
            />

            <button 
              onClick={handleSubmit}
              disabled={isProcessing || !bulkText.trim()}
              className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isProcessing ? '匯入中...' : <><Upload size={20} /> 開始批量匯入</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}