/* ============================================================
   M98M CORE — shared plumbing for every role portal.
   Kept from the existing frontend VERBATIM in spirit: GSI flow,
   api() text/plain trick, esc() (RL-3), STATE, screen states.
   Added: batch() screen loads, idem keys, demo fallback, shell.
   FOR CLAUDE CODE: verify batch payload {calls:[{action,payload}]}
   against actionBatch_; adjust ONE line in batch() if it differs.
   ============================================================ */
var STATE={idToken:null,user:null,config:null,demo:false};
var BACKEND=localStorage.getItem('m98m_backend')||'';
function $(id){return document.getElementById(id)}
function esc(s){var d=document.createElement('div');d.textContent=(s==null?'':String(s));return d.innerHTML} /* RL-3 */
function GBP(v){return "£"+(+v).toFixed(2)}
function idem(){return 'idem_'+Date.now()+'_'+Math.random().toString(36).slice(2,9)}
var _tt;function toast(m){var t=$('toast');$('toastMsg').textContent=m;t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(function(){t.classList.remove('show')},2600)}

/* ---------- transport ---------- */
function api(action,payload,useIdem){
  if(STATE.demo){return demoCall(action,payload)}
  var body={action:action,idToken:STATE.idToken,payload:payload||{}};
  if(useIdem)body.idem=idem();
  return fetch(BACKEND,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),redirect:'follow'})
   .then(function(r){return r.json()})
   .then(function(j){if(!j.ok)throw new Error(j.error||'request failed');return j.data});
}
function batch(calls){ /* one screen = one round trip (backend pays the 2.5s toll once) */
  if(STATE.demo){return Promise.all(calls.map(function(c){return demoCall(c.action,c.payload).catch(function(){return null})}))}
  return api('batch',{calls:calls}).then(function(d){
    var arr=(d&&d.results)||d||[];
    return calls.map(function(c,i){var r=arr[i];return r&&r.ok===false?null:(r&&('data'in r)?r.data:r)});
  }).catch(function(e){ /* fallback: sequential, so screens still load if batch shape differs */
    return Promise.all(calls.map(function(c){return api(c.action,c.payload).catch(function(){return null})}));
  });
}
function demoCall(action,payload){
  var h=(window.DEMO||{})[action];
  return new Promise(function(res,rej){ if(h)res(typeof h==='function'?h(payload||{}):h); else rej(new Error('demo: no '+action)) });
}

