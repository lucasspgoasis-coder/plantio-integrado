/* Resumo por bloco e ciclo. Os canteiros são referência do bloco, não uma soma das linhas. */
var TransplantSummary=(()=>{
 const number=value=>Number(value||0).toLocaleString('pt-BR',{maximumFractionDigits:2});
 const percent=value=>value.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
 function day(row){const date=row.dateObj;if(!date||isNaN(date))return '';return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
 function groups(rows){
  const map=new Map();for(const row of rows){const key=JSON.stringify([row.local,row.ciclo]);if(!map.has(key))map.set(key,{block:row.local,cycle:row.ciclo,rows:[]});map.get(key).rows.push(row);}
  return [...map.values()].sort((a,b)=>a.block.localeCompare(b.block,'pt-BR',{numeric:true})||a.cycle.localeCompare(b.cycle,'pt-BR',{numeric:true})).map(group=>{
   const sorted=group.rows.slice().sort((a,b)=>day(a).localeCompare(day(b))||a.variedade.localeCompare(b.variedade,'pt-BR'));
   const unique=key=>[...new Set(sorted.map(row=>row[key]).filter(value=>value!==null&&value!==undefined&&Number.isFinite(value)))];
   const beds=unique('canteiros'),perBed=unique('mudasPorCanteiro'),conflict=beds.length>1||perBed.length>1;
   const bedCount=beds.length===1?beds[0]:null,seedlingsPerBed=perBed.length===1?perBed[0]:null;
   const expected=!conflict&&bedCount!==null&&seedlingsPerBed!==null?bedCount*seedlingsPerBed:null;
   const received=sorted.reduce((sum,row)=>sum+row.mudas,0),planted=sorted.reduce((sum,row)=>sum+row.transplantado,0),lost=sorted.reduce((sum,row)=>sum+row.perdas,0);
   return {...group,rows:sorted,bedCount,seedlingsPerBed,conflict,expected,received,planted,lost,delta:expected===null?null:planted-expected};
  });
 }
 function explanation(group){
  if(group.conflict)return 'Há valores diferentes de canteiros ou mudas por canteiro no mesmo bloco e ciclo. Confira a planilha antes de confirmar o cálculo.';
  if(group.expected===null)return 'Preencha Canteiros e Mudas por canteiro na planilha para conferir o plantado deste bloco e ciclo.';
  const calculation=number(group.bedCount)+' canteiros × '+number(group.seedlingsPerBed)+' mudas = '+number(group.expected)+' mudas calculadas.';
  if(Math.abs(group.delta)<0.000001)return calculation+' Confere com as '+number(group.planted)+' mudas plantadas registradas.';
  return calculation+' Plantado registrado: '+number(group.planted)+'. Diferença: '+number(Math.abs(group.delta))+' mudas '+(group.delta>0?'a mais':'a menos')+' que o cálculo. Confira os dados da planilha.';
 }
 function scope(rows,blocks,cycles){return rows.filter(row=>blocks.has(row.local)&&cycles.has(String(row.ciclo)));}
 function wrap(ctx,value,width){const lines=[];let line='';for(const word of String(value).split(/\s+/)){const next=(line?line+' ':'')+word;if(ctx.measureText(next).width<=width){line=next;continue;}if(line){lines.push(line);line='';}for(const char of word){if(ctx.measureText(line+char).width>width&&line){lines.push(line);line='';}line+=char;}}if(line)lines.push(line);return lines;}
 function loadLogo(){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Não foi possível carregar a logo. Tente novamente com conexão.'));image.src=new URL('logo-report.png?v=20261121-transplant-summary-50',document.baseURI).href;});}
 async function png(grouped,{logo}={}){
  if(!grouped.length)throw Error('Não há registros de transplantio para os blocos e ciclo selecionados.');
  logo=logo||await loadLogo();
  const W=1200,M=32,CW=W-M*2,measure=document.createElement('canvas'),target=measure.getContext('2d'),commands=[];
  // A altura é medida antes de criar o PNG: uma imagem contínua, sem cortar registros.
  const ctx=new Proxy(target,{get(object,key){if(key==='measureText')return object[key].bind(object);if(typeof object[key]==='function')return (...args)=>{commands.push({method:key,args});};return object[key];},set(object,key,value){object[key]=value;commands.push({key,value});return true;}});
  const color={ink:'#152139',green:'#00875c',muted:'#889aab',red:'#d81b51'};let y=0;
  function box(x,top,width,height,fill,radius=22,stroke){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,top,width,height,radius);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
  function text(value,x,top,size=25,bold=false,fill=color.ink,width=CW,align='left'){
   ctx.font=(bold?'700 ':'400 ')+size+'px Arial';ctx.fillStyle=fill;ctx.textAlign=align;
   const lines=wrap(target,value,width),step=size*1.35;lines.forEach((line,index)=>ctx.fillText(line,align==='center'?x+width/2:align==='right'?x+width:x,top+index*step));ctx.textAlign='left';return lines.length*step;
  }
  function line(x,top,end,stroke='#e6edf1'){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(end,top);ctx.stroke();}
  function icon(type,x,top,fill=color.green,size=25){ctx.save();ctx.translate(x,top);ctx.scale(size/24,size/24);ctx.strokeStyle=fill;ctx.lineWidth=1.8;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();if(type==='leaf'){ctx.moveTo(12,22);ctx.lineTo(12,10);ctx.moveTo(12,16);ctx.bezierCurveTo(2,16,2,5,3,5);ctx.bezierCurveTo(12,4,12,12,12,16);ctx.moveTo(12,11);ctx.bezierCurveTo(11,1,22,2,22,3);ctx.bezierCurveTo(22,11,16,12,12,11);}else if(type==='beds'){for(let i=0;i<3;i++){ctx.moveTo(4+i*7,3);ctx.lineTo(4+i*7,21);}ctx.moveTo(2,8);ctx.lineTo(22,8);ctx.moveTo(2,16);ctx.lineTo(22,16);}else if(type==='loss'){ctx.moveTo(3,6);ctx.lineTo(9,12);ctx.lineTo(14,9);ctx.lineTo(21,18);ctx.moveTo(14,18);ctx.lineTo(21,18);ctx.lineTo(21,11);}else{ctx.rect(3,3,18,18);ctx.moveTo(3,9);ctx.lineTo(21,9);ctx.moveTo(8,1);ctx.lineTo(8,6);ctx.moveTo(16,1);ctx.lineTo(16,6);}ctx.stroke();ctx.restore();}
  const rows=grouped.flatMap(group=>group.rows),dates=[...new Set(rows.map(day).filter(Boolean))].sort(),cycles=[...new Set(grouped.map(group=>group.cycle))];
  const dateLabel=dates.map(date=>date.split('-').reverse().join('/')).join(', ');
  ctx.fillStyle='#f6f9fc';ctx.fillRect(0,0,W,200);const gradient=target.createLinearGradient(0,0,W,0);gradient.addColorStop(0,'#00845d');gradient.addColorStop(1,'#064f3e');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,154);
  const logoRatio=Math.min(99/(logo.naturalWidth||logo.width),99/(logo.naturalHeight||logo.height));ctx.drawImage(logo,32,25,(logo.naturalWidth||logo.width)*logoRatio,(logo.naturalHeight||logo.height)*logoRatio);
  text('Resumo do Transplantio',155,65,39,true,'#fff',W-190);text('SPG Oásis · Ciclo '+cycles.join(', ')+' · '+(dates.length?dates[0].split('-').reverse().join('/')+' a '+dates.at(-1).split('-').reverse().join('/'):'Sem data'),155,105,21,false,'#cae6db',W-190);
  y=185;const total={received:rows.reduce((n,r)=>n+r.mudas,0),planted:rows.reduce((n,r)=>n+r.transplantado,0),lost:rows.reduce((n,r)=>n+r.perdas,0)},kpiWidth=W/3;
  ctx.fillStyle='#edfdf5';ctx.fillRect(0,154,W,173);[['MUDAS RECEBIDAS',total.received,'leaf',color.ink],['PLANTADO',total.planted,'beds',color.green],['PERDAS',total.lost,'loss',color.red]].forEach(([label,value,type,fill],i)=>{const x=i*kpiWidth;icon(type,x+60,y-8,color.green,22);text(label,x+92,y+10,19,true,color.green,kpiWidth-108);text(number(value),x+16,y+76,43,true,fill,kpiWidth-32,'center');if(i>0)text(percent(total.received?value/total.received*100:0)+(i===1?' de sucesso':' de perdas'),x+12,y+109,19,false,'#6d8491',kpiWidth-24,'center');if(i>0){ctx.strokeStyle='#dcefe6';ctx.beginPath();ctx.moveTo(x,173);ctx.lineTo(x,310);ctx.stroke();}});
  y=364;
  for(const group of grouped){
   const top=y,cardCommands=commands.length;box(M,top,CW,1,'#fff',26,'#e1e8f0');const cardShape=commands.slice(cardCommands).find(command=>command.method==='roundRect');y+=57;
   const titleHeight=text(group.block,M+34,y,34,true,color.ink,CW-285);box(W-M-220,y-29,181,36,'#edf1f7',18);text('Ciclo '+group.cycle,W-M-220,y-4,21,true,'#51657e',181,'center');y+=titleHeight+18;
   text('MUDAS',M+650,y,17,true,color.muted,132,'center');text('PLANTADO',M+798,y,17,true,color.muted,132,'center');text('PERDAS',M+946,y,17,true,color.muted,150,'center');y+=27;line(M+34,y,W-M-34);y+=22;
   for(const row of group.rows){
    ctx.font='700 25px Arial';const name=(row.cultura||'Cultura não informada')+' · '+row.variedade,nameLines=wrap(target,name,426),height=Math.max(111,nameLines.length*34+65),date=day(row),label=date?date.slice(8)+'/'+date.slice(5,7):'Sem data';
    box(M+34,y+8,99,74,'#effdf6',13,'#c6f3de');text(label,M+34,y+36,23,true,color.green,99,'center');text(date?date.slice(0,4):'informada',M+34,y+62,16,true,color.green,99,'center');icon('leaf',M+152,y+18,color.green,24);
    text(name,M+184,y+39,25,true,color.ink,426);text('Idade da muda: '+(row.idadeMuda===null||row.idadeMuda===undefined?'não informada':number(row.idadeMuda)+' dias'),M+152,y+39+nameLines.length*34,19,false,'#76899f',458);
    text(number(row.mudas),M+650,y+46,27,true,color.ink,132,'center');text(number(row.transplantado),M+798,y+46,27,true,color.green,132,'center');text(number(row.perdas),M+946,y+39,26,true,color.red,150,'center');text('('+percent(row.mudas?row.perdas/row.mudas*100:0)+')',M+946,y+67,18,true,color.red,150,'center');y+=height;line(M+34,y,W-M-34);y+=12;
   }
   text('TOTAL DO BLOCO',M+34,y+32,23,true,'#52677f',550);text(number(group.received),M+650,y+32,27,true,color.ink,132,'center');text(number(group.planted),M+798,y+32,27,true,color.green,132,'center');text(number(group.lost),M+946,y+26,26,true,color.red,150,'center');text('('+percent(group.received?group.lost/group.received*100:0)+')',M+946,y+52,17,true,color.red,150,'center');y+=90;
   const fieldTop=y,fieldWidth=(CW-92)/3;for(const [i,[label,value,type]] of [['CANTEIROS',group.bedCount,'beds'],['MUDAS / CANTEIRO',group.seedlingsPerBed,'leaf'],['CÁLCULO DO BLOCO',group.expected,'beds']].entries()){const x=M+34+i*(fieldWidth+12);box(x,y,fieldWidth,103,'#f3faf7',14);icon(type,x+14,y+15,color.green,22);text(label,x+46,y+33,16,true,'#588374',fieldWidth-59);text(value===null?'Não informado':number(value),x+16,y+79,value===null?20:31,true,color.green,fieldWidth-32);}
   y=fieldTop+132;const note=explanation(group),noteColor=group.delta===0?'#23775a':'#946423';ctx.font='400 21px Arial';const noteHeight=wrap(target,note,CW-112).length*29+54;box(M+34,y,CW-68,noteHeight,group.delta===0?'#edf9f1':'#fff8e9',14);text('CONFERÊNCIA · BLOCO '+group.block.replace(/^bloco\s*/i,'')+' / CICLO '+group.cycle,M+54,y+30,17,true,noteColor,CW-112);text(note,M+54,y+62,21,false,noteColor,CW-112);y+=noteHeight+31;
   cardShape.args[3]=y-top;y+=28;
  }
  text('DATAS DE PLANTIO',M,y+7,17,true,'#7b8fa3',CW);y+=37;const datesH=text(dateLabel||'Datas não informadas',M,y,21,false,'#526b80',CW);y+=datesH+25;
  const footer='Canteiros × mudas por canteiro é uma conferência da capacidade do bloco no ciclo. Valores repetidos não são somados. O plantado e as perdas permanecem conforme a planilha; a diferença não é classificada como perda automaticamente.';
  y+=text(footer,M,y,20,false,'#7b8c9e',CW)+32;line(M,y,W-M);text('SPG OÁSIS · DADOS OFICIAIS DA PLANILHA',M,y+40,17,true,'#91a1b4',CW,'center');const H=Math.ceil(y+72),scale=Math.min(1,28000/H,Math.sqrt(45000000/(W*H))),canvas=document.createElement('canvas');canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);const output=canvas.getContext('2d');output.fillStyle='#f6f9fc';output.fillRect(0,0,canvas.width,canvas.height);output.scale(scale,scale);for(const command of commands){if(command.method)output[command.method](...command.args);else output[command.key]=command.value;}
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Não foi possível gerar o PNG.')),'image/png'));return {blob,width:canvas.width,height:canvas.height};
 }
 return {groups,scope,explanation,png,number,day};
})();

