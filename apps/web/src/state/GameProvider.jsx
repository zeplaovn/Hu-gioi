import React,{createContext,useContext,useEffect,useMemo,useReducer,useRef,useState}from'react';
import { gameReducer } from '../game/reducer.js';
import { emptyState } from '../game/state.js';
import * as cloud from '../services/client.js';
const GameContext=createContext(null);
export function GameProvider({children}){
  const[state,dispatch]=useReducer(gameReducer,undefined,emptyState);const[ready,setReady]=useState(false);const[revision,setRevision]=useState(0);const[sync,setSync]=useState('loading');const hydrated=useRef(false);const saveTimer=useRef(null);
  useEffect(()=>{let live=true;(async()=>{try{const row=await cloud.loadSave();if(!live)return;if(row?.save){dispatch({type:'HYDRATE',payload:row.save});setRevision(Number(row.rev||0));}setSync('synced');}catch{setSync('error')}finally{if(live){hydrated.current=true;setReady(true)}}})();return()=>{live=false}},[]);
  useEffect(()=>{if(!ready||!hydrated.current||!state.created)return;clearTimeout(saveTimer.current);setSync('dirty');saveTimer.current=setTimeout(async()=>{setSync('syncing');try{const r=await cloud.saveGame({version:2,state},state.meta,revision,false);setRevision(Number(r?.rev||revision));setSync('synced')}catch(e){if(e?.data?.message==='conflict'){try{const row=await cloud.loadSave();dispatch({type:'HYDRATE',payload:row?.save});setRevision(Number(row?.rev||0));setSync('server-newer')}catch{setSync('error')}}else setSync('error')}},8000);return()=>clearTimeout(saveTimer.current)},[state,ready,revision]);
  useEffect(()=>{const id=setInterval(()=>dispatch({type:'TICK',now:Math.floor(Date.now()/1000)}),1000);return()=>clearInterval(id)},[]);
  const actions=useMemo(()=>({create:p=>dispatch({type:'CREATE',payload:p}),train:()=>dispatch({type:'TRAIN'}),rest:()=>dispatch({type:'REST'}),explore:()=>dispatch({type:'EXPLORE'}),breakthrough:()=>dispatch({type:'BREAKTHROUGH'}),plant:id=>dispatch({type:'PLANT',id}),harvest:id=>dispatch({type:'HARVEST',id}),craft:id=>dispatch({type:'CRAFT',id}),joinSect:name=>dispatch({type:'JOIN_SECT',name}),sectMission:()=>dispatch({type:'SECT_MISSION'}),travel:id=>dispatch({type:'TRAVEL',id}),reincarnate:()=>dispatch({type:'REINCARNATE'}),reset:()=>dispatch({type:'RESET'})}),[]);
  return <GameContext.Provider value={{state,actions,ready,sync,revision}}>{children}</GameContext.Provider>;
}
export const useGame=()=>{const v=useContext(GameContext);if(!v)throw new Error('GameProvider missing');return v};
