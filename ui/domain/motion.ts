import type { Sample,Track } from './types';
import {distance} from "./geography";
const MAX_GAP_MS=30_000;
const rad=(v:number)=>v*Math.PI/180;
export function bearing(a:Sample,b:Sample):number|null {
 if(distance(a,b)<0.5)return null;
 const lat1=rad(a.latitude),lat2=rad(b.latitude),lon=rad(b.longitude-a.longitude);
 return (Math.atan2(Math.sin(lon)*Math.cos(lat2),Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon))*180/Math.PI+360)%360;
}
export function angleBetween(a:number|null|undefined,b:number|null|undefined,t:number):number|null {
 if(a==null)return b??null;if(b==null)return a;
 return (a+(((b-a+540)%360)-180)*t+360)%360;
}
/** A cached, time-weighted local linear fit, followed by monotone cubic interpolation. */
export function prepareMotion(track:Track,windowSeconds:number):Track {
 const points=track.samples.map(p=>({...p}));let total=0;
 for(let start=0;start<points.length;){
  let end=start+1;
  while(end<points.length && points[end]!.segment===points[end-1]!.segment && points[end]!.timestampMs-points[end-1]!.timestampMs<=MAX_GAP_MS)end++;
  let heading:number|null=null,lo=start,hi=start;
  for(let i=start;i<end;i++){
   const p=points[i]!,raw=track.samples;
   if(i>start){total+=distance(points[i-1]!,p);heading=bearing(points[i-1]!,p)??heading;}
   else if(i+1<end)heading=bearing(p,points[i+1]!);
   p.headingDeg=heading;p.distanceMeters=total;
   if(windowSeconds>0){
    const radius=windowSeconds*500;
    while(lo<i&&raw[lo]!.timestampMs<p.timestampMs-radius)lo++;
    while(hi<end&&raw[hi]!.timestampMs<=p.timestampMs+radius)hi++;
    let w=0,x=0,xx=0,y=0,xy=0;
    const stride=Math.max(1,Math.ceil((hi-lo)/128));
    for(let j=lo;j<hi;j+=stride){const q=raw[j]!,dt=(q.timestampMs-p.timestampMs)/1000,weight=Math.exp(-2*(dt/(windowSeconds/2))**2);w+=weight;x+=weight*dt;xx+=weight*dt*dt;y+=weight*q.speedMps;xy+=weight*dt*q.speedMps;}
    const determinant=w*xx-x*x;
    p.speedMps=Math.max(0,determinant>1e-12?(y*xx-xy*x)/determinant:w?y/w:p.speedMps);
   }
  }
  for(let i=start;i<end;i++){
   const p=points[i]!;
   const slope=(j:number)=>(points[j+1]!.speedMps-points[j]!.speedMps)/((points[j+1]!.timestampMs-points[j]!.timestampMs)/1000);
   if(end-start===1)p.speedSlope=0;
   else if(i===start)p.speedSlope=slope(i);
   else if(i===end-1)p.speedSlope=slope(i-1);
   else {const a=slope(i-1),b=slope(i),h1=(p.timestampMs-points[i-1]!.timestampMs)/1000,h2=(points[i+1]!.timestampMs-p.timestampMs)/1000,w1=2*h2+h1,w2=h2+2*h1;p.speedSlope=a*b<=0?0:(w1+w2)/(w1/a+w2/b);}
  }
  start=end;
 }
 return {...track,samples:points};
}
export function cubicSpeed(a:Sample,b:Sample,t:number):number {
 if(a.speedSlope==null||b.speedSlope==null)return a.speedMps+(b.speedMps-a.speedMps)*t;
 const h=(b.timestampMs-a.timestampMs)/1000,t2=t*t,t3=t2*t;
 const value=(2*t3-3*t2+1)*a.speedMps+(t3-2*t2+t)*h*a.speedSlope+(-2*t3+3*t2)*b.speedMps+(t3-t2)*h*b.speedSlope;
 return Math.max(0,Math.min(Math.max(a.speedMps,b.speedMps),Math.max(Math.min(a.speedMps,b.speedMps),value)));
}
