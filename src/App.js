/**
 * 這個版本將 Tailwind 樣式直接注入，解決自架時樣式失效的問題。
 * 運行前請先安裝：npm install firebase lucide-react
 */

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, serverTimestamp 
} from 'firebase/firestore';
import { 
  BookOpen, History, GraduationCap, PenTool, Star, PlusCircle, 
  Search, ChevronDown, ChevronUp, Trash2, CheckCircle2,
  RotateCcw, FileText, UploadCloud, AlertCircle
} from 'lucide-react';

// --- 請填入你的 Firebase 配置 ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};


const appId = "my-vocab-app";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 注入 Tailwind CDN (雙重保險)
if (!document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('library');
  const [vocabList, setVocabList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const login = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Error:", err);
        alert("身份驗證失敗，請檢查 Firebase Console 是否開啟匿名登入");
      }
    };
    login();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const vocabPath = `artifacts/${appId}/users/${user.uid}/vocabulary`;
    const q = query(collection(db, vocabPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVocabList(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      // 如果看到權限錯誤，通常是 Rules 沒設好
      if (error.code === 'permission-denied') {
        alert("讀取失敗：請檢查 Firestore Database 的 Rules 是否允許讀取。");
      }
    });

    return () => unsubscribe();
  }, [user]);

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-indigo-600 font-bold animate-pulse">正在連線至雲端單字庫...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0 md:pl-64 font-sans antialiased text-slate-900">
      {/* 桌面端側邊欄 */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 p-6 z-40 shadow-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-gray-800">學測單字雲</h1>
        </div>
        
        <div className="space-y-2">
          <NavItem icon={<BookOpen />} label="我的單字庫" active={activeTab === 'library'} onClick={() => setActiveTab('library')} />
          <NavItem icon={<Star />} label="收藏清單" active={activeTab === 'fav'} onClick={() => setActiveTab('fav')} />
          <NavItem icon={<PlusCircle />} label="新增/匯入" active={activeTab === 'add'} onClick={() => setActiveTab('add')} />
          <NavItem icon={<GraduationCap />} label="練習模式" active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} />
        </div>

        <div className="mt-auto p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold mb-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            雲端同步中
          </div>
          <p className="text-[10px] text-gray-400 truncate opacity-70">UID: {user?.uid}</p>
        </div>
      </nav>

      {/* 手機端底部導航 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 flex justify-around p-3 z-50">
        <MobileNavItem icon={<BookOpen />} active={activeTab === 'library'} onClick={() => setActiveTab('library')} />
        <MobileNavItem icon={<PlusCircle />} active={activeTab === 'add'} onClick={() => setActiveTab('add')} />
        <MobileNavItem icon={<Star />} active={activeTab === 'fav'} onClick={() => setActiveTab('fav')} />
        <MobileNavItem icon={<GraduationCap />} active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} />
      </nav>

      {/* 主內容區 */}
      <main className="flex-1 p-4 md:p-10 max-w-5xl mx-auto w-full">
        {activeTab === 'library' && <VocabLibrary vocab={vocabList} user={user} title="所有單字" />}
        {activeTab === 'fav' && <VocabLibrary vocab={vocabList.filter(v => v.favorite)} user={user} title="我的收藏" />}
        {activeTab === 'add' && <AddVocab user={user} showToast={showToast} />}
        {activeTab === 'quiz' && <Quiz vocab={vocabList} />}
      </main>

      {message && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          {message}
        </div>
      )}
    </div>
  );
}

// --- 以下為 UI 組件 ---

function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-indigo-600'
      }`}
    >
      {React.cloneElement(icon, { size: 20 })}
      <span className="font-semibold">{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={`p-3 rounded-2xl transition-all ${active ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400'}`}
    >
      {React.cloneElement(icon, { size: 24 })}
    </button>
  );
}