/* ---------- auth flow (kept from existing frontend) ---------- */
function boot(){
  document.body.insertAdjacentHTML('beforeend','<div class="toast" id="toast"><span id="toastMsg">Done</span></div>');
  if(!BACKEND){STATE.demo=true;STATE.user=PORTAL.demoUser;buildShell();draw();stamp('Demo data — click to connect backend');return}
  api('getPublicConfig').then(function(cfg){STATE.config=cfg;initGsi()})
   .catch(function(){STATE.demo=true;STATE.user=PORTAL.demoUser;buildShell();draw();stamp('Backend unreachable — demo data')});
}
function initGsi(){
  showAuth('<h1>M98M Portal</h1><p>Sign in with your work Google account.</p><div id="gsiBtn" style="display:flex;justify-content:center;margin-top:14px"></div>');
  var s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';
  s.onload=function(){
    google.accounts.id.initialize({client_id:STATE.config.oauth_client_id,callback:function(resp){
      STATE.idToken=resp.credential;
      api('whoami').then(function(w){
        if(!w||!w.user){showRegister();return}
        STATE.user=w.user;
        if(w.user.status==='pending'){showAuth('<h1>Awaiting approval</h1><p>Management has been notified. This screen unlocks the moment you are approved.</p>');return}
        if(PORTAL.roles.indexOf(w.user.role)<0&&!w.user.super){showAuth('<h1>Wrong portal</h1><p>You are '+esc(w.user.role)+'. Open your own portal file — this one is for '+esc(PORTAL.roles.join(' / '))+'.</p>');return}
        closeAuth();buildShell();draw();startPoll();stamp('Live · connected');
      }).catch(function(e){showAuth('<h1>Sign-in failed</h1><p>'+esc(e.message)+'</p>')});
    }});
    google.accounts.id.renderButton($('gsiBtn'),{theme:'filled_black',size:'large',shape:'pill'});
  };
  document.head.appendChild(s);
}
function showRegister(){
  showAuth('<h1>Request access</h1><p>First sign-in — tell Management who you are.</p>'
  +'<label class="fl" style="text-align:left;margin-top:12px"><b>Full name</b><input id="regName"></label>'
  +'<label class="fl" style="text-align:left;margin-top:9px"><b>Role</b><select id="regRole">'+PORTAL.roles.map(function(r){return '<option>'+esc(r)+'</option>'}).join('')+'</select></label>'
  +'<button class="btn-p" style="margin-top:14px;width:100%" onclick="doRegister()">Request access</button>');
}
function doRegister(){
  api('register',{name:$('regName').value,role:$('regRole').value},true)
   .then(function(){showAuth('<h1>Request sent</h1><p>Management approves you from their portal. Check back soon.</p>')})
   .catch(function(e){toast(e.message)});
}
function showAuth(inner){var a=$('authWrap');if(!a){document.body.insertAdjacentHTML('beforeend','<div class="auth" id="authWrap"><div class="card"><div class="crest" style="margin:0 auto">M</div><div id="authBody"></div></div></div>');a=$('authWrap')}$('authBody').innerHTML=inner;a.style.display='grid'}
function closeAuth(){var a=$('authWrap');if(a)a.style.display='none'}

/* ---------- shell ---------- */
function buildShell(){
  var u=STATE.user||{};
  document.body.insertAdjacentHTML('afterbegin',
  '<div class="shell"><aside class="side">'
  +'<div class="brand"><div class="crest">M</div><div><div class="brand-t">M98M LTD</div><div class="brand-s">'+esc(PORTAL.sub)+'</div></div></div>'
  +'<nav class="nav" id="nav"></nav>'
  +'<div class="who"><div class="avatar">'+esc((u.name||'M').split(' ').map(function(w){return w[0]}).join('').slice(0,2).toUpperCase())+'</div>'
  +'<div style="min-width:0"><div style="font-size:12px">'+esc(u.name||'')+'</div><div style="font-size:10px;color:var(--text-3)">'+esc(u.role||'')+'</div></div></div>'
  +'</aside><div class="main"><header class="top"><div class="top-r">'
  +'<div class="srch"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" type="search" placeholder="'+esc(PORTAL.search||'Search…')+'"></div>'
  +'<span class="stamp envchip" id="stamp" onclick="setBackend()">…</span>'
  +(PORTAL.attendance?'<button class="btn-s" id="attBtn" onclick="clockInBtn(this)">▶ Start working</button>':'')
  +'</div></header><main class="wrap" id="view"></main></div></div>');
  var vi=0;
  $('nav').innerHTML=PORTAL.nav.map(function(n){
    if(typeof n==='string')return '<div class="nav-lbl">'+esc(n)+'</div>';
    var i=vi++;
    return '<button class="nav-i'+(i===0?' on':'')+'" data-v="'+i+'" onclick="go('+i+',this)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+n.ic+'</svg><span>'+esc(n.label)+'</span><span class="pill" id="bdg'+i+'" style="display:none"></span></button>';
  }).join('');
}
var CUR=0;
function go(i,el){CUR=i;document.querySelectorAll('.nav-i').forEach(function(b){b.classList.toggle('on',b===el)});draw()}
function views(){return PORTAL.nav.filter(function(n){return typeof n!=='string'})}
function draw(){var v=views()[CUR];$('view').innerHTML='<div class="empty">Loading…</div>';
  Promise.resolve(v.render()).then(function(html){$('view').innerHTML=html;if(v.after)v.after()})
  .catch(function(e){$('view').innerHTML='<div class="empty">'+esc(e.message)+'</div>'})}
