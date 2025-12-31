import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, GoogleAuthProvider, 
  signInWithPopup, signOut, signInAnonymously 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  BookOpen, Star, PlusCircle, GraduationCap, Search, 
  Trash2, CheckCircle2, LogOut, X, 
  Folder, Tags, Plus, Menu, 
  ChevronLeft, ChevronRight, FolderPlus, ArrowLeft, Layers
} from 'lucide-react';

// --- Firebase 配置 ---
// 注意：在實際部署時，請確保這些環境變數已正確設置
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// 為了讓 Canvas 預覽能運作，我們使用一個模擬的標記
// 在真實環境中，你會檢查 firebaseConfig 是否有效
const isConfigured = true; // 這裡強制設為 true 以顯示 UI (實際連線會因為沒有 Key 而失敗，但 UI 可見)

// 初始化 Firebase (在 Canvas 環境中我們會做錯誤處理以防崩潰)
let app, auth, db, googleProvider;
try {
    // 這裡我們嘗試初始化，如果沒有設定環境變數，這部分在真實 React App 會報錯
    // 但為了展示 UI，我們在下方 useEffect 做了一些處理
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();
    }
} catch (e) {
    console.log("Firebase config missing or invalid, running in UI demo mode.");
}

// 模擬數據 (當沒有 Firebase 連線時使用)
const MOCK_VOCAB = [
  { id: '1', word: 'Abandon', pos: 'v.', definition: '放棄；拋棄', exampleEng: 'He abandoned his car in the snow.', exampleChn: '他把車棄置在雪地裡。', categoryIds: ['c1'], favorite: false, createdAt: { seconds: 1700000000 } },
  { id: '2', word: 'Benefit', pos: 'n.', definition: '好處；利益', exampleEng: 'The discovery will be of great benefit to science.', exampleChn: '這項發現將對科學大有裨益。', categoryIds: ['c2'], favorite: true, createdAt: { seconds: 1700000100 } },
  { id: '3', word: 'Calculate', pos: 'v.', definition: '計算；估算', exampleEng: 'We haven\'t calculated the cost of the new building yet.', exampleChn: '我們還沒有計算新大樓的成本。', categoryIds: [], favorite: false, createdAt: { seconds: 1700000200 } },
  { id: '4', word: 'Dazzling', pos: 'adj.', definition: '令人眼花繚亂的', exampleEng: 'a dazzling smile', exampleChn: '燦爛的笑容', categoryIds: ['c1'], favorite: true, createdAt: { seconds: 1700000300 } },
  { id: '5', word: 'Economy', pos: 'n.', definition: '經濟', exampleEng: 'The economy is in recession.', exampleChn: '經濟正處於衰退之中。', categoryIds: ['c2'], favorite: false, createdAt: { seconds: 1700000400 } },
];

const MOCK_CATS = [
  { id: 'c1', name: 'Level 4 單字', createdAt: { seconds: 1600000000 } },
  { id: 'c2', name: '商業英文', createdAt: { seconds: 1600000100 } },
];