function transplantCycleRows(){return TransplantSummary.scope(allData,selectedFilters.local,selectedFilters.ciclo);}
function renderTransplantChecks(){
 const root=document.getElementById('transplantBedChecks');if(!root)return;root.replaceChildren();
 const groups=TransplantSummary.groups(transplantCycleRows());
 for(const group of groups){if(group.bedCount===null&&group.seedlingsPerBed===null&&!group.conflict)continue;const card=document.createElement('article');card.className='transplant-bed-check';card.dataset.state=group.delta===0?'match':group.expected===null?'missing':'different';const title=document.createElement('strong');title.textContent=group.block+' · Ciclo '+group.cycle;const text=document.createElement('p');text.textContent=TransplantSummary.explanation(group);card.append(title,text);root.append(card);}
 if(!root.children.length){const text=document.createElement('p');text.textContent='As referências de canteiros ainda não foram preenchidas para os blocos e ciclos selecionados.';root.append(text);}
}
async function exportTransplantSummaryPng(){
 const button=document.getElementById('transplantSummaryPng'),status=document.getElementById('transplantSummaryStatus');button.disabled=true;status.textContent='Preparando resumo com todas as datas e variedades do ciclo…';
 try{
  if(selectedFilters.ciclo.size!==1)throw Error('Selecione um único ciclo nos Filtros de Análise para baixar o resumo.');
  const groups=TransplantSummary.groups(transplantCycleRows()),image=await TransplantSummary.png(groups),url=URL.createObjectURL(image.blob),link=document.createElement('a');link.href=url;link.download='Resumo_Transplantio_Ciclo_'+[...selectedFilters.ciclo][0].replace(/[^a-z0-9_-]/gi,'_')+(groups.length===1?'_'+groups[0].block.replace(/[^a-z0-9_-]/gi,'_'):'_Blocos')+'.png';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent='PNG baixado com todas as datas dos blocos selecionados e a conferência por canteiros.';
 }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
}