function VocabLibrary({ vocab, user, title }) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = vocab.filter(v => 
    v.word?.toLowerCase().includes(search.toLowerCase()) || 
    v.definition?.includes(search)
  ).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const toggleFav = async (e, item) => {
    e.stopPropagation();
    const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, item.id);
    await updateDoc(docRef, { favorite: !item.favorite });
  };

  const remove = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('確定要刪除此單字嗎？')) return;
    const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, id);
    await deleteDoc(docRef);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-4xl font-black text-gray-900 tracking-tight">{title}</h2>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" placeholder="搜尋單字、詞性或中文..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
            <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <div className="flex items-center gap-5">
                <button onClick={(e) => toggleFav(e, item)} className="focus:outline-none">
                  <Star 
                    className={`w-7 h-7 transition-all ${item.favorite ? 'fill-yellow-400 text-yellow-400 scale-110' : 'text-gray-200 hover:text-yellow-400'}`} 
                  />
                </button>
                <div>
                  <h3 className="font-black text-xl text-gray-800 flex items-center gap-2">
                    {item.word} 
                    <span className="text-[10px] text-indigo-600 font-black px-2 py-0.5 bg-indigo-50 rounded-lg uppercase tracking-widest">{item.pos}</span>
                  </h3>
                  <p className="text-gray-500 font-medium">{item.definition}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => remove(e, item.id)} className="p-2 text-gray-100 group-hover:text-red-400 transition-colors"><Trash2 size={20} /></button>
                <div className={`p-2 rounded-full transition-colors ${expandedId === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-300'}`}>
                  {expandedId === item.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </div>
            </div>
            {expandedId === item.id && (
              <div className="px-16 pb-8 pt-2 space-y-5 animate-in slide-in-from-top-4">
                <div className="bg-slate-50 p-5 rounded-2xl border-l-4 border-indigo-500">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-2">Example Sentence</span>
                  <p className="text-gray-800 font-bold text-lg leading-relaxed">{item.exampleEng}</p>
                  <p className="text-gray-500 mt-2 font-medium">{item.exampleChn}</p>
                </div>
                {(item.supplementEng || item.supplementChn) && (
                  <div className="bg-amber-50/50 p-5 rounded-2xl border-l-4 border-amber-400">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-2">Supplement / Phrases</span>
                    <p className="text-gray-800 font-bold">{item.supplementEng}</p>
                    <p className="text-gray-500 mt-1 font-medium">{item.supplementChn}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
            <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">目前沒有符合條件的單字</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AddVocab({ user, showToast }) {
  const [isBulk, setIsBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [formData, setFormData] = useState({
    word: '', pos: 'n.', definition: '',
    exampleEng: '', exampleChn: '',
    supplementEng: '', supplementChn: ''
  });

  const saveToDb = async (data) => {
    const vocabPath = `artifacts/${appId}/users/${user.uid}/vocabulary`;
    await addDoc(collection(db, vocabPath), {
      ...data, favorite: false, createdAt: serverTimestamp()
    });
  };

  const handleSingle = async (e) => {
    e.preventDefault();
    if (!formData.word || !formData.definition) return;
    await saveToDb(formData);
    showToast(`單字「${formData.word}」已儲存`);
    setFormData({ word: '', pos: 'n.', definition: '', exampleEng: '', exampleChn: '', supplementEng: '', supplementChn: '' });
  };

  const handleBulk = async () => {
    const lines = bulkText.split('\n').filter(l => l.trim());
    let count = 0;
    for (const line of lines) {
      const [word, pos, def, exE, exC, supE, supC] = line.split(';').map(s => s?.trim());
      if (word && def) {
        await saveToDb({ 
          word, pos: pos || 'n.', definition: def, 
          exampleEng: exE || '', exampleChn: exC || '',
          supplementEng: supE || '', supplementChn: supC || ''
        });
        count++;
      }
    }
    showToast(`成功匯入 ${count} 個單字`);
    setBulkText('');
    setIsBulk(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-black text-gray-900 tracking-tight">{isBulk ? '大量匯入' : '新增單字'}</h2>
        <button 
          onClick={() => setIsBulk(!isBulk)} 
          className="px-6 py-2 bg-white border border-gray-200 rounded-2xl text-indigo-600 font-black text-sm shadow-sm hover:bg-indigo-50 transition-all"
        >
          {isBulk ? '切換單筆模式' : '切換大量模式'}
        </button>
      </div>

      {isBulk ? (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50 space-y-6">
          <div className="bg-amber-50 p-5 rounded-2xl flex gap-4 text-amber-800 border border-amber-100">
            <AlertCircle className="shrink-0" size={24} />
            <div className="text-sm">
              <p className="font-black mb-1 text-base">格式指南</p>
              <p className="opacity-80">請用分號隔開：單字; 詞性; 中文; 例句; 例句翻譯; 補充; 補充翻譯</p>
              <p className="mt-2 font-mono bg-white/50 p-2 rounded text-xs">abandon; v.; 放棄; He abandoned his dream.; 他放棄了夢想; ; </p>
            </div>
          </div>
          <textarea 
            rows="10" 
            className="w-full p-6 bg-gray-50 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 border-none font-mono text-sm leading-relaxed"
            placeholder="在此貼上多筆資料..."
            value={bulkText} onChange={e => setBulkText(e.target.value)}
          />
          <button onClick={handleBulk} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all">
            <UploadCloud size={24} /> 執行大量匯入
          </button>
        </div>
      ) : (
        <form onSubmit={handleSingle} className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-50 space-y-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">英文單字 *</label>
              <input required type="text" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 border-none text-lg font-bold" value={formData.word} onChange={e => setFormData({...formData, word: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">詞性</label>
              <select className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none border-none font-bold" value={formData.pos} onChange={e => setFormData({...formData, pos: e.target.value})}>
                <option value="n.">n.</option><option value="v.">v.</option><option value="adj.">adj.</option><option value="adv.">adv.</option><option value="phr.">phr.</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">中文定義 *</label>
            <input required type="text" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none border-none text-lg font-bold" value={formData.definition} onChange={e => setFormData({...formData, definition: e.target.value})} />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 text-indigo-400">英文例句</label>
              <textarea placeholder="例如：He is a persistent learner." className="w-full px-6 py-4 bg-indigo-50/30 rounded-2xl outline-none border-none text-sm font-medium" rows="3" value={formData.exampleEng} onChange={e => setFormData({...formData, exampleEng: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 text-indigo-400">例句翻譯</label>
              <textarea placeholder="例如：他是一個持之以恆的學習者。" className="w-full px-6 py-4 bg-indigo-50/30 rounded-2xl outline-none border-none text-sm font-medium" rows="3" value={formData.exampleChn} onChange={e => setFormData({...formData, exampleChn: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all">儲存單字</button>
        </form>
      )}
    </div>
  );
}

function Quiz({ vocab }) {
  const [current, setCurrent] = useState(0);
  const [shuffled, setShuffled] = useState([]);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setShuffled([...vocab].sort(() => Math.random() - 0.5));
  }, [vocab]);

  if (shuffled.length === 0) return <div className="text-center py-32 text-gray-300 font-bold bg-white rounded-3xl border border-dashed border-gray-200">目前單字庫空空如也</div>;

  const item = shuffled[current];

  return (
    <div className="max-w-md mx-auto py-10 text-center space-y-12">
      <div className="relative h-[28rem] w-full cursor-pointer perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
        {/* 正面：英文 */}
        <div className={`absolute inset-0 bg-white rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center p-12 transition-all duration-700 backface-hidden border border-gray-50 ${isFlipped ? 'rotate-y-180 opacity-0' : 'rotate-y-0'}`}>
           <span className="text-indigo-600 font-black mb-6 uppercase tracking-[0.3em] text-sm">{item.pos}</span>
           <h2 className="text-5xl font-black text-gray-900 tracking-tighter mb-4">{item.word}</h2>
           <div className="w-12 h-1.5 bg-indigo-100 rounded-full mt-8"></div>
           <p className="mt-16 text-gray-300 text-xs font-black uppercase tracking-widest animate-pulse">Tap to reveal meaning</p>
        </div>
        {/* 背面：中文 */}
        <div className={`absolute inset-0 bg-indigo-600 rounded-[3.5rem] shadow-2xl shadow-indigo-200 flex flex-col items-center justify-center p-12 transition-all duration-700 backface-hidden text-white ${isFlipped ? 'rotate-y-0 opacity-100' : 'rotate-y-180 opacity-0'}`}>
           <h2 className="text-4xl font-black mb-8 tracking-tight">{item.definition}</h2>
           <div className="space-y-4 px-4">
             <p className="text-indigo-100 text-base font-bold leading-relaxed italic line-clamp-3">"{item.exampleEng}"</p>
             <p className="text-indigo-200 text-sm font-medium">{item.exampleChn}</p>
           </div>
           <button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setTimeout(() => setCurrent((current + 1) % shuffled.length), 100); }} className="mt-12 bg-white text-indigo-600 px-12 py-4 rounded-2xl font-black shadow-xl active:scale-90 transition-transform">NEXT WORD</button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-6">
        <span className="text-gray-400 font-black tracking-widest">{current + 1} / {shuffled.length}</span>
        <button onClick={() => setShuffled([...shuffled].sort(() => Math.random() - 0.5))} className="p-3 bg-white text-gray-400 rounded-2xl hover:text-indigo-600 shadow-sm transition-colors border border-gray-50"><RotateCcw size={20}/></button>
      </div>
    </div>
  );
}

// 輔助動畫與旋轉 CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .perspective-1000 { perspective: 1000px; }
    .backface-hidden { backface-visibility: hidden; }
    .rotate-y-180 { transform: rotateY(180deg); }
    .rotate-y-0 { transform: rotateY(0deg); }
    @keyframes bounce {
      0%, 100% { transform: translate(-50%, -10px); }
      50% { transform: translate(-50%, 0); }
    }
    .animate-bounce { animation: bounce 1s infinite; }
  `;
  document.head.appendChild(style);
}