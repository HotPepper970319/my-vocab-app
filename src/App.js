import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, serverTimestamp 
} from 'firebase/firestore';
import { 
  BookOpen, Star, PlusCircle, GraduationCap, 
  Search, ChevronDown, Trash2, CheckCircle2,
  LogOut, X
} from 'lucide-react';

// --- 請在此填入你的真實 Firebase 配置 ---
// 如果使用環境變數無效，請直接將字串貼在引號內
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
const googleProvider = new GoogleAuthProvider();

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('library');
  const [vocabList, setVocabList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // 登入
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Auth Error:", err);
      alert("登入失敗：請檢查 Firebase Console 是否啟用了 Google 登入，並確認 API Key 正確。");
    }
  };

  // 登出
  const handleLogout = () => {
    if (window.confirm("確定要登出嗎？")) signOut(auth);
  };

  // 監聽登入狀態
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 監聽資料庫
  useEffect(() => {
    if (!user) return;
    const vocabPath = `artifacts/${appId}/users/${user.uid}/vocabulary`;
    const q = query(collection(db, vocabPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVocabList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Firestore Error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 max-w-sm w-full border border-gray-100">
        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200">
          <GraduationCap className="text-white w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">學測單字雲</h1>
        <p className="text-gray-500 font-medium">登入以同步您的個人單字庫</p>
        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-indigo-200 transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
          使用 Google 登入
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0 md:pl-64 font-sans antialiased text-slate-900">
      {/* 桌面側邊欄 */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 p-6 z-40">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl text-gray-800">學測單字雲</h1>
        </div>
        
        <div className="space-y-2">
          <NavItem icon={<BookOpen />} label="我的單字庫" active={activeTab === 'library'} onClick={() => setActiveTab('library')} />
          <NavItem icon={<Star />} label="收藏清單" active={activeTab === 'fav'} onClick={() => setActiveTab('fav')} />
          <NavItem icon={<PlusCircle />} label="新增單字" active={activeTab === 'add'} onClick={() => setActiveTab('add')} />
          <NavItem icon={<GraduationCap />} label="練習模式" active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} />
        </div>

        <div className="mt-auto pt-6 space-y-4">
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-3">
            {user.photoURL && <img src={user.photoURL} className="w-8 h-8 rounded-full shadow-sm" alt="avatar" />}
            <div className="overflow-hidden">
              <p className="text-xs font-black text-gray-800 truncate">{user.displayName}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-sm">
            <LogOut size={18} /> 登出帳號
          </button>
        </div>
      </nav>

      {/* 手機導航 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 flex justify-around p-3 z-50">
        <MobileNavItem icon={<BookOpen />} active={activeTab === 'library'} onClick={() => setActiveTab('library')} />
        <MobileNavItem icon={<PlusCircle />} active={activeTab === 'add'} onClick={() => setActiveTab('add')} />
        <MobileNavItem icon={<Star />} active={activeTab === 'fav'} onClick={() => setActiveTab('fav')} />
        <MobileNavItem icon={<GraduationCap />} active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} />
      </nav>

      {/* 主內容 */}
      <main className="flex-1 p-4 md:p-10 max-w-5xl mx-auto w-full">
        {activeTab === 'library' && <VocabLibrary vocab={vocabList} user={user} title="所有單字" />}
        {activeTab === 'fav' && <VocabLibrary vocab={vocabList.filter(v => v.favorite)} user={user} title="我的收藏" />}
        {activeTab === 'add' && <AddVocab user={user} showToast={showToast} />}
        {activeTab === 'quiz' && <Quiz vocab={vocabList} />}
      </main>

      {message && (
        <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          {message}
        </div>
      )}
    </div>
  );
}

// --- 子組件 ---

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}>
      {React.cloneElement(icon, { size: 20 })}
      <span className="font-semibold">{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`p-3 rounded-2xl transition-all ${active ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400'}`}>
      {React.cloneElement(icon, { size: 24 })}
    </button>
  );
}

