import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
// Independent static build: does not import Sites identity or server bindings.
const base=process.env.PAGES_BASE_PATH??'/apex-formula-lab-AI/';
export default defineConfig({
 root:root+'github-pages',base,publicDir:root+'public',
 plugins:[react(),{name:'pages-public-links',enforce:'pre',transform(code,id){
  if(!id.startsWith(root)||!id.endsWith('.tsx'))return;
  return code.replace(/href="\/(apex-formula-lab-source\.zip|data\/[^"\s]+)"/g,(_,asset)=>`href="${base}${asset}"`);
 }}],
 resolve:{alias:[{find:'next/dynamic',replacement:root+'github-pages/dynamic.tsx'},{find:'@',replacement:root}]},
 build:{outDir:root+'dist-pages',emptyOutDir:true},
});
