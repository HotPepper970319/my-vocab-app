import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, GoogleAuthProvider, 
  signInWithPopup, signInWithRedirect, getRedirectResult, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, serverTimestamp, arrayUnion, arrayRemove, where
} from 'firebase/firestore';
import { 
  BookOpen, Star, PlusCircle, GraduationCap, Search, ChevronDown, 
  Trash2, CheckCircle2, LogOut, X, AlertCircle, Copy, AlertTriangle,
  FolderPlus, Folder, Tags, Plus, MoreHorizontal, FileText, Layers,
  Menu, ChevronRight, LayoutGrid, ListChecks
} from 'lucide-react';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const appId = "my-vocab-app";
const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "你的_API_KEY";

let app, auth, db, googleProvider;
if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('library');
  const [vocabList, setVocabList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isConfigured) return;
    const unsubVocab = onSnapshot(query(collection(db, `artifacts/${appId}/users/${user.uid}/vocabulary`)), (snap) => {
      setVocabList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubCat = onSnapshot(query(collection(db, `artifacts/${appId}/users/${user.uid}/categories`)), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubVocab(); unsubCat(); };
  }, [user]);

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-indigo-600">載入中...</div>;

  if (!user) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 max-w-sm w-full">
        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg"><GraduationCap className="text-white w-12 h-12" /></div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">學測單字雲</h1>
        <p className="text-slate-500 font-medium">個人化的英文單字學習助手</p>
        <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" /> 使用 Google 登入
        </button>
        <div className="pt-4 text-slate-300 text-xs font-mono">v1.2.1 (beta)</div>
      </div>
    </div>
  );

  const navigation = [
    { id: 'library', label: '單字庫', icon: <BookOpen /> },
    { id: 'database', label: '分類管理', icon: <Tags /> },
    { id: 'fav', label: '收藏清單', icon: <Star /> },
    { id: 'add', label: '新增單字', icon: <PlusCircle /> },
    { id: 'quiz', label: '測驗模式', icon: <GraduationCap /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans antialiased text-slate-900">
      {/* 側邊導航 (Desktop) */}
      <aside className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out z-50 flex flex-col`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl"><GraduationCap className="text-white w-6 h-6" /></div>
            <h1 className="font-bold text-xl text-slate-800">單字雲</h1>
          </div>
          <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}><X size={20}/></button>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navigation.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
              {React.cloneElement(item.icon, { size: 20 })} <span className="font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl truncate">
             <img src={user.photoURL} className="w-8 h-8 rounded-full shadow-sm" alt="avt" />
             <span className="text-xs font-black text-slate-700 truncate">{user.displayName}</span>
          </div>
          <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-red-500 text-sm font-bold">
            <LogOut size={16} /> 登出帳號
          </button>
          <div className="text-center text-[10px] text-slate-300 font-mono">v1.2.1 (beta)</div>
        </div>
      </aside>

      {/* 手機 Top Bar */}
      <div className="md:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg"><GraduationCap className="text-white w-5 h-5" /></div>
          <span className="font-black text-slate-800">學測單字雲</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-50 rounded-xl text-slate-600"><Menu size={20}/></button>
      </div>

      {/* 主內容區 */}
      <main className="flex-1 p-4 md:ml-64 md:p-10 max-w-5xl">
        {activeTab === 'library' && <VocabLibrary vocab={vocabList} user={user} title="所有單字" db={db} appId={appId} categories={categories} showToast={showToast} />}
        {activeTab === 'database' && <CategoryManager categories={categories} vocab={vocabList} user={user} db={db} appId={appId} showToast={showToast} />}
        {activeTab === 'fav' && <VocabLibrary vocab={vocabList.filter(v => v.favorite)} user={user} title="收藏單字" db={db} appId={appId} categories={categories} showToast={showToast} />}
        {activeTab === 'add' && <AddVocab user={user} showToast={showToast} db={db} appId={appId} setActiveTab={setActiveTab} categories={categories} />}
        {activeTab === 'quiz' && <Quiz vocab={vocabList} categories={categories} db={db} user={user} appId={appId} />}
      </main>

      {/* Toast */}
      {message && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 font-bold text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-green-400" /> {message}
        </div>
      )}
    </div>
  );
}

// --- 單字庫組件 (含批量管理與手機優化) ---
function VocabLibrary({ vocab, user, title, db, appId, categories, showToast }) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkActionTarget, setBulkActionTarget] = useState(null);

  const filtered = vocab
    .filter(v => (posFilter === 'all' || v.pos === posFilter))
    .filter(v => v.word?.toLowerCase().includes(search.toLowerCase()) || v.definition?.includes(search))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkAddCategory = async (catId) => {
    if (!catId) return;
    for (const id of selectedIds) {
      await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, id), {
        categoryIds: arrayUnion(catId)
      });
    }
    showToast(`已將 ${selectedIds.length} 個單字加入分類`);
    setSelectedIds([]);
    setIsBulkMode(false);
  };

  const toggleFav = async (e, item) => {
    e.stopPropagation();
    await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, item.id), { favorite: !item.favorite });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900">{title}</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => { setIsBulkMode(!isBulkMode); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${isBulkMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500'}`}
          >
            {isBulkMode ? '取消選取' : '批量管理'}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="搜尋單字..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'n.', 'v.', 'adj.', 'adv.', 'phr.'].map(p => (
          <button key={p} onClick={() => setPosFilter(p)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${posFilter === p ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
            {p === 'all' ? '全部' : p}
          </button>
        ))}
      </div>

      {isBulkMode && selectedIds.length > 0 && (
        <div className="sticky top-20 z-30 bg-indigo-900 text-white p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <span className="font-bold">已選取 {selectedIds.length} 個單字</span>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              className="flex-1 md:w-48 px-3 py-2 bg-indigo-800 text-white rounded-xl border border-indigo-700 outline-none text-sm font-bold"
              onChange={(e) => handleBulkAddCategory(e.target.value)}
              value=""
            >
              <option value="" disabled>加入分類至...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => setSelectedIds([])} className="p-2 hover:bg-indigo-800 rounded-xl"><X size={20}/></button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(item => (
          <div key={item.id} className={`group bg-white border rounded-3xl transition-all ${selectedIds.includes(item.id) ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-100 shadow-sm'}`}>
            <div className="p-4 md:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isBulkMode ? (
                  <button onClick={() => toggleSelect(item.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'}`}>
                    {selectedIds.includes(item.id) && <CheckCircle2 size={16} />}
                  </button>
                ) : (
                  <button onClick={(e) => toggleFav(e, item)} className="p-1"><Star className={`w-6 h-6 ${item.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} /></button>
                )}
                <div className="cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                  <h3 className="font-black text-lg md:text-xl text-slate-800">{item.word} <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{item.pos}</span></h3>
                  <p className="text-slate-500 text-sm font-medium">{item.definition}</p>
                </div>
              </div>
              {!isBulkMode && (
                <button onClick={async () => { if(window.confirm('確定刪除？')) await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, item.id)); }} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            {expandedId === item.id && (
              <div className="px-14 pb-5 pt-0">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm">
                   <p className="font-bold text-slate-700 mb-1">{item.exampleEng}</p>
                   <p className="text-slate-400">{item.exampleChn}</p>
                   {item.categoryIds?.length > 0 && (
                     <div className="mt-3 flex flex-wrap gap-1">
                       {item.categoryIds.map(cid => (
                         <span key={cid} className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full font-bold">#{categories.find(c => c.id === cid)?.name}</span>
                       ))}
                     </div>
                   )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 測驗組件 (四選一與範圍選擇) ---
function Quiz({ vocab, categories, db, user, appId }) {
  const [config, setConfig] = useState({ range: 'all', type: 'choice' });
  const [gameState, setGameState] = useState('config'); // 'config', 'playing', 'result'
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAns, setSelectedAns] = useState(null);

  const startQuiz = () => {
    let pool = [...vocab];
    if (config.range === 'fav') pool = pool.filter(v => v.favorite);
    else if (config.range !== 'all') pool = pool.filter(v => v.categoryIds?.includes(config.range));

    if (pool.length < 4) {
      alert('該範圍單字不足 (至少需要 4 個單字才能開始測驗)');
      return;
    }

    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 10);
    const qData = shuffled.map(q => {
      const wrongOptions = pool.filter(v => v.id !== q.id).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [q, ...wrongOptions].sort(() => Math.random() - 0.5);
      return { question: q, options };
    });

    setQuestions(qData);
    setCurrentIdx(0);
    setScore(0);
    setGameState('playing');
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
    }, 1200);
  };

  const toggleFav = async (item) => {
    await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, item.id), { favorite: !item.favorite });
  };

  if (gameState === 'config') return (
    <div className="max-w-md mx-auto py-10 space-y-8 animate-in zoom-in-95">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-slate-900">測驗模式</h2>
        <p className="text-slate-500 font-medium">挑戰你的單字記憶力</p>
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl space-y-6 border border-slate-50">
        <div className="space-y-3">
          <label className="text-sm font-black text-slate-800 flex items-center gap-2"><Layers size={18} className="text-indigo-600"/> 選擇範圍</label>
          <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={config.range} onChange={e => setConfig({...config, range: e.target.value})}>
            <option value="all">所有單字 ({vocab.length})</option>
            <option value="fav">收藏單字 ({vocab.filter(v=>v.favorite).length})</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({vocab.filter(v=>v.categoryIds?.includes(c.id)).length})</option>)}
          </select>
        </div>
        <button onClick={startQuiz} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
          開始測驗
        </button>
      </div>
    </div>
  );

  if (gameState === 'playing') {
    const q = questions[currentIdx];
    return (
      <div className="max-w-2xl mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center px-4">
          <div className="text-slate-400 font-black tracking-widest text-sm">PROGRESS {currentIdx + 1}/{questions.length}</div>
          <div className="text-indigo-600 font-black text-sm">SCORE: {score}</div>
        </div>
        
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl relative border border-slate-50 text-center space-y-4">
          <button onClick={() => toggleFav(q.question)} className="absolute top-8 right-8 p-2">
             <Star className={`w-8 h-8 ${q.question.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
          </button>
          <div className="text-indigo-600 font-black uppercase tracking-widest text-xs">{q.question.pos}</div>
          <h2 className="text-6xl font-black text-slate-900 break-words">{q.question.word}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {q.options.map(opt => (
            <button 
              key={opt.id}
              onClick={() => handleAnswer(opt.id)}
              className={`p-6 rounded-3xl font-bold text-lg text-left transition-all border-2 shadow-sm
                ${selectedAns === null ? 'bg-white border-white hover:border-indigo-600 hover:shadow-md' : 
                  opt.id === q.question.id ? 'bg-green-500 border-green-500 text-white scale-95 shadow-lg shadow-green-100' : 
                  selectedAns === opt.id ? 'bg-red-500 border-red-500 text-white scale-95' : 'bg-white border-white opacity-50'}`}
            >
              {opt.definition}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-10 text-center space-y-8">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl space-y-6">
        <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto text-white">
          <GraduationCap size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">測驗完成！</h2>
        <div className="text-6xl font-black text-indigo-600">{score * 10}<span className="text-2xl text-slate-300">/100</span></div>
        <p className="text-slate-500 font-bold">答對了 {score} 題 / 共 {questions.length} 題</p>
        <button onClick={() => setGameState('config')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all">
          回主頁面
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
    await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/categories`), {
      name: newCatName,
      createdAt: serverTimestamp()
    });
    setNewCatName('');
    showToast('分類已建立');
  };

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-black text-slate-900">分類管理</h2>
      <div className="flex gap-2">
        <input className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none shadow-sm focus:ring-2 focus:ring-indigo-500" placeholder="輸入新分類名稱..." value={newCatName} onChange={e => setNewCatName(e.target.value)} />
        <button onClick={addCategory} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"><Plus/></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group">
             <div className="flex items-center gap-4">
               <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Folder size={24}/></div>
               <div>
                 <p className="font-black text-slate-800">{cat.name}</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase">{vocab.filter(v=>v.categoryIds?.includes(cat.id)).length} WORDS</p>
               </div>
             </div>
             <button onClick={async () => { if(window.confirm('刪除分類？')) await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/categories`, cat.id)); }} className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 新增單字組件 (支援單字直接加分類 & 批量新格式) ---
function AddVocab({ user, showToast, db, appId, setActiveTab, categories }) {
  const [mode, setMode] = useState('single');
  const [formData, setFormData] = useState({ word: '', pos: 'n.', definition: '', exampleEng: '', exampleChn: '', targetCat: '' });
  const [bulkText, setBulkText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (mode === 'single') {
        const catIds = formData.targetCat ? [formData.targetCat] : [];
        await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/vocabulary`), {
          word: formData.word,
          pos: formData.pos,
          definition: formData.definition,
          exampleEng: formData.exampleEng,
          exampleChn: formData.exampleChn,
          favorite: false,
          categoryIds: catIds,
          createdAt: serverTimestamp()
        });
        showToast('新增成功');
        setActiveTab('library');
      } else {
        const lines = bulkText.split('\n').filter(l => l.trim() !== '');
        for (const line of lines) {
          // 格式：英文; 詞性; 中文; 例句; 例句翻譯; 分類名稱
          const parts = line.split(';').map(p => p.trim());
          if (parts.length >= 3) {
            let catIds = [];
            if (parts[5]) {
              let existingCat = categories.find(c => c.name === parts[5]);
              if (existingCat) {
                catIds = [existingCat.id];
              } else {
                const newCatRef = await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/categories`), {
                  name: parts[5], createdAt: serverTimestamp()
                });
                catIds = [newCatRef.id];
              }
            }
            await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/vocabulary`), {
              word: parts[0], pos: parts[1] || 'n.', definition: parts[2],
              exampleEng: parts[3] || '', exampleChn: parts[4] || '',
              favorite: false, categoryIds: catIds, createdAt: serverTimestamp()
            });
          }
        }
        showToast('批量新增成功');
        setActiveTab('library');
      }
    } catch (error) {
      console.error(error);
      showToast('操作失敗');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-900">{mode === 'single' ? '新增單字' : '批量匯入'}</h2>
        <div className="inline-flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <button onClick={() => setMode('single')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${mode === 'single' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>單一新增</button>
          <button onClick={() => setMode('bulk')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${mode === 'bulk' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>批量匯入</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl space-y-6 border border-slate-50">
        {mode === 'single' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-black text-slate-400 ml-2 uppercase">Word</label>
                <input required className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-200 transition-all" value={formData.word} onChange={e => setFormData({...formData, word: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 ml-2 uppercase">POS</label>
                <select className="w-full px-4 py-4 bg-slate-50 border border-transparent rounded-2xl outline-none" value={formData.pos} onChange={e => setFormData({...formData, pos: e.target.value})}>
                  {['n.', 'v.', 'adj.', 'adv.', 'phr.'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 ml-2 uppercase">Definition</label>
              <input required className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-200 transition-all" value={formData.definition} onChange={e => setFormData({...formData, definition: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-xs font-black text-slate-400 ml-2 uppercase">Example (EN)</label>
                 <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none" value={formData.exampleEng} onChange={e => setFormData({...formData, exampleEng: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-slate-400 ml-2 uppercase">Example (CH)</label>
                 <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none" value={formData.exampleChn} onChange={e => setFormData({...formData, exampleChn: e.target.value})} />
               </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 ml-2 uppercase flex items-center gap-1"><Tags size={12}/> 選擇分類 (非必填)</label>
              <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.targetCat} onChange={e => setFormData({...formData, targetCat: e.target.value})}>
                <option value="">不加入特定分類</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
              <AlertCircle className="text-indigo-500 shrink-0 mt-0.5" size={18} />
              <div className="text-[10px] md:text-xs">
                <p className="font-black text-indigo-700">批量格式：</p>
                <p className="text-indigo-600 mt-1 font-mono bg-white/50 p-2 rounded">英文; 詞性; 中文; 例句; 例句翻譯; 分類名稱</p>
              </div>
            </div>
            <textarea required rows="8" className="w-full px-6 py-4 bg-slate-50 rounded-3xl outline-none font-mono text-xs md:text-sm focus:ring-2 focus:ring-indigo-500" placeholder="apple; n.; 蘋果; I like apples.; 我喜歡蘋果; 水果" value={bulkText} onChange={e => setBulkText(e.target.value)} />
          </div>
        )}
        <button type="submit" disabled={isProcessing} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">
          {isProcessing ? '處理中...' : '儲存到雲端庫'}
        </button>
      </form>
    </div>
  );
}