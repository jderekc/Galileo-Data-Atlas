/* Data loading: the pack and the single source of truth for body radii are separate files fetched at run time. */
const DATA=new URL('../../public/data/',import.meta.url);
export async function loadJSON(name){const r=await fetch(new URL(name,DATA));if(!r.ok)throw new Error(name+': HTTP '+r.status);return r.json()}
export async function loadPack(){const [P,bodies]=await Promise.all([loadJSON('moons_pack.json'),loadJSON('bodies.json')]);P.bodies=bodies;return P}
