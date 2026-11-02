import {buildInvasaoJavaporcos} from './map_invasao_javaporcos.js';
export {INVASAO_JAVAPORCOS_PROPS as DISTRITO_RURAL_PROPS,preloadJavaporcos} from './map_invasao_javaporcos.js';
export const buildDistritoRural=(scene,textures)=>buildInvasaoJavaporcos(scene,textures,'rural');
