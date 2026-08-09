const KEY='tradeJournalV1';
let trades=JSON.parse(localStorage.getItem(KEY)||'[]');
const $=id=>document.getElementById(id);
$('date').value=new Date().toISOString().slice(0,10);

function save(){localStorage.setItem(KEY,JSON.stringify(trades));render();}
function render(){
  $('count').textContent=trades.length;
  const wins=trades.filter(t=>t.result==='win').length;
  $('winrate').textContent=trades.length?Math.round(wins/trades.length*100)+'%':'0%';
  const disciplined=trades.filter(t=>t.discipline==='yes').length;
  $('discipline').textContent=trades.length?Math.round(disciplined/trades.length*100)+'%':'0%';
  const pnl=trades.reduce((s,t)=>s+Number(t.pl||0),0);
  $('pnl').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'%';
  $('empty').style.display=trades.length?'none':'block';
  $('trades').innerHTML=trades.slice().reverse().map(t=>`
    <tr>
      <td>${t.date}</td><td>${esc(t.symbol)}</td><td>${t.session}</td><td>${t.direction}</td>
      <td class="${t.result}">${t.result==='win'?'TP':t.result==='loss'?'SL':'BE'}</td>
      <td class="${Number(t.pl)>=0?'win':'loss'}">${Number(t.pl)>=0?'+':''}${Number(t.pl).toFixed(2)}%</td>
      <td>${t.discipline==='yes'?'Да':'Нет'}</td><td>${esc(t.comment||t.setup||'—')}</td>
    </tr>`).join('');
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
$('tradeForm').addEventListener('submit',e=>{
 e.preventDefault();
 trades.push({
  date:$('date').value,symbol:$('symbol').value.trim(),session:$('session').value,
  direction:$('direction').value,result:$('result').value,pl:Number($('pl').value),
  setup:$('setup').value.trim(),discipline:$('disciplineInput').value,comment:$('comment').value.trim()
 });
 e.target.reset();$('date').value=new Date().toISOString().slice(0,10);$('symbol').value='BTCUSDT';save();
});
$('clearAll').onclick=()=>{if(confirm('Удалить всю историю?')){trades=[];save();}};
$('export').onclick=()=>{
 const rows=[['Дата','Инструмент','Сессия','Направление','Результат','P/L %','Стратегия','Комментарий'],
 ...trades.map(t=>[t.date,t.symbol,t.session,t.direction,t.result,t.pl,t.discipline,t.comment||t.setup])];
 const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='trade-journal.csv';a.click();
};
render();