function stamp(t){var s=$('stamp');if(s)s.textContent=t}
function setBackend(){var v=prompt('Paste the Apps Script /exec URL (leave empty for demo):',BACKEND||'');
  if(v===null)return; localStorage.setItem('m98m_backend',v.trim()); location.reload()}

/* ---------- shared widgets ---------- */
function pan(t,s,right,body,cls){return '<section class="pan '+(cls||'')+'"><div class="pan-h"><div><h2 class="pan-t">'+t+'</h2>'+(s?'<p class="pan-s">'+s+'</p>':'')+'</div>'+(right||'')+'</div><div class="pan-b">'+body+'</div></section>'}
function kpis(a){return '<div class="kgrid">'+a.map(function(k){return '<button class="kpi'+(k.on?' on':'')+'"><div class="kpi-t"><span class="kpi-l">'+esc(k.l)+'</span></div><div class="kpi-v num">'+k.v+(k.d?'<span class="kpi-d" style="color:'+(k.dc||'var(--gold)')+'">'+esc(k.d)+'</span>':'')+'</div><div class="kpi-h">'+esc(k.h||'')+'</div></button>'}).join('')+'</div>'}
function shiftLine(name,times,done,due,fill){return '<div class="shift"><span class="sm"><b>'+esc(name)+'</b><br><span id="attState">not clocked in</span></span><span class="strack"><span class="sbar"></span><span class="sfill" style="width:'+fill+'%"></span>'+times.map(function(t,i){return '<span class="snode '+(i<done?'done':i===due?'due':'')+'" style="left:'+t[1]+'%"><i>'+t[0]+'</i></span>'}).join('')+'</span></div>'}
function ideasPan(){return pan('Any new idea generation','goes straight to management — implemented ideas earn a shoutout','<span class="pill gold">GOLD BOX</span>','<div class="frow" style="grid-template-columns:1fr auto"><label class="fl"><b>Your idea</b><input id="ideaT" placeholder="Product ideas, process fixes, anything…"></label><button class="btn-p" style="align-self:end" onclick="sendIdea()">Send</button></div>','ideas')}
function sendIdea(){var v=$('ideaT').value.trim();if(!v){toast('Write the idea first');return}
 api('submitIdea',{text:v},true).then(function(){$('ideaT').value='';toast('💡 Sent to management')}).catch(function(e){toast(e.message)})}
function clockInBtn(b){api('clockIn',{},true).then(function(){b.textContent='● Working since '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});b.disabled=true;var s=$('attState');if(s)s.textContent='clocked in ✓ hours counting';toast('Attendance recorded')}).catch(function(e){toast(e.message)})}
function sigRow(cls,title,meta,stat,statCol,acts,ref){return '<button class="alert '+cls+'"><span class="bl"></span><p><b>'+esc(title)+'</b><br><span class="meta">'+esc(meta)+'</span></p><span class="stat" style="color:'+statCol+'">'+stat+'</span><span class="acts">'+(acts||[]).map(function(a){return '<span class="btn-s" onclick="event.stopPropagation();'+a[1]+'">'+a[0]+'</span>'}).join('')+'<span class="btn-s" onclick="event.stopPropagation();ackSignal(this,\''+(ref||'')+'\')">✓</span></span></button>'}
function ackSignal(el,ref){api('acknowledgeSignal',{ref:ref},true).then(function(){var a=el.closest('.alert');a.style.opacity=.35;a.style.pointerEvents='none';toast('Acknowledged — logged with name & time')}).catch(function(e){toast(e.message)})}
function startPoll(){setInterval(function(){api('poll').then(function(p){if(p&&p.badges)Object.keys(p.badges).forEach(function(k){var b=$('bdg'+k);if(b){b.textContent=p.badges[k];b.style.display=p.badges[k]?'inline-block':'none'}})}).catch(function(){})},45000)}
function brain(p){return p-(0.128*p+(p<=10?0.10:0.30)+0.0035*p)*1.2}
document.addEventListener('DOMContentLoaded',boot);
