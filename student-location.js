(function(){
  const esc = window.escapeHtml || (s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  let studentLocationTimer = null;
  let adminMap = null;
  let adminMarkers = new Map();
  let adminRealtime = null;

  async function saveStudentLocation(position){
    if(!window.bhumiDb || !isDbReady()) throw new Error('Supabase is not configured.');
    const {data:{user},error:userError} = await bhumiDb.auth.getUser();
    if(userError || !user) throw new Error('Student session expired. Please login again.');
    const c = position.coords;
    const row = {
      user_id: user.id,
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
      accuracy_meters: Number.isFinite(c.accuracy) ? Number(c.accuracy) : null,
      captured_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const {error} = await bhumiDb.from('student_locations').upsert(row,{onConflict:'user_id'});
    if(error) throw error;
    return row;
  }

  function getBrowserPosition(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation){
        reject(new Error('This device/browser does not support location services.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve,reject,{
        enableHighAccuracy:false,
        timeout:15000,
        maximumAge:60000
      });
    });
  }

  async function requireStudentLocation(){
    const msg = document.getElementById('studentError');
    if(!navigator.geolocation){
      if(msg) msg.textContent='Location is required, but this device/browser does not support location services.';
      return false;
    }
    try{
      if(msg) msg.textContent='Requesting location permission...';
      const position = await getBrowserPosition();
      await saveStudentLocation(position);
      if(msg) msg.textContent='';
      startStudentLocationUpdates();
      return true;
    }catch(e){
      console.warn('Student location:',e);
      if(msg){
        if(e && e.code===1) msg.textContent='Location permission is required to enter the Student Portal. Please allow location access and try again.';
        else if(e && e.code===2) msg.textContent='Your location could not be determined. Please turn on GPS/location services and try again.';
        else if(e && e.code===3) msg.textContent='Location request timed out. Please make sure GPS/location is enabled and try again.';
        else msg.textContent='Location is required to enter the Student Portal. '+(e?.message||'Please try again.');
      }
      return false;
    }
  }

  function startStudentLocationUpdates(){
    if(studentLocationTimer) clearInterval(studentLocationTimer);
    studentLocationTimer = setInterval(async()=>{
      try{
        if(document.hidden) return;
        const p = await getBrowserPosition();
        await saveStudentLocation(p);
      }catch(e){ console.warn('Background location update skipped:',e); }
    },5*60*1000);
  }

  window.requireStudentLocation = requireStudentLocation;
  window.startStudentLocationUpdates = startStudentLocationUpdates;

  function formatLocationTime(value){
    if(!value) return 'Never';
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});
  }

  function staleLabel(value){
    if(!value) return '<span class="loc-status offline">No location</span>';
    const age = Date.now()-new Date(value).getTime();
    if(age <= 15*60*1000) return '<span class="loc-status online">Recently updated</span>';
    if(age <= 60*60*1000) return '<span class="loc-status warning">Updated earlier</span>';
    return '<span class="loc-status offline">Stale location</span>';
  }

  function initAdminMap(){
    const el=document.getElementById('studentLocationMap');
    if(!el || !window.L) return;
    if(adminMap){ setTimeout(()=>adminMap.invalidateSize(),100); return; }
    adminMap=L.map(el,{scrollWheelZoom:true}).setView([25.85,85.78],8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'&copy; OpenStreetMap contributors'
    }).addTo(adminMap);
  }

  function renderAdminLocationRows(rows){
    const box=document.getElementById('studentLocationList');
    if(!box) return;
    const q=(document.getElementById('studentLocationSearch')?.value||'').trim().toLowerCase();
    const filtered=rows.filter(r=>{
      const text=[r.full_name,r.roll_number,r.course,r.email,r.mobile].map(v=>String(v||'').toLowerCase()).join(' ');
      return !q || text.includes(q);
    });
    box.innerHTML=filtered.length ? filtered.map(r=>{
      const mapUrl='https://www.openstreetmap.org/?mlat='+encodeURIComponent(r.latitude)+'&mlon='+encodeURIComponent(r.longitude)+'#map=17/'+encodeURIComponent(r.latitude)+'/'+encodeURIComponent(r.longitude);
      return '<article class="student-location-card">'+
        '<div class="student-location-main"><div><h4>'+esc(r.full_name||'Student')+'</h4>'+
        '<p>'+esc(r.course||'')+(r.roll_number?' • '+esc(r.roll_number):'')+'</p>'+
        '<small>'+esc(r.email||'')+(r.mobile?' • '+esc(r.mobile):'')+'</small></div>'+
        staleLabel(r.updated_at)+'</div>'+
        '<div class="student-location-meta"><span>📍 '+Number(r.latitude).toFixed(6)+', '+Number(r.longitude).toFixed(6)+'</span>'+
        '<span>🕒 '+esc(formatLocationTime(r.updated_at))+'</span>'+
        (r.accuracy_meters?'<span>🎯 ±'+Math.round(r.accuracy_meters)+' m</span>':'')+'</div>'+
        '<div class="cms-actions"><button type="button" class="primary-btn small-btn" data-view-location="'+esc(r.user_id)+'">View on Map</button>'+
        '<a class="outline-btn small-btn" target="_blank" rel="noopener" href="'+mapUrl+'">Open Map</a></div></article>';
    }).join(''):'<div class="empty-state">No student locations found.</div>';

    box.querySelectorAll('[data-view-location]').forEach(btn=>btn.onclick=()=>{
      const r=rows.find(x=>x.user_id===btn.dataset.viewLocation);
      if(r && adminMap){
        adminMap.setView([r.latitude,r.longitude],16);
        const marker=adminMarkers.get(r.user_id);
        if(marker){marker.openPopup();}
      }
    });
  }

  function renderAdminMarkers(rows){
    initAdminMap();
    if(!adminMap) return;
    adminMarkers.forEach(m=>m.remove());
    adminMarkers.clear();
    const bounds=[];
    rows.forEach(r=>{
      if(!Number.isFinite(Number(r.latitude))||!Number.isFinite(Number(r.longitude))) return;
      const marker=L.marker([r.latitude,r.longitude]).addTo(adminMap);
      marker.bindPopup('<strong>'+esc(r.full_name||'Student')+'</strong><br>'+esc(r.course||'')+(r.roll_number?'<br>Roll: '+esc(r.roll_number):'')+'<br><small>Updated: '+esc(formatLocationTime(r.updated_at))+'</small>');
      adminMarkers.set(r.user_id,marker);
      bounds.push([r.latitude,r.longitude]);
    });
    if(bounds.length===1) adminMap.setView(bounds[0],15);
    else if(bounds.length>1) adminMap.fitBounds(bounds,{padding:[30,30],maxZoom:15});
  }

  async function loadAdminLocations(){
    try{
      await requireAdmin();
      const box=document.getElementById('studentLocationList');
      if(box) box.innerHTML='<p>Loading student locations...</p>';
      const {data:locs,error:le}=await bhumiDb.from('student_locations').select('*').order('updated_at',{ascending:false});
      if(le) throw le;
      const ids=(locs||[]).map(x=>x.user_id);
      let regs=[];
      if(ids.length){
        const {data,error}=await bhumiDb.from('student_registration_requests').select('user_id,full_name,roll_number,course,email,mobile,status').in('user_id',ids);
        if(error) throw error;
        regs=data||[];
      }
      const byId=new Map(regs.map(r=>[r.user_id,r]));
      const rows=(locs||[]).map(l=>Object.assign({},l,byId.get(l.user_id)||{})).filter(r=>r.status!=='rejected' && r.status!=='banned');
      window.__BHUMI_STUDENT_LOCATIONS=rows;
      const count=document.getElementById('studentLocationCount');
      if(count) count.textContent=String(rows.length);
      renderAdminLocationRows(rows);
      renderAdminMarkers(rows);
    }catch(e){
      const box=document.getElementById('studentLocationList');
      if(box) box.innerHTML='<p class="error">'+esc(e.message||'Unable to load student locations.')+'</p>';
    }
  }

  function initAdminLocation(){
    if(!document.getElementById('studentLocationMap')) return;
    loadAdminLocations();
    const search=document.getElementById('studentLocationSearch');
    if(search && !search.dataset.bound){
      search.dataset.bound='1';
      search.addEventListener('input',()=>renderAdminLocationRows(window.__BHUMI_STUDENT_LOCATIONS||[]));
    }
    if(adminRealtime || !window.bhumiDb || !isDbReady()) return;
    adminRealtime=bhumiDb.channel('student-location-admin')
      .on('postgres_changes',{event:'*',schema:'public',table:'student_locations'},()=>loadAdminLocations())
      .subscribe();
  }

  window.initAdminLocation = initAdminLocation;
})();