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
  FolderPlus, ArrowLeft, Layers, MinusCircle
} from 'lucide-react';

// --- Firebase 配置 (此處為結構範例，實際運行時環境會注入金鑰) ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

let app, auth, db, googleProvider;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
} catch (e) {
    console.error("Firebase 初始化失敗，將進入 Demo 模式。");
}

// --- 模擬數據 (用於未登入或 Firebase 未連接時) ---
const MOCK_VOCAB = [
  { id: '1', word: 'Abandon', pos: 'v.', definition: '放棄；拋棄', exampleEng: 'He abandoned his car in the snow.', exampleChn: '他把車棄置在雪地裡。', categoryIds: ['c1'], favorite: false, createdAt: { seconds: 1700000000 } },
  { id: '2', word: 'Benefit', pos: 'n.', definition: '好處；利益', exampleEng: 'The discovery will be of great benefit to science.', exampleChn: '這項發現將對科學大有裨益。', categoryIds: ['c2'], favorite: true, createdAt: { seconds: 1700000100 } },
  { id: '3', word: 'Calculate', pos: 'v.', definition: '計算；估算', exampleEng: 'We haven\'t calculated the cost of the new building yet.', exampleChn: '我們還沒有計算新大樓的成本。', categoryIds: [], favorite: false, createdAt: { seconds: 1700000200 } },
];

