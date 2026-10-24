import {open,save} from '@tauri-apps/plugin-dialog';
import {invoke} from '@tauri-apps/api/core';
import {native} from '../media';
export async function readNativeDocument():Promise<string|null>{const path=await open({multiple:false,filters:[{name:'POV JSON',extensions:['json']}]});return typeof path==='string'?invoke<string>('read_document',{path}):null;}
export async function saveDocument(name:string,content:string):Promise<boolean>{
 if(content.length>100*1024*1024)throw new Error('工程不能超过 100 MB。');
 if(native){const path=await save({defaultPath:name,filters:[{name:'POV JSON',extensions:['json']}]});if(!path)return false;await invoke('write_document',{path,content});}
 else{const url=URL.createObjectURL(new Blob([content],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return true;
}
