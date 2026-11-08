/* NSD report image export V2 — original report UI, not regenerated summaries.
 * Captures the existing DOM/CSS at readable web resolution. Summary ends at
 * the first deep-analysis chapter. Split and social exports retain full card UI.
 * JSZip is bundled with the site and archives are round-trip verified.
 */
(function(){
 "use strict";
 if(window.NSDImageExportV2)return;
 const WIDTH=930;
 const pageHeight={split:1270,sns:1070};
 const blockSelection=".card.result,.surface.report,.surface.gate-v7-report";
 const omitted=".row.actions,.nsd-export-tools,.nsd-image-status,button,input,select,textarea,script,nav,.no-print,.gate-v7-evidence";
 let busy=false,loadPromise=null,scanQueued=false;
 const $=(x,root=document)=>root.querySelector(x);
 const many=(x,root=document)=>Array.from(root.querySelectorAll(x));
 function lab(){
  const p=location.pathname.toLowerCase();
  return p.includes("/gate/")?"gate":p.includes("nsd_sugar")||p.includes("/resonance/")?"chroma":"sensory";
 }
 function type(root){
  const txt=($(".eyebrow,.report-eyebrow",root)?.textContent||"").toUpperCase();
  return txt.includes("TRIO")?"trio":txt.includes("PAIR")?"pair":"solo";
 }
 function label(root){
  const kind=type(root),title=($("h2",root)?.textContent||"NSD 연구 보고서").trim();
  const suffix={solo:"1인",pair:"2인",trio:"3인"}[kind];
  return ("NSD_"+{gate:"게이트",chroma:"색채",sensory:"감각"}[lab()]+"_"+suffix+"_"+title)
   .replace(/[\\/:*?"<>|\x00-\x1f]/g,"_").replace(/\s+/g,"_").slice(0,65);
 }
 function removeControls(node){
  many(omitted,node).forEach(el=>el.remove());
  many("[id]",node).forEach(el=>el.removeAttribute("id"));
  many("[onclick],[onchange],[oninput]",node).forEach(el=>{
   el.removeAttribute("onclick");el.removeAttribute("onchange");el.removeAttribute("oninput");
  });
  many("details",node).forEach(el=>el.open=true);
 }
 function isCut(node,site,kind,sections){
  const txt=(node.textContent||"").trim();
  if(site==="sensory"&&kind==="solo"){
   return node.matches(".solo-chapter")&&txt.includes("PART 02");
  }
  if(site==="gate"){
   if(kind==="solo")return node.matches(".gate-v7-chapter")&&/\b03\s*\/\s*INNER TENSION/.test(txt);
   if(kind==="pair")return node.matches(".chapter")&&/\b02\s*\/\s*SYNERGY/.test(txt);
   return node.matches(".chapter")&&/\b02\s*\/\s*SIMULATION/.test(txt);
  }
  if(node.matches(".section")){
   const index=Number((($("h3",node)?.textContent||"").match(/^\s*(\d+)\./)||[])[1]||sections);
   const max=site==="chroma"?(kind==="solo"?1:kind==="pair"?1:1):
     kind==="solo"?1:kind==="pair"?2:2;
   return index>max;
  }
  return false;
 }
 function elements(root,summary){
  let sections=0,out=[];
  for(const node of root.children){
   if(node.matches(".row.actions,.nsd-export-tools,.nsd-image-status,.gate-v7-evidence"))continue;
   if(summary&&isCut(node,lab(),type(root),sections))break;
   if(node.matches(".section"))sections++;
   out.push(node);
  }
  return out;
 }
 function stageFor(report){
  const stage=document.createElement("div");
  stage.className="shell nsd-export-staging";
  stage.setAttribute("data-nsd-export-staging","true");
  stage.style.cssText="position:fixed!important;left:0!important;top:0!important;z-index:-10000!important;width:"+WIDTH+"px!important;max-width:"+WIDTH+"px!important;margin:0!important;padding:0!important;pointer-events:none!important;box-sizing:border-box!important;background:transparent!important";
  const root=report.cloneNode(false);
  root.removeAttribute("id");
  root.style.cssText="width:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important";
  stage.appendChild(root);
  document.body.appendChild(stage);
  return {stage,root};
 }
 function fill(view,nodes){
  view.root.replaceChildren(...nodes.map(n=>n.cloneNode(true)));
  removeControls(view.root);
 }
 function getHeight(view){
  return Math.ceil(Math.max(view.root.scrollHeight,view.root.getBoundingClientRect().height));
 }
 function grouping(nodes){
  const units=[],pending=[];
  function flush(){if(pending.length){units.push(pending.splice(0));}}
  const isChapter=x=>x.matches(".chapter,.gate-v7-chapter,.solo-chapter");
  for(const node of nodes){
   if(isChapter(node)){flush();pending.push(node);continue;}
   if(node.matches(".solo-summary-grid")&&node.children.length>2){
    const cards=many(":scope > .solo-summary-card",node);
    if(cards.length>2){
     for(let i=0;i<cards.length;i+=2){
      const part=node.cloneNode(false);
      cards.slice(i,i+2).forEach(card=>part.appendChild(card.cloneNode(true)));
      if(i===0&&pending.length){pending.push(part);flush();}
      else units.push([part]);
     }
     continue;
    }
   }
   if(node.matches(".simulation")&&node.querySelectorAll(":scope > .stage").length>1){
    const stages=many(":scope > .stage",node);
    stages.forEach((s,i)=>{
     const wrap=node.cloneNode(false);wrap.appendChild(s.cloneNode(true));
     if(i===0&&pending.length){pending.push(wrap);flush()}
     else units.push([wrap]);
    });
    continue;
   }
   if(node.matches(".section")){
    if(pending.length===1&&isChapter(pending[0])){pending.push(node);flush();}
    else{flush();units.push([node]);}
    continue;
   }
   pending.push(node);
   if(isChapter(pending[0])&&pending.length>1)flush();
  }
  flush();
  return units;
 }
 function partition(report,nodes,maxHeight){
  const units=grouping(nodes),v=stageFor(report),pages=[];
  let current=[];
  try{
   for(const group of units){
    const candidate=current.concat(group);
    fill(v,candidate);
    const height=getHeight(v);
    if(height>maxHeight&&current.length){
     pages.push(current);current=group.slice();
    }else current=candidate;
   }
   if(current.length)pages.push(current);
  }finally{v.stage.remove();}
  return pages.length?pages:[nodes];
 }
 function script(url){
  return new Promise((resolve,reject)=>{
   const s=document.createElement("script");s.src=url;s.async=true;s.crossOrigin="anonymous";
   let settled=false;
   const fail=()=>{if(!settled){settled=true;s.remove();reject(new Error("캡처 라이브러리를 불러오지 못했습니다."))}};
   s.onload=()=>{if(!settled){settled=true;resolve()}};
   s.onerror=fail;
   document.head.appendChild(s);
  });
 }
 async function ensureCapture(){
  if(typeof window.html2canvas==="function")return;
  if(!loadPromise){
   loadPromise=(async()=>{
    const urls=[
     "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
     "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"
    ];
    let last;
    for(const url of urls){
     try{await script(url);if(typeof window.html2canvas==="function")return}
     catch(e){last=e}
    }
    throw last||new Error("캡처 라이브러리를 불러오지 못했습니다.");
   })();
  }
  try{await loadPromise}catch(e){loadPromise=null;throw e}
 }
 async function snapshot(report,nodes){
  const v=stageFor(report);
  try{
   fill(v,nodes);
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   if(document.fonts&&document.fonts.ready)await document.fonts.ready;
   const h=getHeight(v);
   if(h<20)throw new Error("저장할 내용이 없습니다.");
   if(h>14500)throw new Error("이미지가 너무 깁니다. 분할형을 이용해 주세요.");
   const canvas=await window.html2canvas(v.root,{
    backgroundColor:"#FFFFFF",scale:1.15,useCORS:true,allowTaint:false,logging:false,
    width:WIDTH,height:h,windowWidth:1180,windowHeight:Math.max(1400,h+80),
    scrollX:0,scrollY:0
   });
   if(!canvas||canvas.width<100||canvas.height<30)throw new Error("화면 캡처가 비어 있습니다.");
   return canvas;
  }finally{v.stage.remove()}
 }
 function socialCanvas(raw){
  const output=document.createElement("canvas");
  output.width=1080;output.height=1350;
  const ctx=output.getContext("2d");
  ctx.fillStyle="#F7F6F4";ctx.fillRect(0,0,1080,1350);
  const factor=Math.min(1020/raw.width,1290/raw.height);
  const dw=Math.round(raw.width*factor),dh=Math.round(raw.height*factor);
  ctx.fillStyle="#FFFFFF";ctx.fillRect((1080-dw)/2,(1350-dh)/2,dw,dh);
  ctx.drawImage(raw,(1080-dw)/2,(1350-dh)/2,dw,dh);
  return output;
 }
 function toPNG(canvas){
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
   blob&&blob.size>100?resolve(blob):reject(new Error("PNG 파일이 비어 있습니다."));
  },"image/png"));
 }
 async function validPNG(blob){
  if(!blob||blob.size<100)return false;
  const h=new Uint8Array(await blob.slice(0,8).arrayBuffer());
  return [137,80,78,71,13,10,26,10].every((v,i)=>h[i]===v);
 }
 function download(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),25000);
 }
 async function saveZIP(images,prefix,mode,onProgress){
  if(typeof window.JSZip!=="function")throw new Error("압축 기능을 불러오지 못했습니다. 새로고침해 주세요.");
  if(images.length===0)throw new Error("저장된 이미지가 없습니다.");
  const zip=new window.JSZip(),filenames=[];
  images.forEach((blob,i)=>{
   const filename=prefix+"_"+String(i+1).padStart(2,"0")+".png";
   if(!blob||blob.size<100)throw new Error("이미지 "+(i+1)+"이 비어 있습니다.");
   zip.file(filename,blob,{binary:true});filenames.push(filename);
  });
  const result=await zip.generateAsync({type:"blob",compression:"STORE"},metadata=>{
   if(onProgress)onProgress("압축 중… "+Math.round(metadata.percent)+"%");
  });
  if(result.size<100)throw new Error("ZIP 파일이 비어 있습니다.");
  // Verify actual archive contents, not only the ZIP container size.
  const restored=await window.JSZip.loadAsync(result);
  for(const filename of filenames){
   const entry=restored.file(filename);
   if(!entry)throw new Error("압축된 PNG 항목이 누락됐습니다.");
   const payload=await entry.async("uint8array");
   if(payload.length<100||payload[0]!==137||payload[1]!==80||payload[2]!==78||payload[3]!==71)
    throw new Error("압축된 PNG 데이터를 읽을 수 없습니다.");
  }
  return {blob:result,number:filenames.length,filename:prefix+"_"+mode+"_"+filenames.length+"장.zip"};
 }
 async function run(button){
  if(busy)return;
  const report=button.closest(blockSelection);
  if(!report)return;
  const status=$(".nsd-image-status",report),mode=button.dataset.nsdImageMode;
  busy=true;
  const buttons=many(".nsd-image-button",report);
  buttons.forEach(b=>b.disabled=true);
  function progress(t){if(status)status.textContent=t;}
  try{
   progress("웹 보고서 화면을 캡처하는 중…");
   await ensureCapture();
   const original=elements(report,mode!=="split");
   if(!original.length)throw new Error("저장할 결과를 찾지 못했습니다.");
   let images=[];
   if(mode==="summary"){
    images=[await toPNG(await snapshot(report,original))];
   }else{
    const groups=partition(report,original,pageHeight[mode]||1270);
    for(let i=0;i<groups.length;i++){
     progress("이미지 만드는 중… "+(i+1)+"/"+groups.length);
     const raw=await snapshot(report,groups[i]);
     const output=mode==="sns"?socialCanvas(raw):raw;
     images.push(await toPNG(output));
     await new Promise(r=>setTimeout(r,0));
    }
   }
   for(const image of images){
    if(!await validPNG(image))throw new Error("생성된 PNG가 손상됐습니다.");
   }
   const prefix=label(report);
   if(mode==="summary"){
    download(images[0],prefix+"_요약.png");
    progress("원래 화면 그대로 PNG 저장 완료");
   }else{
    const archive=await saveZIP(images,prefix,mode==="sns"?"SNS":"분할",progress);
    download(archive.blob,archive.filename);
    progress("PNG "+archive.number+"장 확인 후 ZIP 저장 완료");
   }
  }catch(e){
   console.error("[NSD original-UI image export]",e);
   progress("이미지 저장 실패: "+(e?.message||"다시 시도해 주세요."));
  }finally{buttons.forEach(b=>b.disabled=false);busy=false;}
 }
 function buttons(){
  many("section.card.result,section.surface.report,section.surface.gate-v7-report")
  .filter(root=>!root.closest("[data-nsd-export-staging]"))
  .forEach(report=>{
   if($(".nsd-export-tools",report))return;
   const actions=$(".row.actions",report);
   if(!actions)return;
   const box=document.createElement("div");
   box.className="nsd-export-tools";
   for(const [id,title] of [
    ["summary","이미지 저장 (요약형)"],
    ["split","이미지 저장 (분할형)"],
    ["sns","SNS 공유 이미지"]
   ]){
    const item=document.createElement("button");
    item.type="button";item.className="nsd-image-button";
    item.dataset.nsdImageMode=id;item.textContent=title;box.appendChild(item);
   }
   const status=document.createElement("span");
   status.className="nsd-image-status";status.setAttribute("role","status");
   status.setAttribute("aria-live","polite");box.appendChild(status);
   actions.insertAdjacentElement("afterend",box);
  });
 }
 document.addEventListener("click",e=>{
  const btn=e.target.closest?.("[data-nsd-image-mode]");
  if(btn){e.preventDefault();run(btn);}
 });
 function schedule(){
  if(scanQueued)return;
  scanQueued=true;
  Promise.resolve().then(()=>{scanQueued=false;buttons()});
 }
 function init(){
  buttons();
  const anchor=$("#main")||$("main")||document.body;
  new MutationObserver(schedule).observe(anchor,{subtree:true,childList:true});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
 else init();
 window.NSDImageExportV2={elements,grouping,partition,isCut,buttons,snapshot,saveZIP,validPNG};
})();