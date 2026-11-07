'use strict';
const trim=(v,min,max)=>Math.min(max,Math.max(min,v));
const fixed=(v,n=1)=>Number(v).toFixed(n);
const mean=a=>a.reduce((s,v)=>s+Number(v),0)/Math.max(1,a.length);
const range=(a,b)=>Math.abs(Number(a)-Number(b));
const reverse=v=>11-v;
function koParticle(word,finalForm,vowelForm){const t=String(word),c=t.charCodeAt(t.length-1);const hasFinal=c>=0xAC00&&c<=0xD7A3?(c-0xAC00)%28!==0:false;return t+(hasFinal?finalForm:vowelForm);}
const bandIndex=v=>v<4.5?0:v<6.8?1:2;
function clampScores(a){return a.map(v=>Math.round(trim(v,1,10)*100)/100);}
function scoreAnswers(answers,choices){
 if(!Array.isArray(answers)||answers.length!==40||answers.some(v=>!Number.isInteger(Number(v))||Number(v)<1||Number(v)>10))throw Error('1~10점 문항 40개를 모두 답해주세요.');
 if(!Array.isArray(choices)||choices.length!==8||choices.some(v=>!Number.isInteger(Number(v))||Number(v)<0||Number(v)>3))throw Error('상황 선택 8개를 모두 답해주세요.');
 const base=DOMAINS.map((d,i)=>mean(QUESTIONS.filter(q=>q.axis===i).map(q=>q.reverse?reverse(answers[q.id]):Number(answers[q.id]))));
 const adjust=Array(6).fill(0);SCENARIOS.forEach((s,i)=>s.opts[choices[i]][1].forEach((x,j)=>adjust[j]+=x));
 const axes=clampScores(base.map((x,i)=>x+adjust[i]*.12));
 const facets=DOMAINS.flatMap((d,i)=>{const q=QUESTIONS.filter(x=>x.axis===i),half=q.length/2;return [mean(q.slice(0,half).map(x=>x.reverse?reverse(answers[x.id]):Number(answers[x.id]))),mean(q.slice(half).map(x=>x.reverse?reverse(answers[x.id]):Number(answers[x.id])))]}).map(v=>Math.round(v*100)/100);
 return {axes,facets,choices:choices.map(Number)};
}
function hslHex(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1));return '#'+[f(0),f(8),f(4)].map(v=>Math.round(255*v).toString(16).padStart(2,'0')).join('').toUpperCase();}
function rgb(h){return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));}
function contrastColor(h){const [r,g,b]=rgb(h);return (r*299+g*587+b*114)/1000>159?'#213747':'#ffffff';}
function mixColors(hexes){const vals=hexes.map(rgb),x=ch=>Math.round(255*Math.pow(mean(vals.map(v=>Math.pow(v[ch]/255,2.2))),1/2.2));return '#'+[x(0),x(1),x(2)].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();}
const sector=(x,y,size)=>Math.floor((((Math.atan2(y,x)*180/Math.PI+360)%360)+360/size/2)/(360/size))%size;
function notePick(f,i,j,k,l){return (f[i]>f[j]?2:0)+(f[k]>f[l]?1:0);}
function chroma(p){const a=p.axes, f=p.facets?.length===12?p.facets:a.flatMap(x=>[x,x]),s=p.choices?.length===8?p.choices:Array(8).fill(1);
 const eventBias=(s[0]-1.5)*.14+(s[3]-1.5)*.22;
 const x=.72*(a[0]-5.5)+.43*(a[4]-5.5)-.52*(a[2]-5.5)+.32*(f[0]-f[1])+eventBias;
 const y=.58*(a[1]-5.5)+.51*(a[5]-5.5)-.34*(a[3]-5.5)+.23*(f[8]-f[9])+(s[6]-1.5)*.18;
 const hue=(Math.atan2(y,x)*180/Math.PI+360)%360;
 const sat=Math.round(trim(44+2.1*(a[0]-5.5)+2.4*(a[1]-5.5)+1.2*(f[10]-f[11]),22,83));
 const lit=Math.round(trim(52+1.7*(a[5]-5.5)+1.4*(a[4]-5.5)-1.7*(a[2]-5.5),29,77));
 const idx=Math.floor((hue+7.5)/15)%24;
 const color=COLOR_FAMILIES[idx],tone=lit<38?'그늘진':lit<50?'깊은':lit<63?'선명한':'투명한',texture=sat<38?'안개':sat<52?'숨결':sat<66?'잔광':'불꽃';
 const topFam=sector(a[5]-5.5+.3*(f[10]-f[11]),a[1]-a[4]+.22*(s[7]-1.5),6);
 const heartFam=sector(a[1]-a[0]+.22*(f[2]-f[3]),a[4]-a[3]+.25*(s[4]-1.5),6);
 const baseFam=sector(a[2]-a[5]+.25*(f[4]-f[5]),a[3]-a[0]+.25*(s[2]-1.5),6);
 const ti=notePick(f,10,11,0,1),mi=notePick(f,2,3,8,9),bi=notePick(f,4,5,6,7);
 const top=NOTES[topFam].top[ti],heart=NOTES[heartFam].mid[mi],base=NOTES[baseFam].base[bi];
 return {hex:hslHex(hue,sat,lit),hue,sat,lit,family:color[0],colorDescription:color[1],name:`${tone} ${color[0]} · ${texture}의 결`,top,heart,base,accord:`${top}과 ${base} 사이`,noteFamilies:[NOTES[topFam],NOTES[heartFam],NOTES[baseFam]],noteSignature:[topFam*4+ti,heartFam*4+mi,baseFam*4+bi]};
}
function reportNarratives(p){const a=p.axes, c=chroma(p),bs=a.map(bandIndex),mom=i=>SCENARIOS[i].opts[p.choices?.[i]??1][2];return {
 intro:`이 색은 단순히 밝거나 어두운 마음을 뜻하지 않는다. ${DOMAINS[a.indexOf(Math.max(...a))].name}에서 특히 분명한 선택이 드러났고, ${DOMAINS[a.indexOf(Math.min(...a))].name}에서는 다른 속도로 마음이 움직인다. 그 어긋남이 이 캐릭터만의 색을 만든다.`,
 decision:`${BAND_TEXTS[0][bs[0]]} ${mom(0)} ${mom(3)}`,
 care:`${BAND_TEXTS[1][bs[1]]} ${BAND_TEXTS[4][bs[4]]} ${mom(1)}`,
 memory:`${BAND_TEXTS[2][bs[2]]} ${BAND_TEXTS[3][bs[3]]} ${mom(2)}`,
 healing:`${BAND_TEXTS[5][bs[5]]} ${mom(5)} ${mom(7)}`,
 perfume:`첫 순간의 ${c.top}은(는) ${c.noteFamilies[0].desc}을 상징한다. 중심으로 옮겨 가면 ${c.heart}이(가) 드러나 ${c.noteFamilies[1].desc}을 남긴다. 오래 지나 남는 ${c.base}은(는) ${c.noteFamilies[2].desc}을 떠올리게 한다. 이는 실제 체취나 과학적 진단이 아니라, 사건을 겪고 선택하는 방식을 향수의 시간 구조로 번역한 기록이다.`,
 afterglow:`이 캐릭터를 처음 만나는 사람은 ${c.lit>63?'밝은 인상':c.lit<42?'차분한 인상':'절제된 인상'}을 먼저 볼 수 있다. 그러나 오래 함께한 사람은 ${DOMAINS[a.indexOf(Math.max(...a))].short}의 태도가 겉으로 드러나는 인상보다 오래 남는다는 사실을 알아차릴지도 모른다. ${mom(4)}`
};}
function pairResult(a,b){const dif=DOMAINS.map((d,i)=>range(a.axes[i],b.axes[i]));const largest=dif.indexOf(Math.max(...dif)),smallest=dif.indexOf(Math.min(...dif));const contrast=Math.max(...dif)>2.25;const anchor=contrast?largest:smallest;const primary=PAIR_AXES[anchor];
 const high=[mean([a.axes[4],b.axes[4]])>=5.5,mean([a.axes[2],b.axes[2]])>=5.5,mean([a.axes[5],b.axes[5]])>=5.5];const postureIndex=(high[0]?4:0)+(high[1]?2:0)+(high[2]?1:0);const posture=PAIR_POSTURES[postureIndex];
 const subtype=contrast?'대비':'공명';const title=`${contrast?primary.contrast:primary.match} · ${posture[0]}`;const color=mixColors([chroma(a).hex,chroma(b).hex]);
 const common=DOMAINS[smallest].short,difference=DOMAINS[largest].short;
 const dir=(p,q)=>{
  const protect=p.axes[1]-q.axes[1],open=p.axes[4]-q.axes[4],memory=p.axes[2]-q.axes[2];
  const first=protect>1.5?`${koParticle(p.name,"은","는")} ${koParticle(q.name,"이","가")} 감당할 위험을 먼저 덜어 주고 싶어 할 수 있다. 하지만 그것이 상대의 선택을 대신하는 일인지 확인할 필요가 있다.`:protect< -1.5?`${koParticle(p.name,"은","는")} ${q.name}에게 스스로 판단할 자리를 남겨 두려 한다. 상대는 그 거리를 믿음으로 느낄 수도, 무관심으로 오해할 수도 있다.`:`${koParticle(p.name,"은","는")} ${q.name}의 안전을 생각하면서도 개입할 시점을 가늠한다. 작은 확인과 동의가 둘 사이의 언어가 된다.`;
  const second=open<-1.5?'자기 약점을 곧바로 말로 꺼내기보다는 행동이나 침묵으로 신뢰를 표현하는 편이다.':open>1.5?'상대가 아직 준비되지 않았더라도 마음의 문을 조금 먼저 열 수 있다.':'마음을 열어 보이는 속도가 상대와 크게 다르지 않아 편안한 대화의 출발점이 있다.';
  const third=memory>1.5?'둘이 겪은 같은 사건도 오래 붙잡아 둘 가능성이 크며, 가끔은 떠올리고 싶지 않은 기억까지 보관한다.':memory< -1.5?'과거보다 지금 할 수 있는 일을 살펴보며 다른 방식의 회복을 제안할 수 있다.':'둘의 기억을 서로 다른 문장으로 말하더라도 상대의 말을 끝까지 들어 줄 여지가 있다.';
  return `${first} ${second} ${third}`;
 };
 const ca=chroma(a),cb=chroma(b);return {title,typeId:anchor*2+(contrast?1:0),subtype,postureId:postureIndex,variants:96,color,common,difference,axisId:anchor,primary:contrast?primary.textContrast:primary.textMatch,posture:posture[1],fromA:dir(a,b),fromB:dir(b,a),scent:`첫 인상에서는 ${koParticle(ca.top,"과","와")} ${koParticle(cb.top,"이","가")} 서로 다른 방향에서 도착한다. 중심에는 ${koParticle(ca.heart,"과","와")} ${koParticle(cb.heart,"이","가")} 겹치고, 마지막에는 ${koParticle(ca.base,"과","와")} ${koParticle(cb.base,"이","가")} 남는다. 이 조향은 어느 한쪽이 다른 한쪽을 덮어쓰는 방식이 아니라 두 사람의 시간차를 하나의 잔향에 기록한다.`,risk:dif[largest]>3.5?`두 사람은 ${difference}에서 차이가 크다. 다정함이나 책임감의 유무가 아니라 표현과 판단의 순서가 달라 생기는 오해에 주의해야 한다.`:`${difference}의 차이가 관계에서 작은 불협화음을 만들 수 있다. 하지만 서로를 해석할 질문을 남긴다는 점에서는 장점이 될 수 있다.`,support:`둘이 가장 닮은 영역은 ${common}이다. 그 공통점은 위기의 해결책일 수도, 서로 같은 방식으로 실수할 가능성일 수도 있다. 둘 사이에 좋은 결과를 보장하는 수치는 아니다.`};}
