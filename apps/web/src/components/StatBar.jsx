import React from'react';
export default function StatBar({label,value,max,tone=''}){const pct=Math.max(0,Math.min(100,max?value/max*100:0));return <div className={`statbar ${tone}`}><div><span>{label}</span><b>{Math.round(value).toLocaleString('vi-VN')} / {Math.round(max).toLocaleString('vi-VN')}</b></div><i><em style={{width:`${pct}%`}}/></i></div>}
