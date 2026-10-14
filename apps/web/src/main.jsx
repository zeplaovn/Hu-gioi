import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
function App() {
  const [api, setApi] = useState('checking');
  useEffect(() => { const c = new AbortController(); fetch('/api/health', {signal:c.signal}).then(r=>r.ok?r.json():Promise.reject(new Error('API unavailable'))).then(v=>setApi(v.ok?'online':'offline')).catch(e=>{if(e.name!=='AbortError')setApi('offline')}); return ()=>c.abort(); },[]);
  return <div className="shell"><header className="shell-header"><strong>Thiên Vân Đại Lục</strong><span role="status">API: {api==='checking'?'đang kiểm tra':api==='online'?'kết nối':'chưa kết nối'}</span></header><iframe title="Thiên Vân Đại Lục gameplay" className="game-frame" src="/legacy/index.html" /></div>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
