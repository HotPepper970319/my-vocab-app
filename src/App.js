import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, GoogleAuthProvider, 
  signInWithPopup, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  BookOpen, Star, PlusCircle, GraduationCap, Search, 
  Trash2, CheckCircle2, LogOut, X, AlertCircle,
  Folder, Tags, Plus, Layers, Menu, 
  RotateCcw, ChevronLeft, ChevronRight, Play, FolderPlus, ArrowLeft
} from 'lucide-react';

// --- Firebase 配置 ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const appId = typeof __app_id !== 'undefined' ? __app_id : "my-vocab-app";

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubVocab = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'vocabulary')), (snap) => {
      setVocabList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));
    
    const unsubCat = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'categories')), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));
    
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

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-indigo-600 bg-slate-50">載入中...</div>;

  if (!user) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 max-w-sm w-full">
        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
          <GraduationCap className="text-white w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">學測單字雲</h1>
        <p className="text-slate-500 font-medium">個人化的英文單字學習助手</p>
        <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" /> 使用 Google 登入
        </button>
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
      {/* Sidebar */}
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
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-red-500 text-sm font-bold">
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

      <main className="flex-1 p-4 md:ml-64 md:p-10 max-w-5xl">
        {activeTab === 'library' && <VocabLibrary vocab={vocabList} user={user} title="所有單字" db={db} appId={appId} categories={categories} showToast={showToast} />}
        {activeTab === 'database' && <CategoryManager categories={categories} vocab={vocabList} user={user} db={db} appId={appId} showToast={showToast} />}
        {activeTab === 'fav' && <VocabLibrary vocab={vocabList.filter(v => v.favorite)} user={user} title="收藏單字" db={db} appId={appId} categories={categories} showToast={showToast} />}
        {activeTab === 'add' && <AddVocab user={user} showToast={showToast} db={db} appId={appId} setActiveTab={setActiveTab} categories={categories} />}
        {activeTab === 'quiz' && <Quiz vocab={vocabList} categories={categories} db={db} user={user} appId={appId} />}
      </main>

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-xs w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto"><LogOut size={32}/></div>
            <h3 className="text-xl font-black">確定要登出嗎？</h3>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-slate-100 rounded-2xl font-bold">取消</button>
              <button onClick={handleLogout} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold">確定登出</button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 font-bold text-sm">
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

