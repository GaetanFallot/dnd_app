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
function renderTurnList(){
  const list=document.getElementById('turnList');list.innerHTML='';
  combatants.forEach((c,i)=>{
    const card=document.createElement('div');card.className='turn-card'+(i===currentTurnIdx?' active-turn':'');
    card.innerHTML='<span class="turn-init">'+c.init+'</span><span class="turn-name">'+c.name+'</span><button class="turn-del" onclick="removeCombatant('+c.id+')" title="Retirer">✕</button>';
    list.appendChild(card);
  });
}
function scrollToActive(){const el=document.querySelector('.turn-card.active-turn');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});}

