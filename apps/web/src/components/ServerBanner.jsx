import React from'react';import{useServer}from'../state/ServerProvider.jsx';
export default function ServerBanner(){const{banner}=useServer();if(!banner?.body)return null;return <div className={`server-banner ${banner.level||'info'}`}><b>{banner.title||'Thiên Đạo'}</b><span>{banner.body}</span></div>}
