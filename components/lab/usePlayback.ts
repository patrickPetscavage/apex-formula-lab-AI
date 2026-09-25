'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {clockTime,changeClock,type PlaybackClock} from '@/lib/sim/motion';
export function usePlayback(duration:number){
 const clock=useRef<PlaybackClock>({time:0,wall:0,rate:1,playing:false,duration});
 clock.current.duration=duration;
 const [time,publishTime]=useState(0),[playing,publishPlaying]=useState(false),[rate,publishRate]=useState(1);
 const getTime=useCallback(()=>clockTime(clock.current,performance.now()),[]);
 const setTime=useCallback((time:number)=>{changeClock(clock.current,performance.now(),{time});publishTime(clockTime(clock.current,performance.now()));},[]);
 const setPlaying=useCallback((playing:boolean)=>{const t=changeClock(clock.current,performance.now(),{playing});publishTime(t);publishPlaying(playing);},[]);
 const setRate=useCallback((rate:number)=>{publishTime(changeClock(clock.current,performance.now(),{rate}));publishRate(rate);},[]);
 useEffect(()=>{if(!playing)return;let frame=0,last=-Infinity;
 const tick=(now:number)=>{const t=clockTime(clock.current,now);if(t>=clock.current.duration){setPlaying(false);return;}if(now-last>=1000/30){publishTime(t);last=now;}frame=requestAnimationFrame(tick);};
 frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing,setPlaying]);
 return {time,setTime,playing,setPlaying,rate,setRate,getTime};
}
