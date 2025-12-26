import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, GoogleAuthProvider, 
  signInWithPopup, signInWithRedirect, getRedirectResult, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  BookOpen, Star, PlusCircle, GraduationCap, Search, ChevronDown, 
  Trash2, CheckCircle2, LogOut, X, AlertCircle, Copy, AlertTriangle,
  FolderPlus, Folder, Tags, Plus, MoreHorizontal
} from 'lucide-react';

// --- 請在此填入你的真實 Firebase 配置 ---
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
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }
    getRedirectResult(auth).then((result) => { if (result?.user) setUser(result.user); });
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 監聽單字與分類資料
  useEffect(() => {
    if (!user || !isConfigured) return;
    
    // 監聽單字
    const vocabPath = `artifacts/${appId}/users/${user.uid}/vocabulary`;
    const unsubVocab = onSnapshot(query(collection(db, vocabPath)), (snap) => {
      setVocabList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 監聽分類
    const catPath = `artifacts/${appId}/users/${user.uid}/categories`;
    const unsubCat = onSnapshot(query(collection(db, catPath)), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubVocab(); unsubCat(); };
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code === 'auth/popup-blocked') await signInWithRedirect(auth, googleProvider);
      else setErrorDetails(err.code);
    }
  };

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-indigo-600">載入中...</div>;

  if (!user) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 max-w-sm w-full border border-slate-100">
        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg"><GraduationCap className="text-white w-12 h-12" /></div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">學測單字雲</h1>
        <button onClick={handleLogin} className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" /> 使用 Google 登入
        </button>
        {errorDetails && <p className="text-red-500 text-[10px] font-mono">{errorDetails}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-0 md:pl-64 font-sans antialiased text-slate-900">
      {/* 桌機導航 */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 p-6 z-40">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-indigo-600 p-2 rounded-xl"><GraduationCap className="text-white w-6 h-6" /></div>
          <h1 className="font-bold text-xl text-slate-800">學測單字雲</h1>
        </div>
        <div className="space-y-1">
          <NavItem icon={<BookOpen />} label="我的單字庫" active={activeTab === 'library'} onClick={() => setActiveTab('library')} />
          <NavItem icon={<Tags />} label="分類資料庫" active={activeTab === 'database'} onClick={() => setActiveTab('database')} />
          <NavItem icon={<Star />} label="收藏清單" active={activeTab === 'fav'} onClick={() => setActiveTab('fav')} />
          <NavItem icon={<PlusCircle />} label="新增單字" active={activeTab === 'add'} onClick={() => setActiveTab('add')} />
          <NavItem icon={<GraduationCap />} label="練習模式" active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} />
        </div>
        <div className="mt-auto pt-6 space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
            {user.photoURL && <img src={user.photoURL} className="w-8 h-8 rounded-full" alt="avatar" />}
            <p className="text-xs font-black text-slate-800 truncate">{user.displayName}</p>
          </div>
          <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-500 rounded-xl transition-all font-bold text-sm">
            <LogOut size={18} /> 登出帳號
          </button>
        </div>
      </nav>

      {/* 手機導航 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around p-3 z-50">
        <MobileNavItem icon={<BookOpen />} active={activeTab === 'library'} onClick={() => setActiveTab('library')} />
        <MobileNavItem icon={<Tags />} active={activeTab === 'database'} onClick={() => setActiveTab('database')} />
        <MobileNavItem icon={<PlusCircle />} active={activeTab === 'add'} onClick={() => setActiveTab('add')} />
        <MobileNavItem icon={<GraduationCap />} active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} />
      </nav>

      <main className="flex-1 p-4 md:p-10 max-w-5xl mx-auto w-full">
        {activeTab === 'library' && <VocabLibrary vocab={vocabList} user={user} title="所有單字" db={db} appId={appId} categories={categories} />}
        {activeTab === 'database' && <CategoryManager categories={categories} vocab={vocabList} user={user} db={db} appId={appId} showToast={showToast} />}
        {activeTab === 'fav' && <VocabLibrary vocab={vocabList.filter(v => v.favorite)} user={user} title="我的收藏" db={db} appId={appId} categories={categories} />}
        {activeTab === 'add' && <AddVocab user={user} showToast={showToast} db={db} appId={appId} setActiveTab={setActiveTab} />}
        {activeTab === 'quiz' && <Quiz vocab={vocabList} />}
      </main>

      {message && (
        <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 font-bold text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-green-400" /> {message}
        </div>
      )}
    </div>
  );
}

// --- 導航組件 ---
function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
      {React.cloneElement(icon, { size: 20 })} <span className="font-semibold">{label}</span>
    </button>
  );
}
function MobileNavItem({ icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`p-3 rounded-2xl transition-all ${active ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
      {React.cloneElement(icon, { size: 24 })}
    </button>
  );
}

// --- 分類管理組件 ---
function CategoryManager({ categories, vocab, user, db, appId, showToast }) {
  const [newCatName, setNewCatName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState(null);

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/categories`), {
      name: newCatName,
      createdAt: serverTimestamp()
    });
    setNewCatName('');
    showToast('分類已建立');
  };

  const deleteCategory = async (id) => {
    if (window.confirm('確定要刪除此分類嗎？')) {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/categories`, id));
      if (selectedCatId === id) setSelectedCatId(null);
    }
  };

  const filteredVocab = vocab.filter(v => v.categoryIds?.includes(selectedCatId));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-black text-slate-900">分類資料庫</h2>
      </div>

      <div className="flex gap-2">
        <input 
          className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" 
          placeholder="輸入新分類名稱..." 
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
        />
        <button onClick={addCategory} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors">
          <FolderPlus size={20} /> 新增分類
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="relative group">
            <button 
              onClick={() => setSelectedCatId(selectedCatId === cat.id ? null : cat.id)}
              className={`w-full p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${selectedCatId === cat.id ? 'border-indigo-600 bg-indigo-50' : 'border-white bg-white shadow-sm hover:shadow-md'}`}
            >
              <Folder className={selectedCatId === cat.id ? 'text-indigo-600' : 'text-slate-300'} size={32} />
              <span className="font-bold text-slate-700">{cat.name}</span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">
                {vocab.filter(v => v.categoryIds?.includes(cat.id)).length} 個單字
              </span>
            </button>
            <button onClick={() => deleteCategory(cat.id)} className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {selectedCatId && (
        <div className="mt-10 space-y-4">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Folder className="text-indigo-600" size={20} /> 
            {categories.find(c => c.id === selectedCatId)?.name} 的單字
          </h3>
          <div className="grid gap-2">
            {filteredVocab.map(v => (
              <div key={v.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 mr-2">{v.word}</span>
                  <span className="text-sm text-slate-500">{v.definition}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- 單字庫組件 (含詞性篩選與分類按鈕) ---
function VocabLibrary({ vocab, user, title, db, appId, categories }) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [showCatMenu, setShowCatMenu] = useState(null);

  const poses = ['all', 'n.', 'v.', 'adj.', 'adv.', 'phr.'];

  const filtered = vocab
    .filter(v => (posFilter === 'all' || v.pos === posFilter))
    .filter(v => v.word?.toLowerCase().includes(search.toLowerCase()) || v.definition?.includes(search))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const toggleFav = async (e, item) => {
    e.stopPropagation();
    await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, item.id), { favorite: !item.favorite });
  };

  const toggleCategory = async (e, vocabId, catId) => {
    e.stopPropagation();
    const item = vocab.find(v => v.id === vocabId);
    const hasCat = item.categoryIds?.includes(catId);
    const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, vocabId);
    
    await updateDoc(docRef, {
      categoryIds: hasCat ? arrayRemove(catId) : arrayUnion(catId)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">{title}</h2>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="搜尋單字..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* 詞性篩選標籤 */}
      <div className="flex flex-wrap gap-2">
        {poses.map(p => (
          <button 
            key={p} 
            onClick={() => setPosFilter(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${posFilter === p ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
          >
            {p === 'all' ? '全部' : p}
          </button>
        ))}
      </div>

      <div className="grid gap-3 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold">目前無單字</div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="relative bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                <div className="flex items-center gap-4">
                  <button onClick={(e) => toggleFav(e, item)}><Star className={`w-6 h-6 ${item.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} /></button>
                  <div>
                    <h3 className="font-black text-xl text-slate-800">{item.word} <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">{item.pos}</span></h3>
                    <p className="text-slate-500 font-medium">{item.definition}</p>
                    <div className="flex gap-1 mt-1">
                      {item.categoryIds?.map(cid => (
                        <span key={cid} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded italic">#{categories.find(c => c.id === cid)?.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowCatMenu(showCatMenu === item.id ? null : item.id); }}
                      className={`p-2 rounded-xl transition-colors ${showCatMenu === item.id ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50'}`}
                    >
                      <Plus size={20} />
                    </button>
                    {showCatMenu === item.id && (
                      <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 px-2 mb-1">加入分類</p>
                        {categories.length === 0 ? <p className="text-[10px] text-slate-300 p-2">無分類</p> : categories.map(cat => (
                          <button 
                            key={cat.id} 
                            onClick={(e) => toggleCategory(e, item.id, cat.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${item.categoryIds?.includes(cat.id) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {cat.name}
                            {item.categoryIds?.includes(cat.id) && <CheckCircle2 size={12} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={async (e) => { e.stopPropagation(); if(window.confirm('刪除？')) await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, item.id)); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              </div>
              {expandedId === item.id && (
                <div className="px-14 pb-6 pt-2 bg-indigo-50/30">
                  <div className="border-l-4 border-indigo-400 pl-4 py-1">
                    <p className="font-bold text-slate-700">{item.exampleEng}</p>
                    <p className="text-slate-500 text-sm">{item.exampleChn}</p>
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

// --- 其他子組件 (與原版雷同) ---
function AddVocab({ user, showToast, db, appId, setActiveTab }) {
  const [formData, setFormData] = useState({ word: '', pos: 'n.', definition: '', exampleEng: '', exampleChn: '' });
  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/vocabulary`), {
      ...formData, favorite: false, categoryIds: [], createdAt: serverTimestamp()
    });
    showToast(`${formData.word} 加入成功`);
    setFormData({ word: '', pos: 'n.', definition: '', exampleEng: '', exampleChn: '' });
    setActiveTab('library');
  };
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-4xl font-black text-slate-900 text-center">新增單字</h2>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] shadow-xl space-y-6 border border-slate-50">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-black text-slate-400 ml-2 uppercase">Word</label>
            <input required className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.word} onChange={e => setFormData({...formData, word: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 ml-2 uppercase">詞性</label>
            <select className="w-full px-4 py-4 bg-slate-50 rounded-2xl outline-none" value={formData.pos} onChange={e => setFormData({...formData, pos: e.target.value})}>
              {['n.', 'v.', 'adj.', 'adv.', 'phr.'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 ml-2 uppercase">Definition</label>
          <input required className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none" value={formData.definition} onChange={e => setFormData({...formData, definition: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 ml-2 uppercase">Example</label>
          <textarea rows="2" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none" value={formData.exampleEng} onChange={e => setFormData({...formData, exampleEng: e.target.value})} />
        </div>
        <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">儲存到雲端</button>
      </form>
    </div>
  );
}

function Quiz({ vocab }) {
  const [shuffled, setShuffled] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  useEffect(() => { if (vocab.length > 0) setShuffled([...vocab].sort(() => Math.random() - 0.5)); }, [vocab]);
  if (shuffled.length === 0) return <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold">目前無單字可練習。</div>;
  const current = shuffled[currentIdx];
  const handleNext = (e) => { e.stopPropagation(); setIsFlipped(false); setTimeout(() => { setCurrentIdx((prev) => (prev + 1) % shuffled.length); }, 200); };
  return (
    <div className="max-w-md mx-auto space-y-10 py-6">
      <div className="relative h-[28rem] w-full cursor-pointer" style={{ perspective: '1000px' }} onClick={() => setIsFlipped(!isFlipped)}>
        <div className={`relative w-full h-full transition-all duration-500 transform-gpu ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute inset-0 bg-white rounded-[3.5rem] shadow-xl flex flex-col items-center justify-center p-8 border border-slate-100 backface-hidden">
            <span className="text-indigo-600 font-black uppercase text-sm mb-4">{current.pos}</span>
            <h2 className="text-5xl font-black text-slate-900 text-center">{current.word}</h2>
            <p className="mt-20 text-slate-300 font-bold text-xs animate-pulse text-center">點擊翻看定義</p>
          </div>
          <div className="absolute inset-0 bg-indigo-600 rounded-[3.5rem] shadow-xl flex flex-col items-center justify-center p-10 text-white rotate-y-180 backface-hidden">
            <h2 className="text-4xl font-black mb-6 text-center">{current.definition}</h2>
            <div className="bg-indigo-500/30 p-4 rounded-2xl border border-indigo-400/30 max-w-full"><p className="text-indigo-100 text-sm italic line-clamp-3">"{current.exampleEng}"</p></div>
            <button onClick={handleNext} className="mt-10 bg-white text-indigo-600 px-10 py-3 rounded-2xl font-black hover:bg-slate-50 transition-colors">下一個</button>
          </div>
        </div>
      </div>
      <div className="flex justify-center items-center gap-4 text-slate-400 font-black tracking-widest">
        <span>{currentIdx + 1}</span>
        <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${((currentIdx + 1) / shuffled.length) * 100}%` }}></div>
        </div>
        <span>{shuffled.length}</span>
      </div>
    </div>
  );
}

// 翻牌動畫 CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .rotate-y-180 { transform: rotateY(180deg); }
    .backface-hidden { backface-visibility: hidden; }
  `;
  document.head.appendChild(style);
}