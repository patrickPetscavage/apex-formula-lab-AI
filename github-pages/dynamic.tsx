import {lazy,Suspense,type ComponentType} from 'react';
// The existing three lazy client-only views need no Next server on Pages.
export default function dynamic<P extends object>(loader:()=>Promise<{default:ComponentType<P>}>,options?:{ssr?:boolean;loading?:ComponentType}){
 const Component=lazy(loader),Loading=options?.loading;
 return function ClientOnly(props:P){return <Suspense fallback={Loading?<Loading/>:null}><Component {...props}/></Suspense>;};
}