function trioResult(ps){const axes=DOMAINS.map((d,i)=>ps.map(p=>p.axes[i]));const spreads=axes.map(v=>Math.max(...v)-Math.min(...v));const variable=spreads.indexOf(Math.max(...spreads)),common=spreads.indexOf(Math.min(...spreads));const color=mixColors(ps.map(p=>chroma(p).hex));const sorted=(i)=>ps.slice().sort((a,b)=>b.axes[i]-a.axes[i]);const guide=sorted(0)[0],protector=sorted(1)[0],memory=sorted(2)[0];return {color,common,variable,guide,protector,memory,title:`세 겹으로 남은 ${DOMAINS[common].short}`,description:`세 사람에게 가장 가까운 성향은 ${DOMAINS[common].short}이고, 가장 큰 차이는 ${DOMAINS[variable].short}에 있다. 같은 장면을 통과해도 셋 모두 다른 대답을 할 수 있다. 이 조합의 특징은 세 사람이 완전히 같아지는 데 있지 않고, 서로가 놓친 해석을 한 사람씩 보태는 데 있다.`,roles:`${koParticle(guide.name,"은","는")} 선택의 무게를 먼저 고민하는 자리, ${koParticle(protector.name,"은","는")} 보호와 개입을 먼저 생각하는 자리, ${koParticle(memory.name,"은","는")} 기억을 오래 확인하는 자리에 가까울 수 있다. 역할은 고정 배정이 아니며 한 사람이 여러 자리를 맡을 수도 있다.`,scent:`처음에는 ${ps.map(p=>chroma(p).top).join(' · ')}의 향이 이어지고, 가운데는 ${ps.map(p=>chroma(p).heart).join(' · ')}의 결이 포개진다. 마지막에는 ${ps.map(p=>chroma(p).base).join(' · ')}의 흔적이 서로 다른 길이로 남는다. 세 향은 어느 하나의 주인이 되는 대신 하나의 방 안에서 차례로 감지된다.`};}
