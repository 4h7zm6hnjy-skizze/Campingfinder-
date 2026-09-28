/* Campingfinder local QR encoder – original client-side implementation.
   QR Code Version 8, error correction L, byte mode. No network requests. */
(function(global){
  'use strict';
  const VERSION=8, SIZE=49, DATA_PER_BLOCK=97, BLOCKS=2, EC_PER_BLOCK=24, MAX_BYTES=192;
  const EXP=new Uint8Array(512), LOG=new Uint8Array(256);
  let x=1;
  for(let i=0;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&0x100)x^=0x11d; }
  for(let i=255;i<512;i++) EXP[i]=EXP[i-255];
  const gfMul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
  function polyMul(a,b){ const out=new Array(a.length+b.length-1).fill(0); for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)out[i+j]^=gfMul(a[i],b[j]); return out; }
  function rsGenerator(n){ let g=[1]; for(let i=0;i<n;i++)g=polyMul(g,[1,EXP[i]]); return g; }
  const GEN24=rsGenerator(EC_PER_BLOCK);
  function rsEncode(data){ const msg=data.concat(new Array(EC_PER_BLOCK).fill(0)); for(let i=0;i<data.length;i++){ const coef=msg[i]; if(!coef)continue; for(let j=0;j<GEN24.length;j++)msg[i+j]^=gfMul(GEN24[j],coef); } return msg.slice(data.length); }
  function pushBits(bits,value,length){ for(let i=length-1;i>=0;i--)bits.push((value>>>i)&1); }
  function dataCodewords(text){
    const bytes=[...new TextEncoder().encode(text)];
    if(bytes.length>MAX_BYTES) throw new Error('QR_TEXT_TOO_LONG');
    const bits=[]; pushBits(bits,0b0100,4); pushBits(bits,bytes.length,8); bytes.forEach(b=>pushBits(bits,b,8));
    const cap=DATA_PER_BLOCK*BLOCKS*8;
    for(let i=0;i<Math.min(4,cap-bits.length);i++)bits.push(0);
    while(bits.length%8)bits.push(0);
    const out=[]; for(let i=0;i<bits.length;i+=8){ let v=0; for(let j=0;j<8;j++)v=(v<<1)|(bits[i+j]||0); out.push(v); }
    let toggle=true; while(out.length<DATA_PER_BLOCK*BLOCKS){ out.push(toggle?0xec:0x11); toggle=!toggle; }
    return out;
  }
  function interleaved(text){
    const data=dataCodewords(text), blocks=[], ecs=[];
    for(let b=0;b<BLOCKS;b++){ const block=data.slice(b*DATA_PER_BLOCK,(b+1)*DATA_PER_BLOCK); blocks.push(block); ecs.push(rsEncode(block)); }
    const out=[];
    for(let i=0;i<DATA_PER_BLOCK;i++)for(let b=0;b<BLOCKS;b++)out.push(blocks[b][i]);
    for(let i=0;i<EC_PER_BLOCK;i++)for(let b=0;b<BLOCKS;b++)out.push(ecs[b][i]);
    return out;
  }
  const bchDigit=n=>{let d=0;while(n){d++;n>>>=1;}return d;};
  function bchTypeInfo(data){ const G15=0x537, MASK=0x5412; let d=data<<10; while(bchDigit(d)-bchDigit(G15)>=0)d^=G15<<(bchDigit(d)-bchDigit(G15)); return ((data<<10)|d)^MASK; }
  function bchTypeNumber(data){ const G18=0x1f25; let d=data<<12; while(bchDigit(d)-bchDigit(G18)>=0)d^=G18<<(bchDigit(d)-bchDigit(G18)); return (data<<12)|d; }
  function makeMatrix(text){
    const code=interleaved(text), m=Array.from({length:SIZE},()=>Array(SIZE).fill(null));
    function finder(row,col){ for(let r=-1;r<=7;r++)for(let c=-1;c<=7;c++){ const rr=row+r,cc=col+c;if(rr<0||rr>=SIZE||cc<0||cc>=SIZE)continue; m[rr][cc]=(r>=0&&r<=6&&c>=0&&c<=6&&(r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4))); } }
    finder(0,0);finder(SIZE-7,0);finder(0,SIZE-7);
    const centers=[6,24,42];
    for(const row of centers)for(const col of centers){ if(m[row][col]!==null)continue; for(let r=-2;r<=2;r++)for(let c=-2;c<=2;c++)m[row+r][col+c]=(Math.max(Math.abs(r),Math.abs(c))===2||(r===0&&c===0)); }
    for(let i=8;i<SIZE-8;i++){ if(m[i][6]===null)m[i][6]=(i%2===0); if(m[6][i]===null)m[6][i]=(i%2===0); }
    const vbits=bchTypeNumber(VERSION); for(let i=0;i<18;i++){ const mod=((vbits>>>i)&1)===1; m[Math.floor(i/3)][i%3+SIZE-11]=mod; m[i%3+SIZE-11][Math.floor(i/3)]=mod; }
    const mask=0, format=bchTypeInfo((1<<3)|mask); // EC level L=1
    for(let i=0;i<15;i++){
      const mod=((format>>>i)&1)===1;
      if(i<6)m[i][8]=mod; else if(i<8)m[i+1][8]=mod; else m[SIZE-15+i][8]=mod;
      if(i<8)m[8][SIZE-i-1]=mod; else if(i<9)m[8][7]=mod; else m[8][15-i-1]=mod;
    }
    m[SIZE-8][8]=true;
    let byteIndex=0,bitIndex=7,row=SIZE-1,inc=-1;
    const maskFn=(r,c)=>(r+c)%2===0;
    for(let col=SIZE-1;col>0;col-=2){ if(col===6)col--; while(true){ for(let c=0;c<2;c++){ const cc=col-c; if(m[row][cc]!==null)continue; let dark=false; if(byteIndex<code.length)dark=((code[byteIndex]>>>bitIndex)&1)===1; if(maskFn(row,cc))dark=!dark; m[row][cc]=dark; bitIndex--; if(bitIndex<0){byteIndex++;bitIndex=7;} } row+=inc; if(row<0||row>=SIZE){row-=inc;inc=-inc;break;} } }
    return m;
  }
  function render(target,text,options={}){
    if(!target) return false;
    target.innerHTML='';
    const matrix=makeMatrix(text), quiet=4, scale=options.scale||5, side=(SIZE+quiet*2)*scale;
    const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox',`0 0 ${SIZE+quiet*2} ${SIZE+quiet*2}`); svg.setAttribute('width',String(side)); svg.setAttribute('height',String(side)); svg.setAttribute('role','img'); svg.setAttribute('aria-label','QR-Code'); svg.style.maxWidth='100%'; svg.style.height='auto';
    const bg=document.createElementNS(ns,'rect'); bg.setAttribute('width','100%');bg.setAttribute('height','100%');bg.setAttribute('fill','#fff');svg.appendChild(bg);
    let path=''; for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(matrix[r][c])path+=`M${c+quiet} ${r+quiet}h1v1h-1z`;
    const fg=document.createElementNS(ns,'path');fg.setAttribute('d',path);fg.setAttribute('fill','#111');svg.appendChild(fg); target.appendChild(svg); return true;
  }
  global.CampingfinderQR={render,makeMatrix,MAX_BYTES};
})(typeof window!=='undefined'?window:globalThis);
