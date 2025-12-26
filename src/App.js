import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, serverTimestamp 
} from 'firebase/firestore';
import { 
  BookOpen, Star, PlusCircle, GraduationCap, 
  LogOut, AlertTriangle, CheckCircle2
} from 'lucide-react';

// --- 請務必將這裡替換為你從 Firebase Console 取得的資料 ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const appId = "my-vocab-app";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState(null);
  const [vocabList, setVocabList] = useState([]);

  // 1. 處理登入狀態監聽與重新導向結果
  useEffect(() => {
    // 檢查是否有重新導向登入的結果
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) setUser(result.user);
      })
      .catch((error) => {
        console.error("Redirect Error:", error);
        setErrorDetails(error.code);
      });

    // 監聽登入狀態改變
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. 登入成功後獲取資料
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'vocabulary'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setVocabList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, 
      (err) => console.error("Firestore Error:", err)
    );
    return () => unsubscribe();
  }, [user]);

  // 3. 登入處理邏輯
  const handleLogin = async () => {
    setErrorDetails(null);
    try {
      // 優先嘗試彈窗登入
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login Error:", err);
      // 如果彈窗被阻擋或出錯，自動嘗試重新導向登入
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (reErr) {
          setErrorDetails(reErr.code);
        }
      } else {
        setErrorDetails(err.code);
      }
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white font-bold text-indigo-600 animate-pulse">
      載入中...
    </div>
  );

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-sm text-center border border-slate-100">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-100">
            <GraduationCap className="text-white w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">學測單字雲</h1>
          <p className="text-slate-500 font-medium mb-8">請登入以同步學習進度</p>

          {/* 錯誤診斷區塊 */}
          {errorDetails && (
            <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100 text-left">
              <div className="flex items-center gap-2 mb-1 text-red-700 font-bold text-sm">
                <AlertTriangle size={16} /> 登入失敗
              </div>
              <p className="text-red-600 text-[11px] font-mono break-all">{errorDetails}</p>
              <div className="mt-2 pt-2 border-t border-red-100 text-[10px] text-red-500 italic">
                {errorDetails === 'auth/operation-not-allowed' && "原因：Firebase Console 沒開啟 Google 登入。"}
                {errorDetails === 'auth/unauthorized-domain' && "原因：目前的網址不在 Firebase 授權網域白名單內。"}
                {errorDetails === 'auth/invalid-api-key' && "原因：API Key 填寫錯誤。"}
              </div>
            </div>
          )}

          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:border-indigo-500 transition-all shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
            使用 Google 登入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">我的單字庫</h2>
            <p className="text-slate-500 font-medium">Hello, {user.displayName} 👋</p>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-500 font-bold transition-all hover:bg-red-50 rounded-xl"
          >
            <LogOut size={18} /> 登出
          </button>
        </header>

        <div className="grid gap-4">
          {vocabList.map(v => (
            <div key={v.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-indigo-600">{v.word}</h3>
                <p className="text-slate-500">{v.definition}</p>
              </div>
              <Star className={v.favorite ? "fill-yellow-400 text-yellow-400" : "text-slate-200"} />
            </div>
          ))}
          {vocabList.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold">
              單字庫空空的，快去新增單字吧！
            </div>
          )}
        </div>
      </div>
    </div>
  );
}