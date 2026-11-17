import {createRoot} from 'react-dom/client';
import {lazy,Suspense,useEffect,useState} from 'react';
import '../app/globals.css';
import '../app/research.css';
import '../app/atlas.css';
import '../app/workflow.css';
const Home=lazy(()=>import('../app/page'));
const RaceLab=lazy(()=>import('../components/lab/RaceLab'));
const CircuitAtlas=lazy(()=>import('../components/lab/CircuitAtlas'));
function PagesApp(){
 const [route,setRoute]=useState(location.hash);
 useEffect(()=>{const navigate=()=>{setRoute(location.hash);window.scrollTo(0,0);};window.addEventListener('hashchange',navigate);return()=>window.removeEventListener('hashchange',navigate);},[]);
 return <Suspense fallback={<p style={{padding:32}}>Loading workspace…</p>}>{route==='#circuits'?<CircuitAtlas/>:route==='#history'?<RaceLab key="history" mode="history"/>:route==='#predictions'?<RaceLab key="predictions" mode="predictions"/>:<Home/>}</Suspense>;
}
createRoot(document.getElementById('root')!).render(<PagesApp/>);

