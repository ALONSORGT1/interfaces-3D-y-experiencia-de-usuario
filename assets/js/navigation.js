// A small walkability grid shared by companions and objective breadcrumbs.
export class Navigation {
  constructor(bounds){
    this.width=50;this.height=27;this.step=2;this.blocked=new Uint8Array(1350);
    const solids=bounds.filter(b=>b.position[1]+b.size[1]/2>.15&&b.position[1]-b.size[1]/2<1.8);
    for(let i=0;i<this.blocked.length;i++){
      const p=this.point(i);
      if(solids.some(b=>Math.abs(p.x-b.position[0])<b.size[0]/2+1.02&&Math.abs(p.z-b.position[2])<b.size[2]/2+1.02))this.blocked[i]=1;
    }
  }
  point(i){return {x:-49+(i%50)*2,z:-26+Math.floor(i/50)*2};}
  index(p){const x=Math.max(0,Math.min(49,Math.round((p.x+49)/2))),z=Math.max(0,Math.min(26,Math.round((p.z+26)/2)));return z*50+x;}
  nearest(p){
    const start=this.index(p);if(!this.blocked[start])return start;
    let best=-1,dist=Infinity;
    for(let i=0;i<this.blocked.length;i++)if(!this.blocked[i]){const q=this.point(i),d=(q.x-p.x)**2+(q.z-p.z)**2;if(d<dist){best=i;dist=d;}}
    return best;
  }
  route(from,to){
    const start=this.nearest(from),goal=this.nearest(to);if(start<0||goal<0)return [];
    const visited=new Int16Array(1350).fill(-1),queue=[start];visited[start]=start;
    for(let k=0;k<queue.length;k++){
      const i=queue[k];if(i===goal)break;
      const x=i%50,z=Math.floor(i/50);
      for(const n of [x>0?i-1:-1,x<49?i+1:-1,z>0?i-50:-1,z<26?i+50:-1])if(n>=0&&!this.blocked[n]&&visited[n]===-1){visited[n]=i;queue.push(n);}
    }
    if(visited[goal]===-1)return [];
    const path=[];for(let i=goal;i!==start;i=visited[i])path.push(this.point(i));path.push(this.point(start));return path.reverse();
  }
}