const MOCK_CATS = [
  { id: 'c1', name: 'Level 4 單字' },
  { id: 'c2', name: '商業英文' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('library');
  const [vocabList, setVocabList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const appId = typeof __app_id !== 'undefined' ? __app_id : "my-vocab-app";

  // 1. 初始化驗證
  useEffect(() => {
    if (!auth) {
      // Demo 模式
      setUser({ uid: 'demo-user', displayName: '訪客同學', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' });
      setVocabList(MOCK_VOCAB);
      setCategories(MOCK_CATS);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. 監聽 Firestore 資料
  useEffect(() => {
    if (!user || !db || user.uid === 'demo-user') return;

    const unsubVocab = onSnapshot(
      query(collection(db, 'artifacts', appId, 'users', user.uid, 'vocabulary')), 
      (snap) => {
        setVocabList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Firestore Vocab Error:", error)
    );

    const unsubCat = onSnapshot(
      query(collection(db, 'artifacts', appId, 'users', user.uid, 'categories')), 
      (snap) => {
        setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Firestore Cat Error:", error)
    );

    return () => { unsubVocab(); unsubCat(); };
  }, [user]);

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLogin = async () => {
    if (auth) {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (e) {
        await signInAnonymously(auth);
      }
    }
  };

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    setUser(null);
    setShowLogoutConfirm(false);
  };

  // --- 操作功能函式 ---
  const handleToggleFav = async (vId, currentStatus) => {
    if (user.uid === 'demo-user') {
      setVocabList(prev => prev.map(v => v.id === vId ? { ...v, favorite: !v.favorite } : v));
      return;
    }
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', vId), {
      favorite: !currentStatus
    });
  };

  const handleDeleteVocab = async (vId) => {
    if (!window.confirm("確定要永久刪除此單字嗎？")) return;
    if (user.uid === 'demo-user') {
      setVocabList(prev => prev.filter(v => v.id !== vId));
      showToast("已刪除單字 (Demo)");
      return;
    }
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', vId));
    showToast("單字已刪除");
  };

  const handleRemoveFromCategory = async (vId, catId) => {
    if (!window.confirm("確定要將此單字從這個分類移除嗎？（單字不會被刪除）")) return;
    if (user.uid === 'demo-user') {
      setVocabList(prev => prev.map(v => v.id === vId ? { ...v, categoryIds: v.categoryIds.filter(id => id !== catId) } : v));
      showToast("已從分類移除 (Demo)");
      return;
    }
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', vId), {
      categoryIds: arrayRemove(catId)
    });
    showToast("已從分類移除");
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-violet-600 animate-pulse">載入中...</div>;

  if (!user) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 max-w-sm w-full">
        <div className="bg-violet-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-violet-200">
            <GraduationCap className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">學測單字雲</h1>
        <button onClick={handleLogin} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 transition-all shadow-md">
          開始學習
        </button>
      </div>
    </div>
  );

  const navigation = [
    { id: 'library', label: '單字庫', icon: <BookOpen /> },
    { id: 'database', label: '分類管理', icon: <Tags /> },
    { id: 'fav', label: '收藏清單', icon: <Star /> },
    { id: 'add', label: '新增單字', icon: <PlusCircle /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans antialiased text-slate-900">
      {/* 側邊欄 */}
      <aside className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-2xl md:shadow-none`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-2 rounded-xl shadow-lg shadow-violet-200"><GraduationCap className="text-white w-6 h-6" /></div>
            <h1 className="font-bold text-xl text-slate-800 tracking-tight">單字雲</h1>
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}><X size={24}/></button>
        </div>
        <nav className="flex-1 px-4 space-y-2 py-4">
          {navigation.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'text-slate-500 hover:bg-slate-50'}`}>
              {React.cloneElement(item.icon, { size: 20, strokeWidth: 2.5 })} <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-400 hover:text-red-500 transition-all text-xs font-bold">
            <LogOut size={14} /> 登出帳號
          </button>
        </div>
      </aside>

      {/* 行動端標題欄 */}
      <div className="md:hidden bg-white border-b p-4 flex items-center justify-between sticky top-0 z-40">
        <span className="font-black text-slate-800 tracking-tight">學測單字雲</span>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-xl"><Menu size={20}/></button>
      </div>

      {/* 主要內容區 */}
      <main className="flex-1 p-4 md:ml-64 md:p-10 max-w-5xl w-full mx-auto">
        {activeTab === 'library' && (
          <VocabLibrary 
            vocab={vocabList} 
            title="所有單字" 
            onToggleFav={handleToggleFav} 
            onDelete={handleDeleteVocab}
            categories={categories}
            user={user}
            db={db}
            appId={appId}
            showToast={showToast}
          />
        )}
        {activeTab === 'database' && (
          <CategoryManager 
            categories={categories} 
            vocab={vocabList} 
            user={user} 
            db={db} 
            appId={appId} 
            showToast={showToast}
            onToggleFav={handleToggleFav}
            onDeleteVocab={handleDeleteVocab}
            onRemoveFromCategory={handleRemoveFromCategory}
          />
        )}
        {activeTab === 'fav' && (
          <VocabLibrary 
            vocab={vocabList.filter(v => v.favorite)} 
            title="收藏清單" 
            onToggleFav={handleToggleFav} 
            onDelete={handleDeleteVocab}
            categories={categories}
            user={user}
            db={db}
            appId={appId}
            showToast={showToast}
          />
        )}
        {activeTab === 'add' && (
          <AddVocab 
            user={user} 
            db={db} 
            appId={appId} 
            showToast={showToast} 
            onSuccess={() => setActiveTab('library')}
            categories={categories}
          />
        )}
      </main>

      {/* 登出確認對話框 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-xs w-full text-center space-y-6 shadow-2xl">
            <h3 className="text-xl font-black text-slate-800">確定要登出嗎？</h3>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold">取消</button>
              <button onClick={handleLogout} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold">登出</button>
            </div>
          </div>
        </div>
      )}

      {/* 訊息提示 */}
      {message && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 font-bold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-green-400" /> {message}
        </div>
      )}
    </div>
  );
}

// --- 分類管理組件 (包含從分類移除功能) ---
function CategoryManager({ categories, vocab, user, db, appId, showToast, onToggleFav, onDeleteVocab, onRemoveFromCategory }) {
  const [activeCat, setActiveCat] = useState(null);
  const [newCatName, setNewCatName] = useState('');

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    if (user.uid === 'demo-user') {
      showToast("Demo 模式無法新增分類");
      return;
    }
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'categories'), {
      name: newCatName,
      createdAt: serverTimestamp()
    });
    setNewCatName('');
    showToast("分類建立成功");
  };

  if (activeCat) {
    const catWords = vocab.filter(v => v.categoryIds?.includes(activeCat.id));
    return (
      <div className="space-y-6 animate-in slide-in-from-right-5">
        <button onClick={() => setActiveCat(null)} className="flex items-center gap-2 text-slate-500 font-bold hover:text-violet-600 transition-colors">
          <ArrowLeft size={20}/> 返回分類列表
        </button>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900">{activeCat.name}</h2>
            <p className="text-slate-400 font-bold">此分類共有 {catWords.length} 個單字</p>
          </div>
        </div>

        <div className="grid gap-3">
          {catWords.length === 0 && <div className="text-center py-20 bg-white rounded-3xl border border-dashed text-slate-300 font-bold">此分類目前沒有單字</div>}
          {catWords.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <button onClick={() => onToggleFav(item.id, item.favorite)}>
                  <Star className={`w-6 h-6 ${item.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                </button>
                <div>
                  <h3 className="font-black text-xl text-slate-800">{item.word} <span className="text-xs text-slate-400">{item.pos}</span></h3>
                  <p className="text-slate-500 text-sm font-medium">{item.definition}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* 核心需求：從此分類移除按鈕 */}
                <button 
                  onClick={() => onRemoveFromCategory(item.id, activeCat.id)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all border border-slate-100 opacity-0 group-hover:opacity-100"
                >
                  <MinusCircle size={16} />
                  <span className="text-xs font-bold">在此分類移除</span>
                </button>
                <button onClick={() => onDeleteVocab(item.id)} className="p-2 text-slate-200 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-black text-slate-900 tracking-tight">分類管理</h2>
      <div className="flex gap-3">
        <input 
          className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none shadow-sm font-bold" 
          placeholder="輸入新分類名稱..." 
          value={newCatName} 
          onChange={e => setNewCatName(e.target.value)}
        />
        <button onClick={handleCreateCategory} className="px-6 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-100">
          <Plus size={24}/>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.map(cat => (
          <div key={cat.id} onClick={() => setActiveCat(cat)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all cursor-pointer">
             <div className="flex items-center gap-4">
               <div className="p-4 bg-violet-50 rounded-2xl text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors"><Folder size={24}/></div>
               <div>
                 <p className="font-black text-slate-800 text-lg">{cat.name}</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {vocab.filter(v => v.categoryIds?.includes(cat.id)).length} 個單字
                 </p>
               </div>
             </div>
             <ChevronRight className="text-slate-200 group-hover:text-violet-600" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 單字庫組件 ---
function VocabLibrary({ vocab, title, onToggleFav, onDelete, categories, user, db, appId, showToast }) {
  const [search, setSearch] = useState('');
  const [activeCatSelector, setActiveCatSelector] = useState(null);

  const filtered = vocab.filter(v => v.word?.toLowerCase().includes(search.toLowerCase()) || v.definition?.includes(search));

  const handleAddToCategory = async (vId, catId) => {
    if (user.uid === 'demo-user') {
      showToast("Demo 模式無法修改分類 (Demo)");
      setActiveCatSelector(null);
      return;
    }
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocabulary', vId), {
      categoryIds: arrayUnion(catId)
    });
    showToast("已成功加入分類");
    setActiveCatSelector(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">{title}</h2>
        <span className="text-slate-400 font-bold mb-1">共 {filtered.length} 個</span>
      </div>
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="搜尋單字或定義..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-violet-500 outline-none font-medium"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {filtered.map(item => (
          <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <button onClick={() => onToggleFav(item.id, item.favorite)}>
                <Star className={`w-6 h-6 ${item.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
              </button>
              <div>
                <h3 className="font-black text-xl text-slate-800">{item.word} <span className="text-xs text-slate-400">{item.pos}</span></h3>
                <p className="text-slate-500 text-sm">{item.definition}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="relative">
                <button onClick={() => setActiveCatSelector(activeCatSelector === item.id ? null : item.id)} className="p-2 text-slate-200 hover:text-violet-600 transition-colors">
                  <FolderPlus size={20} />
                </button>
                {activeCatSelector === item.id && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 p-2 animate-in zoom-in-95">
                    <p className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase">加入至分類</p>
                    {categories.length === 0 && <p className="text-xs text-slate-300 p-3">尚無分類</p>}
                    {categories.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => handleAddToCategory(item.id, c.id)}
                        className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-600 rounded-xl transition-colors"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => onDelete(item.id)} className="p-2 text-slate-200 hover:text-red-500">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 新增單字組件 ---
function AddVocab({ user, db, appId, showToast, onSuccess, categories }) {
  const [formData, setFormData] = useState({ word: '', pos: 'n.', definition: '', exampleEng: '', exampleChn: '', catId: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.word || !formData.definition) return;
    
    const payload = {
      word: formData.word,
      pos: formData.pos,
      definition: formData.definition,
      exampleEng: formData.exampleEng,
      exampleChn: formData.exampleChn,
      categoryIds: formData.catId ? [formData.catId] : [],
      favorite: false,
      createdAt: serverTimestamp()
    };

    if (user.uid !== 'demo-user') {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'vocabulary'), payload);
    }
    showToast("新增成功！");
    onSuccess();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h2 className="text-4xl font-black text-slate-900 text-center">新增單字</h2>
      <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-[3rem] shadow-xl space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <input className="col-span-2 p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-violet-500" placeholder="英文單字" value={formData.word} onChange={e => setFormData({...formData, word: e.target.value})} required />
          <select className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={formData.pos} onChange={e => setFormData({...formData, pos: e.target.value})}>
            <option>n.</option><option>v.</option><option>adj.</option><option>adv.</option><option>phr.</option>
          </select>
        </div>
        <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-violet-500" placeholder="中文定義" value={formData.definition} onChange={e => setFormData({...formData, definition: e.target.value})} required />
        <textarea className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-violet-500 h-24" placeholder="英文例句 (選填)" value={formData.exampleEng} onChange={e => setFormData({...formData, exampleEng: e.target.value})} />
        <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={formData.catId} onChange={e => setFormData({...formData, catId: e.target.value})}>
          <option value="">選擇分類 (選填)</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="submit" className="w-full py-5 bg-violet-600 text-white rounded-2xl font-black text-lg hover:bg-violet-700 shadow-lg shadow-violet-100 transition-all">儲存至單字庫</button>
      </form>
    </div>
  );
}

function ChevronRight(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
}