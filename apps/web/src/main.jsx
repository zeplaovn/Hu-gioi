import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
function App() {
  const [health, setHealth] = useState('Đang kết nối…');
  useEffect(() => { const controller = new AbortController(); fetch('/api/health', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(x => setHealth(x.ok ? 'API đã kết nối' : 'API chưa sẵn sàng')).catch(e => { if (e.name !== 'AbortError') setHealth('Không thể kết nối API'); }); return () => controller.abort(); }, []);
  return <main style={{ fontFamily: 'system-ui', margin: '4rem auto', maxWidth: 700, padding: '1rem' }}><h1>Thiên Vân Đại Lục</h1><p>{health}</p><p>React/Vite migration shell. Gameplay cũ vẫn hoạt động ở ứng dụng legacy; chưa chuyển gameplay sang React.</p></main>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
