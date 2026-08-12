import sharp from 'sharp';
const [, , dir, output] = process.argv;
const names = ['crouch-front','crouch-side','death-front','death-side'];
const labels = ['CROUCH FRONT','CROUCH SIDE','DEATH FRONT','DEATH SIDE'];
const panels=[];
for(let i=0;i<names.length;i++){
  const image=await sharp(`${dir}/lenda-lanhouse-v4-${names[i]}.png`).resize(600,600).png().toBuffer();
  const label=Buffer.from(`<svg width="600" height="600"><rect x="0" y="0" width="600" height="46" fill="#101522" fill-opacity=".92"/><text x="20" y="31" font-family="sans-serif" font-size="22" font-weight="700" fill="#f1d06b">${labels[i]}</text></svg>`);
  panels.push(await sharp(image).composite([{input:label,top:0,left:0}]).png().toBuffer());
}
await sharp({create:{width:1200,height:1200,channels:4,background:'#090c14'}}).composite(panels.map((input,i)=>({input,left:(i%2)*600,top:Math.floor(i/2)*600}))).png().toFile(output);
console.log(output);