function VocabLibrary({ vocab, user, title }) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = vocab
    .filter(v => v.word?.toLowerCase().includes(search.toLowerCase()) || v.definition?.includes(search))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const toggleFav = async (e, item) => {
    e.stopPropagation();
    const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, item.id);
    await updateDoc(docRef, { favorite: !item.favorite });
  };

  const remove = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('確定要刪除嗎？')) {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/vocabulary`, id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-4xl font-black text-gray-900 tracking-tight">{title}</h2>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="搜尋單字或中文..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 font-bold">
            找不到相關單字
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div 
                className="p-5 flex items-center justify-between cursor-pointer" 
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className="flex items-center gap-4">
                  <button onClick={(e) => toggleFav(e, item)}>
                    <Star className={`w-6 h-6 ${item.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                  </button>
                  <div>
                    <h3 className="font-black text-xl text-gray-800">
                      {item.word} 
                      <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">{item.pos}</span>
                    </h3>
                    <p className="text-gray-500 font-medium">{item.definition}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => remove(e, item.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                  <ChevronDown className={`text-gray-400 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} />
                </div>
              </div>
              {expandedId === item.id && (
                <div className="px-14 pb-6 pt-2 bg-indigo-50/30 space-y-3">
                  <div className="border-l-4 border-indigo-400 pl-4 py-1">
                    <p className="font-bold text-gray-700">{item.exampleEng}</p>
                    <p className="text-gray-500 text-sm">{item.exampleChn}</p>
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

function AddVocab({ user, showToast }) {
  const [formData, setFormData] = useState({ word: '', pos: 'n.', definition: '', exampleEng: '', exampleChn: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/vocabulary`), {
        ...formData,
        favorite: false,
        createdAt: serverTimestamp()
      });
      showToast(`${formData.word} 已成功加入單字庫`);
      setFormData({ word: '', pos: 'n.', definition: '', exampleEng: '', exampleChn: '' });
    } catch (err) {
      console.error(err);
      alert("儲存失敗，請檢查網路連線。");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-4xl font-black text-gray-900 tracking-tight text-center">新增單字</h2>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] shadow-xl space-y-6 border border-gray-50">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase ml-2">單字 Word</label>
            <input required className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.word} onChange={e => setFormData({...formData, word: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase ml-2">詞性</label>
            <select className="w-full px-4 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.pos} onChange={e => setFormData({...formData, pos: e.target.value})}>
              <option value="n.">n.</option>
              <option value="v.">v.</option>
              <option value="adj.">adj.</option>
              <option value="adv.">adv.</option>
              <option value="phr.">phr.</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase ml-2">中文定義 Definition</label>
          <input required className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.definition} onChange={e => setFormData({...formData, definition: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase ml-2">英文例句 Example Sentence</label>
          <textarea rows="2" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.exampleEng} onChange={e => setFormData({...formData, exampleEng: e.target.value})} />
        </div>
        <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
          儲存到雲端
        </button>
      </form>
    </div>
  );
}

function Quiz({ vocab }) {
  const [shuffled, setShuffled] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (vocab.length > 0) {
      setShuffled([...vocab].sort(() => Math.random() - 0.5));
    }
  }, [vocab]);

  if (shuffled.length === 0) return (
    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 font-bold">
      單字庫目前沒有單字，無法開始練習。
    </div>
  );

  const current = shuffled[currentIdx];

  const handleNext = (e) => {
    e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % shuffled.length);
    }, 200);
  };

  return (
    <div className="max-w-md mx-auto space-y-10 py-6">
      <div 
        className="relative h-[28rem] w-full cursor-pointer group" 
        style={{ perspective: '1000px' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full transition-all duration-500 transform-gpu ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
          {/* 正面 */}
          <div className="absolute inset-0 bg-white rounded-[3.5rem] shadow-xl flex flex-col items-center justify-center p-8 border border-gray-100 backface-hidden">
            <span className="text-indigo-600 font-black uppercase tracking-widest text-sm mb-4">{current.pos}</span>
            <h2 className="text-5xl font-black text-gray-900 tracking-tighter">{current.word}</h2>
            <p className="mt-20 text-gray-300 font-bold text-xs animate-pulse">點擊翻看定義</p>
          </div>
          {/* 反面 */}
          <div className="absolute inset-0 bg-indigo-600 rounded-[3.5rem] shadow-xl flex flex-col items-center justify-center p-10 text-white rotate-y-180 backface-hidden">
            <h2 className="text-4xl font-black mb-6">{current.definition}</h2>
            <div className="bg-indigo-500/30 p-4 rounded-2xl border border-indigo-400/30 max-w-full">
              <p className="text-indigo-100 text-sm italic line-clamp-3">"{current.exampleEng}"</p>
            </div>
            <button onClick={handleNext} className="mt-10 bg-white text-indigo-600 px-10 py-3 rounded-2xl font-black hover:bg-gray-50 transition-colors">
              下一個
            </button>
          </div>
        </div>
      </div>
      <div className="flex justify-center items-center gap-4 text-gray-400 font-black tracking-widest">
        <span>{currentIdx + 1}</span>
        <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${((currentIdx + 1) / shuffled.length) * 100}%` }}></div>
        </div>
        <span>{shuffled.length}</span>
      </div>
    </div>
  );
}

// 翻牌所需 CSS
const style = document.createElement('style');
style.textContent = `
  .rotate-y-180 { transform: rotateY(180deg); }
  .backface-hidden { backface-visibility: hidden; }
  .perspective-1000 { perspective: 1000px; }
`;
document.head.appendChild(style);