import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const ids=['mariabonita','lampiao','bandeirante','boto','zumbi','curupira','saci','caipora'];
mkdirSync('public/img/social-chars',{recursive:true});
for(const id of ids){
 const r=spawnSync('ffmpeg',['-v','error','-threads','1','-ss','1','-i',`public/video/chars/${id}.webm`,'-frames:v','1','-vf','scale=300:365:force_original_aspect_ratio=decrease','-threads','1','-y',`public/img/social-chars/${id}.png`],{encoding:'utf8'});
 if(r.status!==0)throw Error(`${id}: ${r.stderr?.slice(0,300) || r.error?.message}`);
 console.log('Portrait extracted:',id);
}