// --- 單字庫組件 (新增詞性篩選功能) ---
function VocabLibrary({ vocab, user, title, db, appId, categories, showToast }) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [activeCatSelector, setActiveCatSelector] = useState(null);

  // 計算現有的詞性選項
  const posOptions = useMemo(() => {
    const poses = [...new Set(vocab.map(v => v.pos))].filter(Boolean);
    return ['all', ...poses];
  }, [vocab]);

  const filtered = vocab
    .filter(v => (posFilter === 'all' || v.pos === posFilter))
    .filter(v => v.word?.toLowerCase().includes(search.toLowerCase()) || v.definition?.includes(search))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleAddCategory = async (vId, catId) => {
    if (!catId) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', vId), {
      categoryIds: arrayUnion(catId)
    });
    showToast(`已成功加入分類`);
    setActiveCatSelector(null);
  };

  const toggleFav = async (e, item) => {
    e.stopPropagation();
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', item.id), { favorite: !item.favorite });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900">{title}</h2>
        <button onClick={() => { setIsBulkMode(!isBulkMode); setSelectedIds([]); }} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${isBulkMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500'}`}>
          {isBulkMode ? '取消選取' : '批量管理'}
        </button>
      </div>

      {/* 搜尋欄 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="搜尋單字..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* 詞性篩選按鈕列 (新功能 1) */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-black text-slate-400 uppercase mr-1">詞性篩選:</span>
        {posOptions.map(pos => (
          <button 
            key={pos} 
            onClick={() => setPosFilter(pos)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${posFilter === pos ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'}`}
          >
            {pos === 'all' ? '全部' : pos}
          </button>
        ))}
      </div>

      {isBulkMode && selectedIds.length > 0 && (
        <div className="sticky top-20 z-30 bg-indigo-900 text-white p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl">
          <span className="font-bold">已選取 {selectedIds.length} 個單字</span>
          <select className="flex-1 md:w-48 px-3 py-2 bg-indigo-800 text-white rounded-xl border border-indigo-700 text-sm font-bold" onChange={async (e) => {
            const catId = e.target.value;
            for (const id of selectedIds) {
              await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', id), { categoryIds: arrayUnion(catId) });
            }
            showToast('批量加入成功');
            setSelectedIds([]);
            setIsBulkMode(false);
          }} value="">
            <option value="" disabled>加入分類至...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(item => (
          <div key={item.id} className={`bg-white border rounded-3xl transition-all ${selectedIds.includes(item.id) ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-100 shadow-sm'} overflow-hidden`}>
            <div className="relative flex items-center justify-between gap-3 px-4 py-4 md:px-5 md:py-5 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <div className="flex items-center gap-3">
                {isBulkMode ? (
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${selectedIds.includes(item.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'}`}>
                    {selectedIds.includes(item.id) && <CheckCircle2 size={16} />}
                  </button>
                ) : (
                  <button onClick={(e) => toggleFav(e, item)} className="p-1 relative z-10"><Star className={`w-6 h-6 ${item.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} /></button>
                )}
                <div>
                  <h3 className="font-black text-lg text-slate-800">{item.word} <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded uppercase font-bold">{item.pos}</span></h3>
                  <p className="text-slate-500 text-sm truncate max-w-[200px] sm:max-w-md">{item.definition}</p>
                </div>
              </div>

              {!isBulkMode && (
                <div className="flex items-center gap-2 relative z-10">
                  {activeCatSelector === item.id ? (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <select autoFocus className="text-xs bg-transparent border-none outline-none font-bold text-slate-600 px-1" onChange={(e) => handleAddCategory(item.id, e.target.value)} onBlur={() => setActiveCatSelector(null)} value="">
                         <option value="" disabled>分類</option>
                         {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button onClick={(e) => { e.stopPropagation(); setActiveCatSelector(null); }} className="text-slate-400"><X size={14}/></button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setActiveCatSelector(item.id); }} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="加入分類"><FolderPlus size={18} /></button>
                  )}
                  <button onClick={async (e) => { e.stopPropagation(); if(window.confirm('確定刪除？')) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', item.id)); }} className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                </div>
              )}
            </div>
            {expandedId === item.id && (
              <div className="px-5 pb-5 md:px-14">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="font-bold text-slate-700 leading-relaxed">{item.exampleEng}</p>
                   <p className="text-slate-400 text-sm mt-1">{item.exampleChn}</p>
                   <div className="mt-3 flex flex-wrap gap-1">
                     {item.categoryIds?.map(cid => (
                       <span key={cid} className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full font-bold">#{categories.find(c => c.id === cid)?.name || '未命名'}</span>
                     ))}
                   </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 測驗組件 (新功能 2: 移除選項中的詞性) ---
function Quiz({ vocab, categories, db, user, appId }) {
  const [config, setConfig] = useState({ range: 'all', type: 'choice', limit: '10' });
  const [gameState, setGameState] = useState('config'); // config, playing_choice, playing_card, result
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAns, setSelectedAns] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const startMode = () => {
    let pool = [...vocab];
    if (config.range === 'fav') pool = pool.filter(v => v.favorite);
    else if (config.range !== 'all') pool = pool.filter(v => v.categoryIds?.includes(config.range));

    if (pool.length < (config.type === 'choice' ? 4 : 1)) {
      alert(config.type === 'choice' ? '該範圍單字量不足 (至少需 4 個)' : '該範圍目前沒有單字');
      return;
    }

    let shuffled = pool.sort(() => Math.random() - 0.5);
    if (config.limit !== 'all') {
      shuffled = shuffled.slice(0, parseInt(config.limit));
    }

    if (config.type === 'choice') {
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

  if (gameState === 'config') return (
    <div className="max-w-md mx-auto py-10 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-slate-900">學習模式</h2>
        <p className="text-slate-500 font-medium">挑戰你的單字記憶</p>
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">學習方式</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfig({...config, type:'choice'})} className={`p-4 rounded-2xl border-2 font-bold transition-all ${config.type==='choice' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 hover:border-slate-200'}`}>四選一測驗</button>
              <button onClick={() => setConfig({...config, type:'card'})} className={`p-4 rounded-2xl border-2 font-bold transition-all ${config.type==='card' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 hover:border-slate-200'}`}>翻卡練習</button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">選擇範圍</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-none" value={config.range} onChange={e => setConfig({...config, range: e.target.value})}>
              <option value="all">所有單字 ({vocab.length})</option>
              <option value="fav">收藏單字 ({vocab.filter(v=>v.favorite).length})</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({vocab.filter(v=>v.categoryIds?.includes(c.id)).length})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">測驗題數</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-none" value={config.limit} onChange={e => setConfig({...config, limit: e.target.value})}>
              <option value="10">10 題</option>
              <option value="20">20 題</option>
              <option value="50">50 題</option>
              <option value="all">全部單字</option>
            </select>
          </div>
        </div>
        <button onClick={startMode} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all">
          開始學習
        </button>
      </div>
    </div>
  );

  if (gameState === 'playing_choice') {
    const q = questions[currentIdx];
    return (
      <div className="max-w-2xl mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center px-4">
          <button onClick={()=>setGameState('config')} className="text-slate-400 font-bold flex items-center gap-1 hover:text-indigo-600 transition-colors"><ChevronLeft size={16}/> 退出</button>
          <div className="text-indigo-600 font-black">進度 {currentIdx + 1} / {questions.length}</div>
        </div>
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl relative border border-slate-50 text-center flex flex-col items-center justify-center min-h-[280px] gap-2">
          <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">{q.question.pos}</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 break-all">{q.question.word}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {q.options.map(opt => (
            <button key={opt.id} onClick={() => handleAnswer(opt.id)} className={`p-6 rounded-3xl font-bold text-lg text-left transition-all border-2 shadow-sm
              ${selectedAns === null ? 'bg-white border-white hover:border-indigo-600 hover:shadow-md' : 
                opt.id === q.question.id ? 'bg-green-500 border-green-500 text-white' : 
                selectedAns === opt.id ? 'bg-red-500 border-red-500 text-white' : 'bg-white opacity-50'}`}>
              {/* 此處已移除 opt.pos 的顯示 */}
              {opt.definition}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 翻卡與結果頁面保持原樣...
  if (gameState === 'playing_card') {
    const q = questions[currentIdx];
    return (
      <div className="max-w-xl mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center px-4">
          <button onClick={()=>setGameState('config')} className="text-slate-400 font-bold flex items-center gap-1 hover:text-indigo-600 transition-colors"><ChevronLeft size={16}/> 退出</button>
          <div className="text-indigo-600 font-black">{currentIdx + 1} / {questions.length}</div>
        </div>
        <div className="perspective-1000 h-[400px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
             <div className="absolute inset-0 backface-hidden bg-white border border-slate-100 rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center p-8 space-y-4">
               <span className="text-indigo-600 font-black uppercase text-xs tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{q.question.pos}</span>
               <h2 className="text-4xl md:text-5xl font-black text-slate-900 break-all">{q.question.word}</h2>
               <p className="text-slate-400 font-bold animate-pulse mt-8">點擊翻轉查看解釋</p>
             </div>
             <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 text-white rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center p-10 text-center space-y-6 overflow-hidden">
               <h2 className="text-3xl md:text-4xl font-black">{q.question.definition}</h2>
               <div className="w-12 h-1 bg-white/20 rounded-full"></div>
               <div className="space-y-3 max-w-sm">
                 <p className="text-indigo-50 font-bold italic leading-relaxed text-sm">"{q.question.exampleEng}"</p>
                 <p className="text-indigo-200/80 text-xs font-medium">{q.question.exampleChn}</p>
               </div>
             </div>
          </div>
        </div>
        <div className="flex justify-center gap-4">
           <button disabled={currentIdx === 0} onClick={() => { setCurrentIdx(currentIdx-1); setIsFlipped(false); }} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 disabled:opacity-30"><ChevronLeft/></button>
           <button onClick={() => { if(currentIdx+1 < questions.length) { setCurrentIdx(currentIdx+1); setIsFlipped(false); } else { setGameState('result'); } }} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg"><ChevronRight/></button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-10 text-center">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl space-y-6 border border-slate-50">
        <h2 className="text-3xl font-black text-slate-800">學習完成！</h2>
        {config.type === 'choice' && (
          <div className="text-6xl font-black text-indigo-600 mb-4">{Math.round((score/questions.length)*100)}%</div>
        )}
        <p className="text-slate-500 font-bold text-lg">{config.type === 'choice' ? `答對了 ${score} / ${questions.length} 題` : `複習完畢！共看了 ${questions.length} 個單字`}</p>
        <button onClick={() => setGameState('config')} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-colors">回學習首頁</button>
      </div>
    </div>
  );
}

// --- 分類管理組件 (修復查看單字 Bug) ---
function CategoryManager({ categories, vocab, user, db, appId, showToast }) {
  const [newCatName, setNewCatName] = useState('');
  const [viewingCategory, setViewingCategory] = useState(null); // 當前查看的分類對象

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'categories'), { name: newCatName, createdAt: serverTimestamp() });
    setNewCatName('');
    showToast('分類已建立');
  };

  // 如果正在查看特定分類下的單字
  if (viewingCategory) {
    const categoryWords = vocab.filter(v => v.categoryIds?.includes(viewingCategory.id));
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setViewingCategory(null)} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900">{viewingCategory.name}</h2>
            <p className="text-sm text-slate-400 font-bold">{categoryWords.length} 個單字</p>
          </div>
        </div>

        {categoryWords.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] text-center border border-slate-100 shadow-sm text-slate-400 font-bold">
            此分類目前沒有單字
          </div>
        ) : (
          <div className="grid gap-3">
            {categoryWords.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
                <div>
                  <h4 className="font-bold text-slate-800">{item.word}</h4>
                  <p className="text-sm text-slate-500">{item.definition}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={async () => {
                    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', item.id), {
                      categoryIds: arrayRemove(viewingCategory.id)
                    });
                    showToast('已從分類中移除');
                  }} className="p-2 text-slate-400 hover:text-orange-500" title="移出分類"><X size={18} /></button>
                  <button onClick={async () => {
                    if(window.confirm('確定徹底刪除單字？')) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', item.id));
                  }} className="p-2 text-slate-200 hover:text-red-500" title="徹底刪除"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-black text-slate-900">分類管理</h2>
      <div className="flex gap-2">
        <input className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="輸入新分類名稱..." value={newCatName} onChange={e => setNewCatName(e.target.value)} />
        <button onClick={addCategory} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors"><Plus/></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div 
            key={cat.id} 
            onClick={() => setViewingCategory(cat)}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer"
          >
             <div className="flex items-center gap-4">
               <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Folder size={24}/></div>
               <div>
                 <p className="font-black text-slate-800">{cat.name}</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase">{vocab.filter(v=>v.categoryIds?.includes(cat.id)).length} WORDS</p>
               </div>
             </div>
             <button onClick={async (e) => { 
               e.stopPropagation(); 
               if(window.confirm('確定刪除此分類？(分類內的單字不會被刪除)')) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'categories', cat.id)); 
             }} className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2"><Trash2 size={18}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 新增單字組件 ---
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
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'vocabulary'), {
          ...formData,
          categoryIds: formData.targetCat ? [formData.targetCat] : [],
          favorite: false,
          createdAt: serverTimestamp()
        });
        showToast('新增成功');
      } else {
        const lines = bulkText.split('\n').filter(l => l.trim() !== '');
        for (const line of lines) {
          const p = line.split(';').map(s => s.trim());
          if (p.length >= 3) {
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'vocabulary'), {
              word: p[0], pos: p[1]||'n.', definition: p[2], exampleEng: p[3]||'', exampleChn: p[4]||'',
              favorite: false, categoryIds: [], createdAt: serverTimestamp()
            });
          }
        }
        showToast('批量新增成功');
      }
      setActiveTab('library');
    } catch (error) { 
      console.error(error);
      showToast('發生錯誤'); 
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-900">{mode === 'single' ? '新增單字' : '批量匯入'}</h2>
        <div className="inline-flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          <button onClick={() => setMode('single')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${mode === 'single' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>手動新增</button>
          <button onClick={() => setMode('bulk')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${mode === 'bulk' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>批量匯入</button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50">
        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'single' ? (
            <>
              <div className="grid grid-cols-4 gap-3">
                 <div className="col-span-3 space-y-1">
                   <label className="text-xs font-black text-slate-400 ml-2">英文單字</label>
                   <input required className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" value={formData.word} onChange={e=>setFormData({...formData, word: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-black text-slate-400 ml-2">詞性</label>
                   <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold appearance-none text-center" value={formData.pos} onChange={e=>setFormData({...formData, pos: e.target.value})}>
                     {['n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.', 'phr.'].map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                 </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 ml-2">中文定義</label>
                <input required className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" value={formData.definition} onChange={e=>setFormData({...formData, definition: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 ml-2">英文例句 (選填)</label>
                <textarea className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium h-24 resize-none" value={formData.exampleEng} onChange={e=>setFormData({...formData, exampleEng: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 ml-2">例句中文翻譯 (選填)</label>
                <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" value={formData.exampleChn} onChange={e=>setFormData({...formData, exampleChn: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 ml-2">預設分類 (選填)</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={formData.targetCat} onChange={e => setFormData({...formData, targetCat: e.target.value})}>
                  <option value="">無分類</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </>
          ) : (
            <div className="space-y-4">
               <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-700 text-xs font-bold leading-relaxed">
                 格式說明：單字 ; 詞性 ; 中文 ; 英文例句 ; 例句翻譯<br/>
                 範例：Apple ; n. ; 蘋果 ; I like apple. ; 我喜歡蘋果
               </div>
               <textarea required className="w-full h-64 p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm resize-none" placeholder="輸入多筆單字..." value={bulkText} onChange={e=>setBulkText(e.target.value)} />
            </div>
          )}
          <button disabled={isProcessing} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50">
            {isProcessing ? '處理中...' : '儲存單字'}
          </button>
        </form>
      </div>
    </div>
  );
}