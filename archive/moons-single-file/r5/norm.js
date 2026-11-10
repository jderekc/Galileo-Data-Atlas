function normalData(hgt,w,h,strength){const d=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const l=hgt[y*w+(x+w-1)%w],r=hgt[y*w+(x+1)%w],u=hgt[Math.max(0,y-1)*w+x],dn=hgt[Math.min(h-1,y+1)*w+x];
    let nx=-(r-l)*strength,ny=(dn-u)*strength,nz=1;const L=Math.hypot(nx,ny,nz);nx/=L;ny/=L;nz/=L;const o=4*(y*w+x);d[o]=128+127*nx;d[o+1]=128+127*ny;d[o+2]=128+127*nz;d[o+3]=255}
  return d}
function normalFromHeight(hgt,w,h,strength){const c=mkCanvas(w,h);c.getContext('2d').putImageData(new ImageData(normalData(hgt,w,h,strength),w,h),0,0);return c}
