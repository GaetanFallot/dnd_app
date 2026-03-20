let combatants=[], currentTurnIdx=-1, roundNum=1;

function addCombatant(){
  const nameEl=document.getElementById('initName'),valEl=document.getElementById('initVal');
  const name=nameEl.value.trim(),init=parseInt(valEl.value)||0;
  if(!name)return nameEl.focus();
  combatants.push({id:Date.now()+Math.random(),name,init});
  nameEl.value='';valEl.value='';nameEl.focus();
  renderTurnList();
}
function removeCombatant(id){
  const idx=combatants.findIndex(c=>c.id===id);
  if(idx<0)return;
  if(idx<currentTurnIdx)currentTurnIdx--;
  else if(idx===currentTurnIdx&&currentTurnIdx>=combatants.length-1)currentTurnIdx=Math.max(0,combatants.length-2);
  combatants=combatants.filter(c=>c.id!==id);
  if(!combatants.length)currentTurnIdx=-1;
  renderTurnList();
}
function sortInit(){
  combatants.sort((a,b)=>b.init-a.init);
  currentTurnIdx=combatants.length?0:-1;
  roundNum=1;document.getElementById('roundNum').textContent=roundNum;
  renderTurnList();showToast('Initiative triée !');
}
function nextTurn(){
  if(!combatants.length)return;
  currentTurnIdx++;
  if(currentTurnIdx>=combatants.length){currentTurnIdx=0;roundNum++;document.getElementById('roundNum').textContent=roundNum;}
  renderTurnList();scrollToActive();
}
function prevTurn(){
  if(!combatants.length)return;
  currentTurnIdx--;
  if(currentTurnIdx<0){currentTurnIdx=combatants.length-1;roundNum=Math.max(1,roundNum-1);document.getElementById('roundNum').textContent=roundNum;}
  renderTurnList();scrollToActive();
}
function clearInit(){combatants=[];currentTurnIdx=-1;roundNum=1;document.getElementById('roundNum').textContent=1;renderTurnList();showToast('Initiative vidée');}
let _sortable=null;
function renderTurnList(){
  const list=document.getElementById('turnList');list.innerHTML='';
  combatants.forEach((c,i)=>{
    const card=document.createElement('div');card.className='turn-card'+(i===currentTurnIdx?' active-turn':'');
    card.innerHTML='<span class="turn-drag" title="Réordonner">⠿</span><span class="turn-init">'+c.init+'</span><span class="turn-name">'+c.name+'</span><button class="turn-del" onclick="removeCombatant('+c.id+')" title="Retirer">✕</button>';
    list.appendChild(card);
  });
  if(typeof Sortable!=='undefined'){
    if(_sortable)_sortable.destroy();
    _sortable=Sortable.create(list,{animation:150,handle:'.turn-drag',onEnd(evt){
      if(evt.oldIndex===evt.newIndex)return;
      const moved=combatants.splice(evt.oldIndex,1)[0];
      combatants.splice(evt.newIndex,0,moved);
      if(currentTurnIdx===evt.oldIndex)currentTurnIdx=evt.newIndex;
      else if(currentTurnIdx>evt.oldIndex&&currentTurnIdx<=evt.newIndex)currentTurnIdx--;
      else if(currentTurnIdx<evt.oldIndex&&currentTurnIdx>=evt.newIndex)currentTurnIdx++;
      renderTurnList();
    }});
  }
}
function scrollToActive(){const el=document.querySelector('.turn-card.active-turn');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});}

