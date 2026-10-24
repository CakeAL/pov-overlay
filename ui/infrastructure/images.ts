import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { ImageAsset } from '../domain/types';
export const IMAGE_EXTENSIONS = ['png','jpg','jpeg','webp','gif','avif'];
export function imageSize(url:string):Promise<{width:number;height:number}> {
 return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(new Error('无法解码背景图。'));image.src=url;});
}
export async function readImageFile(file:File):Promise<ImageAsset> {
 if(file.size>20*1024*1024)throw new Error('背景图不能超过 20 MB。');
 const url=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('无法读取背景图。'));reader.readAsDataURL(file);});
 return {name:file.name,url,...await imageSize(url)};
}
export async function readNativeImage(path?:string):Promise<ImageAsset|null>{
 const selection=path??await open({multiple:false,filters:[{name:'背景图',extensions:IMAGE_EXTENSIONS}]});
 if(typeof selection!=='string')return null;
 const image=await invoke<{name:string;url:string}>('load_image',{path:selection});
 return {...image,...await imageSize(image.url)};
}
