/* Texture worker (module worker). Builds one texture per message and returns the pixel buffers. */
import {texData,normalData} from '../js/textures.js';
onmessage=function(e){const sp=e.data,r=texData(sp),n=sp.ns?normalData(r.hgt,r.W,r.H,sp.ns):new Uint8ClampedArray(4);postMessage({key:sp.key,W:r.W,H:r.H,rgba:r.rgba,nrm:n},[r.rgba.buffer,n.buffer])};
