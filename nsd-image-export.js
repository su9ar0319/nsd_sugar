/* NSD Image Export · client-side, zero external dependencies.
   Produces readable PNG reports for all three labs and 1/2/3-person results.
   Split and SNS collections are downloaded as one ZIP containing numbered PNGs. */
(function(){
"use strict";
if(window.NSDImageExport)return;
var PALETTE={
 chroma:{name:"CHROMA & SILLAGE",ko:"공명 색채·잔향 연구소",accent:"#D3A12B",dark:"#30291E",soft:"#FFF4D5"},
 sensory:{name:"SENSORY INTERFERENCE",ko:"감각 간섭 연구소",accent:"#19718B",dark:"#173F50",soft:"#E7F5F7"},
 gate:{name:"GATE OPERATION COMPATIBILITY",ko:"게이트 동행 적합성 연구소",accent:"#A23E43",dark:"#242224",soft:"#F9EBEB"}
};
var DOC="NSD / LABORATORY REPORT", FONT="'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif";
function lab(){
 var url=location.pathname.toLowerCase();
 return url.includes("/gate/")?"gate":url.includes("nsd_sugar")||url.includes("/resonance/")?"chroma":"sensory";
}
function plain(value){return String(value||"").replace(/\u00a0/g," ").replace(/[ \t]+/g," ").replace(/\n[ \t]+/g,"\n").replace(/\n{3,}/g,"\n\n").trim()}
function safeName(value){return String(value||"NSD").replace(/[\\/:*?"<>|\x00-\x1f]/g,"_").replace(/\s+/g,"_").slice(0,65)}
function recordType(root){
 var tag=plain((root.querySelector(".report-eyebrow,.eyebrow")||{}).textContent).toUpperCase();
 if(tag.includes("TRIO")||tag.includes("GROUP"))return "3인";
 if(tag.includes("PAIR"))return "2인";
 if(tag.includes("INDIVIDUAL")||tag.includes("PERSONAL"))return "1인";
 var active=document.querySelector(".nav .active,.site-nav .active");
 var text=plain(active&&active.textContent);
 return text.includes("3인")?"3인":text.includes("2인")?"2인":"1인";
}
function cleanText(el){
 var t=el.cloneNode(true);
 t.querySelectorAll("button,input,select,textarea,script,style,nav,.row.actions,.no-print,.nsd-export-tools,.nsd-image-status,svg,canvas").forEach(function(n){n.remove()});
 t.querySelectorAll("details").forEach(function(n){n.open=true});
 var stage=document.createElement("div");
 stage.setAttribute("data-nsd-export-offscreen","1");
 stage.style.cssText="position:fixed;left:-15000px;top:0;width:920px;opacity:0;pointer-events:none;z-index:-1";
 stage.appendChild(t);
 document.body.appendChild(stage);
 var txt=plain(t.innerText||t.textContent);
 stage.remove();
 return txt;
}
function extract(root){
 var t=PALETTE[lab()], title=plain((root.querySelector("h2")||{}).textContent)||"연구 보고서";
 var subtitle=plain((root.querySelector(".report-sub,.gate-v8-subline,.muted")||{}).textContent);
 var blocks=[];
 Array.prototype.forEach.call(root.children,function(child){
  if(child.matches("h2,.report-eyebrow,.eyebrow,.report-sub,.muted,.row.actions,.nsd-export-tools,.nsd-image-status"))return;
  var isChapter=child.matches(".gate-v7-chapter,.chapter,.solo-chapter");
  var head=child.matches(".section")?child.querySelector("h3"):child.querySelector(":scope > h3,:scope > h4");
  if(!head)head=child.matches(".gate-v7-chapter,.chapter,.solo-chapter")?child.querySelector("h3"):null;
  var label=plain(head&&head.textContent);
  var body=cleanText(child);
  if(label&&body.startsWith(label))body=plain(body.slice(label.length));
  if(!body&&!label)return;
  if(isChapter)blocks.push({title:label||"연구 기록",text:body,chapter:true});
  else if(body.length>4)blocks.push({title:label,text:body,chapter:false});
 });
 if(!blocks.length)blocks=[{title:"분석 결과",text:cleanText(root),chapter:false}];
 return {lab:lab(),theme:t,title,subtitle,kind:recordType(root),blocks};
}
function measure(ctx,text,font){ctx.font=font;return ctx.measureText(text).width}
function wrap(ctx,text,max,font){
 ctx.font=font;
 var tokens=String(text).split(/(\s+)/).filter(Boolean),out=[],line="";
 function addPart(part){
  if(!part.trim()){if(line&&!line.endsWith(" "))line+=" ";return}
  var candidate=line?line+part:part;
  if(ctx.measureText(candidate).width<=max){line=candidate;return}
  if(line.trim()){out.push(line.trim());line=""}
  if(ctx.measureText(part).width<=max){line=part;return}
  var letters=Array.from(part),frag="";
  letters.forEach(function(ch){
   if(ctx.measureText(frag+ch).width>max&&frag){out.push(frag);frag=ch}
   else frag+=ch;
  });
  line=frag;
 }
 tokens.forEach(addPart);
 if(line.trim())out.push(line.trim());
 return out.length?out:[""];
}
function rounded(ctx,x,y,w,h,r,fill){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
}
function createPage(w,h,d,number,mode){
 var canvas=document.createElement("canvas");
 canvas.width=w;canvas.height=h;
 var c=canvas.getContext("2d");
 c.fillStyle="#F7F6F3";c.fillRect(0,0,w,h);
 c.fillStyle=d.theme.accent;c.fillRect(0,0,w,19);
 c.fillStyle=d.theme.dark;c.fillRect(0,19,w,126);
 c.fillStyle="#FFFFFF";c.font="bold 23px "+FONT;
 c.fillText("NSD / "+d.theme.name+" LABORATORY",70,76);
 c.font="18px "+FONT;c.fillStyle="#E7E4DF";
 c.fillText(d.kind+" REPORT  ·  "+(mode==="sns"?"SOCIAL EDITION":mode==="summary"?"SUMMARY EDITION":"FULL REPORT"),70,113);
 c.fillStyle=d.theme.accent;c.fillRect(70,183,64,5);
 c.fillStyle=d.theme.dark;
 var titleLines=wrap(c,d.title,w-140,"bold 38px "+FONT).slice(0,3);
 var titleY=236;
 c.font="bold 38px "+FONT;
 titleLines.forEach(function(t){c.fillText(t,70,titleY);titleY+=53});
 if(d.subtitle){
  c.font="21px "+FONT;c.fillStyle="#6F6968";
  var subLines=wrap(c,d.subtitle,w-140,"21px "+FONT).slice(0,2);
  subLines.forEach(function(t){c.fillText(t,70,titleY+10);titleY+=32});
 }
 var y=Math.max(titleY+40,330);
 c.fillStyle="#DDD8D2";c.fillRect(70,h-116,w-140,2);
 c.font="16px "+FONT;c.fillStyle="#706A69";
 c.fillText(d.theme.ko+"  ·  "+d.kind+" 분석",70,h-77);
 c.textAlign="right";c.fillText("NSD  /  "+String(number).padStart(2,"0"),w-70,h-77);c.textAlign="left";
 return {canvas,c,y,w,h};
}
function renderFull(data){
 var pages=[],p=null,idx=0,limit=0;
 function newPage(){p=createPage(1240,1754,data,++idx,"full");pages.push(p.canvas)}
 function fit(space){if(!p||p.y+space>p.h-150)newPage()}
 function section(title){
  if(!title)return;
  var lines=wrap(p?p.c:document.createElement("canvas").getContext("2d"),title,1070,"bold 29px "+FONT);
  fit(lines.length*44+35);
  p.c.fillStyle=data.theme.accent;p.c.fillRect(72,p.y+3,5,34);
  p.c.fillStyle=data.theme.dark;p.c.font="bold 29px "+FONT;
  lines.forEach(function(l){p.c.fillText(l,94,p.y+31);p.y+=44});
  p.y+=15;
 }
 newPage();
 data.blocks.forEach(function(block){
  if(block.title){section(block.title)}
  var paras=block.text.split(/\n+/).map(plain).filter(Boolean);
  paras.forEach(function(paragraph){
   var lines=wrap(p.c,paragraph,1060,"23px "+FONT);
   lines.forEach(function(l){
    fit(42);
    p.c.font="23px "+FONT;p.c.fillStyle="#3A3838";
    p.c.fillText(l,82,p.y+28);p.y+=40;limit++;
   });
   p.y+=14;
  });
  p.y+=22;
 });
 return pages;
}
function shortText(str,max){
 var s=plain(str).replace(/\s*\n\s*/g," ");
 if(s.length<=max)return s;
 var cut=s.slice(0,max),at=Math.max(cut.lastIndexOf(". "),cut.lastIndexOf("다. "),cut.lastIndexOf("요. "));
 if(at>max*.52)return cut.slice(0,at+1);
 at=cut.lastIndexOf(" ");return (at>max*.65?cut.slice(0,at):cut).replace(/[,. ]+$/,"")+"…";
}
function selectedBlocks(d,max){
 var preferred=d.blocks.filter(function(b){return !b.chapter&&b.text.length>45});
 if(!preferred.length)preferred=d.blocks.filter(function(b){return b.text.length>30});
 var unique=[],seen=new Set();
 preferred.forEach(function(b){
  var txt=plain(b.text);
  if(!seen.has(txt.slice(0,130))){seen.add(txt.slice(0,130));unique.push(b)}
 });
 return unique.slice(0,max);
}
function renderSummary(data){
 var p=createPage(1240,1754,data,1,"summary");
 var c=p.c,items=selectedBlocks(data,5),y=p.y;
 rounded(c,70,y,1100,83,10,data.theme.soft);
 c.font="bold 25px "+FONT;c.fillStyle=data.theme.dark;c.fillText("핵심 분석 요약",98,y+50);y+=120;
 var drawn=0;
 items.forEach(function(b){
  var title=shortText(b.title||"분석 기록",45),body=shortText(b.text,240);
  var h=title?32:0,lines=wrap(c,body,996,"22px "+FONT).slice(0,7);
  var req=42+h+lines.length*36;
  if(y+req>p.h-160)return;
  c.fillStyle="#FFFFFF";rounded(c,70,y,1100,req-12,13,"#FFFFFF");
  c.fillStyle=data.theme.accent;c.fillRect(70,y,6,req-12);
  c.font="bold 23px "+FONT;c.fillStyle=data.theme.dark;
  if(title){c.fillText(title,100,y+40)}
  c.font="22px "+FONT;c.fillStyle="#474241";
  var lineY=y+40+h;
  lines.forEach(function(line){c.fillText(line,100,lineY);lineY+=36});
  y+=req+15;drawn++;
 });
 if(drawn===0){
  c.font="24px "+FONT;c.fillStyle=data.theme.dark;
  c.fillText("요약할 수 있는 결과가 없습니다.",95,y+60);
 }
 return [p.canvas];
}
function renderSocial(data){
 var blocks=selectedBlocks(data,6),canvases=[];
 var d=Object.assign({},data,{subtitle:shortText(data.subtitle,135)});
 var cover=createPage(1080,1350,d,1,"sns"),c=cover.c;
 rounded(c,70,cover.y+30,940,340,20,data.theme.soft);
 c.font="bold 52px "+FONT;c.fillStyle=data.theme.dark;
 c.fillText("FIELD NOTES",100,cover.y+122);
 c.font="30px "+FONT;c.fillText("한눈에 보는 연구 기록",100,cover.y+188);
 c.font="23px "+FONT;c.fillStyle="#5B5553";
 c.fillText("SWIPE  /  "+data.kind+" REPORT",100,cover.y+258);
 canvases.push(cover.canvas);
 blocks.forEach(function(b,i){
  var p=createPage(1080,1350,d,i+2,"sns"),ctx=p.c;
  var title=shortText(b.title||"핵심 기록",52);
  rounded(ctx,70,p.y,940,62,10,data.theme.soft);
  ctx.font="bold 24px "+FONT;ctx.fillStyle=data.theme.dark;ctx.fillText("RECORD  "+String(i+1).padStart(2,"0"),91,p.y+40);
  var y=p.y+108;
  var titleLines=wrap(ctx,title,900,"bold 32px "+FONT).slice(0,3);
  ctx.font="bold 32px "+FONT;ctx.fillStyle=data.theme.dark;
  titleLines.forEach(function(l){ctx.fillText(l,80,y+29);y+=47});
  y+=28;
  var body=shortText(b.text,590),font=25;
  var lines=wrap(ctx,body,905,font+"px "+FONT);
  while(lines.length*41>1250-y-158&&font>20){
   font-=1;lines=wrap(ctx,body,905,font+"px "+FONT);
  }
  var lineHeight=font+15,space=1250-y-110;
  var toDraw=Math.max(0,Math.floor(space/lineHeight));
  ctx.font=font+"px "+FONT;ctx.fillStyle="#474241";
  lines.slice(0,toDraw).forEach(function(line){ctx.fillText(line,85,y+font);y+=lineHeight});
  canvases.push(p.canvas);
 });
 return canvases;
}
function crc32(data){
 var crc=-1;
 for(var i=0;i<data.length;i++){
  crc^=data[i];
  for(var j=0;j<8;j++)crc=(crc>>>1)^(-(crc&1)&0xEDB88320);
 }
 return (crc^(-1))>>>0;
}
function zipStore(files){
 var output=[],centers=[],offset=0,enc=new TextEncoder();
 files.forEach(function(file){
  var name=enc.encode(file.name),bytes=file.bytes,crc=crc32(bytes),local=new Uint8Array(30+name.length),dv=new DataView(local.buffer);
  dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0,true);dv.setUint16(8,0,true);
  dv.setUint32(14,crc,true);dv.setUint32(18,bytes.length,true);dv.setUint32(22,bytes.length,true);
  dv.setUint16(26,name.length,true);local.set(name,30);
  output.push(local,bytes);
  var central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);
  cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);
  cv.setUint32(16,crc,true);cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);
  cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46);
  centers.push(central);offset+=local.length+bytes.length;
 });
 var centralSize=centers.reduce(function(n,c){return n+c.length},0);
 var end=new Uint8Array(22),e=new DataView(end.buffer);
 e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);
 e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
 return new Blob(output.concat(centers,[end]),{type:"application/zip"});
}
function pngBlob(canvas){
 return new Promise(function(resolve,reject){
  canvas.toBlob(function(blob){blob?resolve(blob):reject(new Error("이미지 변환에 실패했습니다."))},"image/png");
 });
}
function save(blob,name){
 var u=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(function(){URL.revokeObjectURL(u)},15000);
}
function buttons(){
 var roots=document.querySelectorAll("section.card.result, section.surface.report, section.surface.gate-v7-report");
 roots.forEach(function(report){
  if(report.closest("[data-nsd-export-offscreen]"))return;
  var row=report.querySelector(".row.actions");
  if(!row)return;
  row.querySelectorAll("button[onclick]").forEach(function(btn){
   if((btn.getAttribute("onclick")||"").includes("window.print()"))btn.remove();
  });
  if(report.querySelector(".nsd-export-tools"))return;
  var shell=document.createElement("div");
  shell.className="nsd-export-tools";
  var actions=[
   ["summary","이미지 저장 (요약형)"],
   ["split","이미지 저장 (분할형)"],
   ["sns","SNS 공유 이미지"]
  ];
  actions.forEach(function(entry){
   var b=document.createElement("button");
   b.type="button";b.className="nsd-image-button";b.dataset.nsdImageMode=entry[0];
   b.textContent=entry[1];shell.appendChild(b);
  });
  var status=document.createElement("span");status.className="nsd-image-status";status.setAttribute("role","status");
  status.setAttribute("aria-live","polite");shell.appendChild(status);
  row.insertAdjacentElement("afterend",shell);
 });
}
var running=false;
async function exportImage(btn){
 if(running)return;
 var report=btn.closest("section.card.result,section.surface.report,section.surface.gate-v7-report");
 if(!report)return;
 var status=report.querySelector(".nsd-image-status"),mode=btn.dataset.nsdImageMode;
 running=true;btn.disabled=true;
 try{
  if(status)status.textContent="PNG 이미지를 준비하고 있습니다…";
  await new Promise(function(resolve){requestAnimationFrame(resolve)});
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  var data=extract(report),canvases=mode==="summary"?renderSummary(data):mode==="sns"?renderSocial(data):renderFull(data);
  var prefix=safeName("NSD_"+data.theme.ko+"_"+data.kind+"_"+data.title);
  var blobs=[];
  for(var i=0;i<canvases.length;i++){
   var png=await pngBlob(canvases[i]);
   blobs.push({name:prefix+"_"+String(i+1).padStart(2,"0")+".png",bytes:new Uint8Array(await png.arrayBuffer()),blob:png});
   if(status)status.textContent="이미지 저장 중… "+(i+1)+"/"+canvases.length;
  }
  if(blobs.length===1)save(blobs[0].blob,blobs[0].name);
  else save(zipStore(blobs),prefix+"_"+(mode==="sns"?"SNS":"A4_분할")+"_"+blobs.length+"장.zip");
  if(status)status.textContent=blobs.length===1?"PNG 저장 완료":"PNG "+blobs.length+"장 ZIP 저장 완료";
 }catch(err){
  console.error("[NSD IMAGE EXPORT]",err);
  if(status)status.textContent="저장 실패: "+(err&&err.message?err.message:"다시 시도해 주세요");
 }finally{running=false;btn.disabled=false}
}
document.addEventListener("click",function(event){
 var btn=event.target.closest&&event.target.closest("[data-nsd-image-mode]");
 if(!btn)return;
 event.preventDefault();
 exportImage(btn);
});
var queued=false;
function schedule(){if(queued)return;queued=true;Promise.resolve().then(function(){queued=false;buttons()})}
function init(){
 buttons();
 var parent=document.getElementById("main")||document.querySelector("main")||document.body;
 new MutationObserver(schedule).observe(parent,{childList:true,subtree:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
else init();
window.NSDImageExport={extract:extract,renderFull:renderFull,renderSummary:renderSummary,renderSocial:renderSocial,zipStore:zipStore,buttons:buttons};
})();