export default function App() {
  // 若是 Canvas 預覽環境，預設給予一個模擬使用者
  const [user, setUser] = useState(auth ? null : { uid: 'demo-user', displayName: '同學 A', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' });
  const [activeTab, setActiveTab] = useState('library');
  const [vocabList, setVocabList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const appId = "my-vocab-app";

  // 監聽 Auth 狀態
  useEffect(() => {
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsubscribe();
    } else {
        // 模擬載入
        setTimeout(() => {
            setVocabList(MOCK_VOCAB);
            setCategories(MOCK_CATS);
            setLoading(false);
        }, 800);
    }
  }, []);

  // 監聽 Firestore 數據
  useEffect(() => {
    if (!user || !db) return;
    
    // 這裡使用 try-catch 是因為在沒有正確 key 的情況下 onSnapshot 會報錯
    try {
        const unsubVocab = onSnapshot(query(collection(db, `artifacts/${appId}/users/${user.uid}/vocabulary`)), (snap) => {
            setVocabList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.log("Firestore vocab error (expected in demo):", error));

        const unsubCat = onSnapshot(query(collection(db, `artifacts/${appId}/users/${user.uid}/categories`)), (snap) => {
            setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.log("Firestore cat error (expected in demo):", error));

        return () => { unsubVocab(); unsubCat(); };
    } catch (e) {
        console.log("Firestore not initialized");
    }
  }, [user]);

  // UI Helper functions
  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    else setUser(null); // Demo mode logout
    setShowLogoutConfirm(false);
  };

  const handleLogin = async () => {
      if (auth) await signInWithPopup(auth, googleProvider);
      else setUser({ uid: 'demo-user', displayName: '同學 A', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }); // Demo mode login
  }

  // --- 模擬數據操作 (僅用於 Demo 模式，因為沒有真實 DB 連線) ---
  const mockAddVocab = (data) => {
      const newV = { ...data, id: Date.now().toString(), createdAt: { seconds: Date.now()/1000 } };
      setVocabList(prev => [newV, ...prev]);
      showToast('新增成功 (Demo)');
  }
  const mockDeleteVocab = (id) => {
      setVocabList(prev => prev.filter(v => v.id !== id));
      showToast('刪除成功 (Demo)');
  }
  const mockToggleFav = (id) => {
      setVocabList(prev => prev.map(v => v.id === id ? { ...v, favorite: !v.favorite } : v));
  }
  const mockAddCategory = (name) => {
      setCategories(prev => [...prev, { id: Date.now().toString(), name, createdAt: { seconds: Date.now()/1000 } }]);
      showToast('分類建立成功 (Demo)');
  }

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-violet-600 animate-pulse">載入中...</div>;

  if (!user) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 max-w-sm w-full">
        <div className="bg-violet-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-violet-200">
            <GraduationCap className="text-white w-10 h-10" />
        </div>
        <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">英文單字雲</h1>
            <p className="text-slate-400 font-medium mt-2">個人化的英文單字學習助手</p>
        </div>
        <button onClick={handleLogin} className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm group">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="G" /> 
          使用 Google 登入
        </button>
        <div className="pt-4 text-slate-300 text-xs font-mono">v1.1.0</div>
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
      <aside className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-2xl md:shadow-none`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-2 rounded-xl shadow-lg shadow-violet-200"><GraduationCap className="text-white w-6 h-6" /></div>
            <h1 className="font-bold text-xl text-slate-800 tracking-tight">單字雲</h1>
          </div>
          <button className="md:hidden text-slate-400 hover:text-slate-600" onClick={() => setIsSidebarOpen(false)}><X size={24}/></button>
        </div>
        <nav className="flex-1 px-4 space-y-2 py-4">
          {navigation.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${activeTab === item.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 scale-100' : 'text-slate-500 hover:bg-slate-50 hover:scale-[1.02]'}`}>
              {React.cloneElement(item.icon, { size: 20, strokeWidth: 2.5 })} <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100 space-y-2">
          {/* 版本顯示改到這裡 */}
          <div className="px-1 text-xs font-bold text-slate-300 font-mono text-center mb-1">v1.1.0</div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl truncate border border-slate-100">
             <img src={user.photoURL} className="w-8 h-8 rounded-full shadow-sm bg-white" alt="avt" />
             <div className="flex flex-col truncate">
                <span className="text-xs font-black text-slate-700 truncate">{user.displayName}</span>
             </div>
          </div>
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all text-xs font-bold">
            <LogOut size={14} /> 登出帳號
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-violet-600 p-1.5 rounded-lg"><GraduationCap className="text-white w-5 h-5" /></div>
          <span className="font-black text-slate-800 tracking-tight">學測單字雲</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-xl text-slate-600 active:scale-95 transition-transform"><Menu size={20}/></button>
      </div>

      <main className="flex-1 p-4 md:ml-64 md:p-10 max-w-6xl w-full mx-auto">
        {activeTab === 'library' && <VocabLibrary vocab={vocabList} user={user} title="所有單字" db={db} appId={appId} categories={categories} showToast={showToast} mockDelete={mockDeleteVocab} mockToggleFav={mockToggleFav} />}
        {activeTab === 'database' && <CategoryManager categories={categories} vocab={vocabList} user={user} db={db} appId={appId} showToast={showToast} mockAdd={mockAddCategory} mockDelete={mockDeleteVocab} mockToggleFav={mockToggleFav} />}
        {activeTab === 'fav' && <VocabLibrary vocab={vocabList.filter(v => v.favorite)} user={user} title="收藏單字" db={db} appId={appId} categories={categories} showToast={showToast} mockDelete={mockDeleteVocab} mockToggleFav={mockToggleFav} />}
        {activeTab === 'add' && <AddVocab user={user} showToast={showToast} db={db} appId={appId} setActiveTab={setActiveTab} categories={categories} mockAdd={mockAddVocab} />}
        {activeTab === 'quiz' && <Quiz vocab={vocabList} categories={categories} db={db} user={user} appId={appId} mockToggleFav={mockToggleFav} />}
      </main>

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-xs w-full text-center space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><LogOut size={32}/></div>
            <div>
                <h3 className="text-xl font-black text-slate-800">確定要登出嗎？</h3>
                <p className="text-slate-400 text-sm mt-2">登出後需要重新登入才能存取您的單字庫。</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">取消</button>
              <button onClick={handleLogout} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 shadow-lg shadow-red-200 transition-colors">登出</button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur text-white pl-4 pr-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 font-bold text-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
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
function VocabLibrary({ vocab, user, title, db, appId, categories, showToast, mockDelete, mockToggleFav }) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [activeCatSelector, setActiveCatSelector] = useState(null);

  const filtered = vocab
    .filter(v => (posFilter === 'all' || v.pos === posFilter))
    .filter(v => v.word?.toLowerCase().includes(search.toLowerCase()) || v.definition?.includes(search))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleAddCategory = async (vId, catId) => {
    if (!catId) return;
    if (db) {
        await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, vId), {
            categoryIds: arrayUnion(catId)
        });
    }
    showToast(`已成功加入分類`);
    setActiveCatSelector(null);
  };

  const handleBulkAddCategory = async (catId) => {
    if (!catId) return;
    if (db) {
        for (const id of selectedIds) {
            await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, id), {
                categoryIds: arrayUnion(catId)
            });
        }
    }
    showToast(`已將 ${selectedIds.length} 個單字加入分類`);
    setSelectedIds([]);
    setIsBulkMode(false);
  };

  const toggleFav = async (e, item) => {
    e.stopPropagation();
    if(db) await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, item.id), { favorite: !item.favorite });
    else mockToggleFav(item.id);
  };

  const handleDelete = async (e, id) => {
      e.stopPropagation();
      if(window.confirm('確定刪除？')) {
          if (db) await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, id));
          else mockDelete(id);
      }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">{title}</h2>
            <p className="text-slate-400 font-bold mt-1 text-sm">共 {filtered.length} 個單字</p>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
        <input type="text" placeholder="搜尋單字、定義..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-700 placeholder:text-slate-300" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['all', 'n.', 'v.', 'adj.', 'adv.', 'phr.', 'conj.', 'prep.', '其他'].map(p => (
              <button key={p} onClick={()=>setPosFilter(p)} className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${posFilter===p ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'}`}>
                  {p === 'all' ? '全部' : p}
              </button>
          ))}
      </div>

      {isBulkMode && selectedIds.length > 0 && (
        <div className="sticky top-4 z-30 bg-slate-800 text-white p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl animate-in slide-in-from-top-5">
          <span className="font-bold flex items-center gap-2"><CheckCircle2 className="text-green-400"/> 已選取 {selectedIds.length} 個單字</span>
          <div className="flex gap-2 w-full md:w-auto">
            <select className="flex-1 md:w-48 px-3 py-2 bg-slate-700 text-white rounded-xl border border-slate-600 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-500" onChange={(e) => handleBulkAddCategory(e.target.value)} value="">
              <option value="" disabled>加入分類至...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* 浮動批量管理按鈕 */}
      <button 
        onClick={() => { setIsBulkMode(!isBulkMode); setSelectedIds([]); }} 
        className={`fixed bottom-8 right-8 z-40 px-6 py-4 rounded-full font-black text-sm shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2 ${isBulkMode ? 'bg-violet-600 text-white shadow-violet-300 ring-4 ring-violet-100' : 'bg-white text-slate-700 border border-slate-200'}`}
      >
        {isBulkMode ? <X size={20}/> : <Layers size={20}/>}
        {isBulkMode ? '取消選取' : '批量管理'}
      </button>

      <div className="grid gap-3">
        {filtered.length === 0 && <div className="text-center py-20 text-slate-300 font-bold">沒有找到相關單字</div>}
        {filtered.map(item => (
          <div key={item.id} className={`bg-white border rounded-[1.5rem] transition-all duration-300 ${selectedIds.includes(item.id) ? 'border-violet-600 ring-2 ring-violet-100 bg-violet-50/10' : 'border-slate-100 shadow-sm hover:shadow-md hover:border-violet-100'} overflow-hidden`}>
            <div className="relative flex items-center justify-between gap-3 px-4 py-4 md:px-6 md:py-5 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {isBulkMode ? (
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-200 hover:border-violet-400'}`}>
                    {selectedIds.includes(item.id) && <CheckCircle2 size={14} />}
                  </button>
                ) : (
                  <button onClick={(e) => toggleFav(e, item)} className="p-1 relative z-10 group"><Star className={`w-6 h-6 transition-all ${item.favorite ? 'fill-yellow-400 text-yellow-400 scale-110' : 'text-slate-200 group-hover:text-yellow-400'}`} /></button>
                )}
                <div className="pointer-events-none flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-black text-xl text-slate-800 truncate">{item.word}</h3>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wide">{item.pos}</span>
                  </div>
                  <p className="text-slate-500 text-sm truncate w-full">{item.definition}</p>
                </div>
              </div>

              {!isBulkMode && (
                <div className="flex items-center gap-1 relative z-10 pl-2">
                  {activeCatSelector === item.id ? (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl animate-in zoom-in duration-200">
                      <select autoFocus className="text-xs bg-transparent border-none outline-none font-bold text-slate-600 px-1 w-20" onChange={(e) => handleAddCategory(item.id, e.target.value)} onBlur={() => setActiveCatSelector(null)} value="">
                          <option value="" disabled>分類</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button onClick={(e) => { e.stopPropagation(); setActiveCatSelector(null); }} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setActiveCatSelector(item.id); }} className="p-2 text-slate-300 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all" title="加入分類"><FolderPlus size={18} /></button>
                  )}
                  <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                </div>
              )}
            </div>
            {expandedId === item.id && (
              <div className="px-5 pb-5 md:px-14">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/50">
                   <div className="flex gap-3 items-start">
                       <div className="w-1 h-full bg-violet-200 rounded-full min-h-[40px]"></div>
                       <div>
                           <p className="font-bold text-slate-700 leading-relaxed text-lg">"{item.exampleEng}"</p>
                           <p className="text-slate-400 text-sm mt-1">{item.exampleChn}</p>
                       </div>
                   </div>
                   <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                     {item.categoryIds?.length > 0 ? item.categoryIds.map(cid => (
                       <span key={cid} className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                           <Folder size={10} /> {categories.find(c => c.id === cid)?.name || '未命名'}
                       </span>
                     )) : <span className="text-[10px] text-slate-300 italic">未分類</span>}
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

// --- 測驗與練習組件 ---
function Quiz({ vocab, categories, db, user, appId, mockToggleFav }) {
  const [config, setConfig] = useState({ range: 'all', type: 'choice', limit: '10' });
  const [gameState, setGameState] = useState('config'); // config, playing_choice, playing_card, result
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAns, setSelectedAns] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  // 新增：儲存答題結果
  const [results, setResults] = useState([]); 

  const startMode = () => {
    let pool = [...vocab];
    if (config.range === 'fav') pool = pool.filter(v => v.favorite);
    else if (config.range !== 'all') pool = pool.filter(v => v.categoryIds?.includes(config.range));

    if (pool.length < 1) {
      alert('該範圍目前沒有單字，請先新增單字或更換範圍。');
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
    setResults([]); // 重置答題紀錄
  };

  const handleAnswer = (optionId) => {
    if (selectedAns !== null) return;
    setSelectedAns(optionId);
    
    // 判斷是否正確
    const isCorrect = optionId === questions[currentIdx].question.id;
    if (isCorrect) setScore(score + 1);
    
    // 儲存結果
    setResults(prev => [...prev, isCorrect]);

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
    // 立即更新本地 UI 狀態
    setQuestions(prev => prev.map(q => 
        q.question.id === item.id 
        ? { ...q, question: { ...q.question, favorite: !q.question.favorite } } 
        : q
    ));
    // 更新資料庫
    if (db) await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, item.id), { favorite: !item.favorite });
    else mockToggleFav(item.id);
  };

  if (gameState === 'config') return (
    <div className="max-w-md mx-auto py-10 space-y-8 animate-in fade-in slide-in-from-bottom-5">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-slate-900">學習模式</h2>
        <p className="text-slate-500 font-medium">選擇適合你的練習方式</p>
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">學習方式</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfig({...config, type:'choice'})} className={`p-4 rounded-2xl border-2 font-bold transition-all ${config.type==='choice' ? 'border-violet-600 bg-violet-50 text-violet-600 shadow-md' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                  <div className="flex flex-col items-center gap-1">
                      <CheckCircle2 size={24}/>
                      <span>四選一測驗</span>
                  </div>
              </button>
              <button onClick={() => setConfig({...config, type:'card'})} className={`p-4 rounded-2xl border-2 font-bold transition-all ${config.type==='card' ? 'border-violet-600 bg-violet-50 text-violet-600 shadow-md' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                 <div className="flex flex-col items-center gap-1">
                      <BookOpen size={24}/>
                      <span>翻卡練習</span>
                  </div>
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">選擇範圍</label>
            <div className="relative">
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100 appearance-none text-slate-700" value={config.range} onChange={e => setConfig({...config, range: e.target.value})}>
                <option value="all">所有單字 ({vocab.length})</option>
                <option value="fav">收藏單字 ({vocab.filter(v=>v.favorite).length})</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({vocab.filter(v=>v.categoryIds?.includes(c.id)).length})</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronRight className="rotate-90" size={16}/></div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">測驗題數</label>
            <div className="relative">
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100 appearance-none text-slate-700" value={config.limit} onChange={e => setConfig({...config, limit: e.target.value})}>
                <option value="10">10 題</option>
                <option value="20">20 題</option>
                <option value="50">50 題</option>
                <option value="all">該範圍全部單字</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronRight className="rotate-90" size={16}/></div>
            </div>
          </div>
        </div>
        <button onClick={startMode} className="w-full py-5 bg-violet-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-violet-200 hover:bg-violet-700 hover:scale-[1.02] active:scale-95 transition-all">
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
          <button onClick={()=>setGameState('config')} className="text-slate-400 font-bold flex items-center gap-1 hover:text-slate-600"><ChevronLeft size={16}/> 退出</button>
          <div className="text-violet-600 font-black bg-violet-50 px-3 py-1 rounded-full text-xs">進度 {currentIdx + 1} / {questions.length}</div>
        </div>
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 relative border border-slate-50 text-center flex flex-col items-center justify-center min-h-[280px] gap-4">
          <button onClick={() => toggleFav(q.question)} className="absolute top-8 right-8 p-2 group">
             <Star className={`w-8 h-8 transition-all ${q.question.favorite ? 'fill-yellow-400 text-yellow-400 scale-110' : 'text-slate-200 group-hover:text-yellow-400'}`} />
          </button>
          <span className="text-xs font-black text-violet-500 bg-violet-50 px-3 py-1 rounded-full uppercase tracking-widest">{q.question.pos}</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 break-all">{q.question.word}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {q.options.map(opt => (
            <button key={opt.id} onClick={() => handleAnswer(opt.id)} className={`p-6 rounded-3xl font-bold text-lg text-left transition-all border-2 shadow-sm relative overflow-hidden
              ${selectedAns === null ? 'bg-white border-white hover:border-violet-600 hover:shadow-lg' : 
                opt.id === q.question.id ? 'bg-green-500 border-green-500 text-white' : 
                selectedAns === opt.id ? 'bg-red-500 border-red-500 text-white' : 'bg-white opacity-40'}`}>
               {opt.definition}
              {selectedAns === opt.id && selectedAns !== q.question.id && <X className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50" />}
              {selectedAns !== null && opt.id === q.question.id && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameState === 'playing_card') {
    const q = questions[currentIdx];
    return (
      <div className="max-w-xl mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center px-4">
          <button onClick={()=>setGameState('config')} className="text-slate-400 font-bold flex items-center gap-1 hover:text-slate-600"><ChevronLeft size={16}/> 退出</button>
          <div className="text-violet-600 font-black bg-violet-50 px-3 py-1 rounded-full text-xs">{currentIdx + 1} / {questions.length}</div>
        </div>
        <div className="perspective-1000 h-[450px] cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
             {/* Front: 顯示英文及詞性 */}
             <div className="absolute inset-0 backface-hidden bg-white border border-slate-100 rounded-[3.5rem] shadow-2xl shadow-violet-100 flex flex-col items-center justify-center p-8 space-y-6">
               <span className="text-violet-600 font-black uppercase text-xs tracking-widest bg-violet-50 px-3 py-1 rounded-full">{q.question.pos}</span>
               <h2 className="text-4xl md:text-5xl font-black text-slate-900 break-all text-center">{q.question.word}</h2>
               <div className="mt-8 flex flex-col items-center gap-2">
                 <p className="text-slate-300 font-bold text-xs uppercase tracking-widest">TAP TO FLIP</p>
                 <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce"></div>
               </div>
             </div>
             {/* Back: 顯示中文和例句 */}
             <div className="absolute inset-0 backface-hidden rotate-y-180 bg-violet-600 text-white rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center p-10 text-center space-y-6 overflow-hidden relative">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
               <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-3xl"></div>
               
               <div className="space-y-2 z-10">
                 <span className="text-violet-200 text-[10px] font-black uppercase tracking-[0.3em]">DEFINITION</span>
                 <h2 className="text-2xl md:text-3xl font-black">{q.question.definition}</h2>
               </div>
               <div className="w-12 h-1 bg-white/20 rounded-full"></div>
               <div className="space-y-4 max-w-sm z-10">
                 <p className="text-white italic leading-relaxed text-lg">"{q.question.exampleEng}"</p>
                 <p className="text-violet-200 text-sm font-medium">{q.question.exampleChn}</p>
               </div>
             </div>
          </div>
        </div>
        <div className="flex justify-between items-center px-8">
          <button onClick={() => toggleFav(q.question)} className="flex items-center gap-2 font-bold text-slate-400 hover:text-yellow-400 transition-colors">
             <Star className={q.question.favorite ? 'fill-yellow-400 text-yellow-400' : ''} /> 收藏
          </button>
          <div className="flex gap-4">
            <button disabled={currentIdx === 0} onClick={() => { setCurrentIdx(currentIdx-1); setIsFlipped(false); }} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 disabled:opacity-30 hover:bg-slate-50 transition-all"><ChevronLeft/></button>
            <button onClick={() => { if(currentIdx+1 < questions.length) { setCurrentIdx(currentIdx+1); setIsFlipped(false); } else { setGameState('result'); } }} className="p-4 bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-200 hover:bg-violet-700 hover:scale-110 transition-all"><ChevronRight/></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-10 text-center space-y-8 animate-in zoom-in duration-300">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl space-y-8 border border-slate-50">
        <div>
            <h2 className="text-3xl font-black text-slate-800">學習完成！</h2>
            <p className="text-slate-400 font-bold mt-2">做得好，休息一下吧</p>
        </div>
        
        {config.type === 'choice' && (
          <div className="relative inline-block">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
              <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-violet-600" strokeDasharray={440} strokeDashoffset={440 - (440 * score) / questions.length} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-violet-600">{Math.round((score/questions.length)*100)}%</span>
                <span className="text-xs font-bold text-slate-400 uppercase">Correct</span>
            </div>
          </div>
        )}
        
        {/* 新增：詳細答題列表 */}
        {config.type === 'choice' && (
            <div className="mt-4 text-left space-y-3">
                <h3 className="font-bold text-slate-700 mb-2 px-2 text-sm uppercase tracking-wide">測驗詳情</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                    {questions.map((qItem, idx) => {
                        const isCorrect = results[idx];
                        const word = qItem.question;
                        return (
                            <div key={word.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`p-2 rounded-full shrink-0 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {isCorrect ? <CheckCircle2 size={16} /> : <X size={16} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-slate-800 truncate">{word.word}</p>
                                        <p className="text-xs text-slate-500 truncate">{word.definition}</p>
                                    </div>
                                </div>
                                <button onClick={() => toggleFav(word)} className="p-2 ml-2">
                                     <Star className={`w-5 h-5 transition-all ${word.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 hover:text-yellow-400'}`} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}

        <div className="bg-slate-50 p-6 rounded-3xl">
            <p className="text-slate-600 font-black text-lg">{config.type === 'choice' ? `答對了 ${score} / ${questions.length} 題` : `複習了 ${questions.length} 個單字`}</p>
        </div>
        
        <button onClick={() => setGameState('config')} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-colors shadow-xl shadow-slate-200">回到學習首頁</button>
      </div>
    </div>
  );
}

// --- 分類管理組件 ---
function CategoryManager({ categories, vocab, user, db, appId, showToast, mockAdd, mockDelete, mockToggleFav }) {
  const [newCatName, setNewCatName] = useState('');
  const [activeCat, setActiveCat] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [activeCatSelector, setActiveCatSelector] = useState(null);

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    if(db) await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/categories`), { name: newCatName, createdAt: serverTimestamp() });
    else mockAdd(newCatName);
    setNewCatName('');
    showToast('分類已建立');
  };
  
  const handleDeleteCategory = async(cat) => {
      if(window.confirm('確定刪除此分類？(不會刪除分類下的單字)')) {
         if(db) await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/categories`, cat.id));
         else showToast('刪除成功 (Demo)');
      }
  }

  // --- 內部單字操作 (複製自 VocabLibrary 但只處理單個) ---
  const handleAddCategoryToWord = async (vId, catId) => {
      if (!catId) return;
      if (db) {
          await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, vId), {
              categoryIds: arrayUnion(catId)
          });
      }
      showToast(`已成功加入分類`);
      setActiveCatSelector(null);
  };
  const handleDeleteWord = async (e, id) => {
      e.stopPropagation();
      if(window.confirm('確定刪除？')) {
          if (db) await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, id));
          else mockDelete(id);
      }
  };
  const toggleFavWord = async (e, item) => {
      e.stopPropagation();
      if(db) await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, item.id), { favorite: !item.favorite });
      else mockToggleFav(item.id);
  };

  if (activeCat) {
      const categoryVocab = vocab.filter(v => v.categoryIds?.includes(activeCat.id));
      return (
          <div className="space-y-6 pb-20 animate-in slide-in-from-right-10 duration-300">
             <div className="flex items-center gap-4 mb-8">
                 <button onClick={() => setActiveCat(null)} className="p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"><ArrowLeft size={20}/></button>
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-2">
                        <Folder className="text-violet-600" /> {activeCat.name}
                    </h2>
                    <p className="text-slate-400 font-bold mt-1 text-sm">共 {categoryVocab.length} 個單字</p>
                 </div>
             </div>
             
             <div className="grid gap-3">
               {categoryVocab.length === 0 && <div className="text-center py-20 text-slate-300 font-bold">此分類目前沒有單字</div>}
               {categoryVocab.map(item => (
                 <div key={item.id} className="bg-white border rounded-[1.5rem] transition-all duration-300 border-slate-100 shadow-sm hover:shadow-md hover:border-violet-100 overflow-hidden">
                   <div className="relative flex items-center justify-between gap-3 px-4 py-4 md:px-6 md:py-5 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                     <div className="flex items-center gap-4 flex-1 min-w-0">
                         <button onClick={(e) => toggleFavWord(e, item)} className="p-1 relative z-10 group"><Star className={`w-6 h-6 transition-all ${item.favorite ? 'fill-yellow-400 text-yellow-400 scale-110' : 'text-slate-200 group-hover:text-yellow-400'}`} /></button>
                       <div className="pointer-events-none flex-1 min-w-0">
                         <div className="flex items-baseline gap-2">
                           <h3 className="font-black text-xl text-slate-800 truncate">{item.word}</h3>
                           <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wide">{item.pos}</span>
                         </div>
                         <p className="text-slate-500 text-sm truncate w-full">{item.definition}</p>
                       </div>
                     </div>

                     <div className="flex items-center gap-1 relative z-10 pl-2">
                         {activeCatSelector === item.id ? (
                           <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl animate-in zoom-in duration-200">
                             <select autoFocus className="text-xs bg-transparent border-none outline-none font-bold text-slate-600 px-1 w-20" onChange={(e) => handleAddCategoryToWord(item.id, e.target.value)} onBlur={() => setActiveCatSelector(null)} value="">
                                 <option value="" disabled>分類</option>
                                 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                             </select>
                             <button onClick={(e) => { e.stopPropagation(); setActiveCatSelector(null); }} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                           </div>
                         ) : (
                           <button onClick={(e) => { e.stopPropagation(); setActiveCatSelector(item.id); }} className="p-2 text-slate-300 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all" title="加入其他分類"><FolderPlus size={18} /></button>
                         )}
                         <button onClick={(e) => handleDeleteWord(e, item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                     </div>
                   </div>
                   {expandedId === item.id && (
                     <div className="px-5 pb-5 md:px-14">
                       <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/50">
                          <div className="flex gap-3 items-start">
                              <div className="w-1 h-full bg-violet-200 rounded-full min-h-[40px]"></div>
                              <div>
                                  <p className="font-bold text-slate-700 leading-relaxed text-lg">"{item.exampleEng}"</p>
                                  <p className="text-slate-400 text-sm mt-1">{item.exampleChn}</p>
                              </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                            {item.categoryIds?.length > 0 ? item.categoryIds.map(cid => (
                              <span key={cid} className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                  <Folder size={10} /> {categories.find(c => c.id === cid)?.name || '未命名'}
                              </span>
                            )) : <span className="text-[10px] text-slate-300 italic">未分類</span>}
                          </div>
                       </div>
                     </div>
                   )}
                 </div>
               ))}
             </div>
          </div>
      )
  }

  return (
    <div className="space-y-8 pb-20">
      <h2 className="text-4xl font-black text-slate-900">分類管理</h2>
      <div className="flex gap-3">
        <input className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none shadow-sm focus:ring-2 focus:ring-violet-500 transition-all font-bold text-slate-700" placeholder="輸入新分類名稱..." value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={(e)=>e.key==='Enter' && addCategory()} />
        <button onClick={addCategory} className="px-6 py-4 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"><Plus size={24}/></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} onClick={() => setActiveCat(cat)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-xl hover:shadow-violet-100 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
             <div className="flex items-center gap-4">
               <div className="p-4 bg-violet-50 rounded-2xl text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors"><Folder size={24}/></div>
               <div>
                 <p className="font-black text-slate-800 text-lg">{cat.name}</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{vocab.filter(v=>v.categoryIds?.includes(cat.id)).length} WORDS</p>
               </div>
             </div>
             <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }} className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2"><Trash2 size={20}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 新增單字組件 (已修復完整版) ---
function AddVocab({ user, showToast, db, appId, setActiveTab, categories, mockAdd }) {
  const [mode, setMode] = useState('single');
  const [formData, setFormData] = useState({ word: '', pos: 'n.', definition: '', exampleEng: '', exampleChn: '', targetCat: '' });
  const [bulkText, setBulkText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (mode === 'single') {
        const payload = {
            ...formData,
            categoryIds: formData.targetCat ? [formData.targetCat] : [],
            favorite: false,
            createdAt: serverTimestamp()
        };
        if (db) {
            await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/vocabulary`), payload);
        } else {
            mockAdd(payload);
        }
        showToast('新增成功');
      } else {
        const lines = bulkText.split('\n').filter(l => l.trim() !== '');
        let count = 0;
        for (const line of lines) {
          const p = line.split(';').map(s => s.trim());
          if (p.length >= 2) { // 至少要有單字和定義
            let catIds = [];
            // 如果有指定分類名 (假設是 CSV 第 6 欄)
            if (p[5] && db) {
               let cat = categories.find(c => c.name === p[5]);
               if (!cat) {
                 const res = await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/categories`), { name: p[5], createdAt: serverTimestamp() });
                 catIds = [res.id];
               } else catIds = [cat.id];
            }
            
            const payload = {
              word: p[0], pos: p[1]||'n.', definition: p[2], exampleEng: p[3]||'', exampleChn: p[4]||'',
              favorite: false, categoryIds: catIds, createdAt: serverTimestamp()
            };

            if(db) await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/vocabulary`), payload);
            else mockAdd(payload); // 模擬只會加最後一筆展示用
            count++;
          }
        }
        showToast(`批量新增成功，共 ${count} 筆`);
      }
      setActiveTab('library');
    } catch (error) { 
        console.error(error);
        showToast('發生錯誤'); 
    } finally { 
        setIsProcessing(false); 
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-5">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-900">{mode === 'single' ? '新增單字' : '批量匯入'}</h2>
        <div className="inline-flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          <button onClick={() => setMode('single')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${mode === 'single' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>單筆輸入</button>
          <button onClick={() => setMode('bulk')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${mode === 'bulk' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>批量匯入</button>
        </div>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-50">
      {mode === 'single' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
           <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2">單字 (Word)</label>
                  <input required autoFocus className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-lg outline-none border border-slate-100 focus:border-violet-500 focus:bg-white transition-all" value={formData.word} onChange={e => setFormData({...formData, word: e.target.value})} placeholder="Ex: Epiphany" />
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2">詞性</label>
                  <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100" value={formData.pos} onChange={e => setFormData({...formData, pos: e.target.value})}>
                      {['n.', 'v.', 'adj.', 'adv.', 'phr.', 'conj.', 'prep.'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">中文定義 (Definition)</label>
              <input required className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100 focus:border-violet-500 focus:bg-white transition-all" value={formData.definition} onChange={e => setFormData({...formData, definition: e.target.value})} placeholder="Ex: 頓悟" />
           </div>

           <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">英文例句 (Sentence)</label>
              <textarea rows={2} className="w-full p-4 bg-slate-50 rounded-2xl font-medium outline-none border border-slate-100 focus:border-violet-500 focus:bg-white transition-all" value={formData.exampleEng} onChange={e => setFormData({...formData, exampleEng: e.target.value})} placeholder="I had an epiphany..." />
           </div>

           <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">中文翻譯 (Translation)</label>
              <textarea rows={2} className="w-full p-4 bg-slate-50 rounded-2xl font-medium outline-none border border-slate-100 focus:border-violet-500 focus:bg-white transition-all" value={formData.exampleChn} onChange={e => setFormData({...formData, exampleChn: e.target.value})} placeholder="我突然頓悟了..." />
           </div>

           <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">分類 (Category)</label>
              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100 text-slate-700" value={formData.targetCat} onChange={e => setFormData({...formData, targetCat: e.target.value})}>
                  <option value="">不分類</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
           </div>

           <button disabled={isProcessing} className="w-full py-5 bg-violet-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-violet-200 hover:bg-violet-700 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50">
               {isProcessing ? '儲存中...' : '新增單字'}
           </button>
        </form>
      ) : (
        <div className="space-y-6">
           <div className="bg-amber-50 p-4 rounded-2xl text-amber-600 text-sm font-bold leading-relaxed border border-amber-100">
               <p>格式：單字; 詞性; 定義; 例句; 翻譯; 分類名稱 (選填)</p>
               <p className="mt-1 opacity-70 font-mono">Ex: Apple; n.; 蘋果; This is an apple; 這是一顆蘋果; 水果類</p>
           </div>
           <textarea className="w-full h-64 p-4 bg-slate-50 rounded-2xl font-mono text-sm outline-none border border-slate-100 focus:border-violet-500 focus:bg-white transition-all" placeholder={`Apple; n.; 蘋果\nBanana; n.; 香蕉`} value={bulkText} onChange={e => setBulkText(e.target.value)} />
           <button onClick={handleSubmit} disabled={isProcessing || !bulkText.trim()} className="w-full py-5 bg-violet-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-violet-200 hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50">
               {isProcessing ? '匯入中...' : '開始匯入'}
           </button>
        </div>
      )}
      </div>
    </div>
  );
}