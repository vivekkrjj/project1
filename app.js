(function(){
  const cfg=window.BHUMI_CONFIG||{};
  window.bhumiDb=null;

  // Admin and Student portals must keep independent Supabase auth sessions.
  // Supabase normally uses one localStorage key per origin, so logging into
  // one portal can otherwise replace/sign out the other portal's session.
  // Give each portal its own storage key so both can stay logged in at once.
  const isAdminPortal=document.body.classList.contains('admin-portal');
  const isStudentPortal=document.body.classList.contains('student-portal');
  const authStorageKey=isAdminPortal
    ? 'bhumi-admin-auth'
    : isStudentPortal
      ? 'bhumi-student-auth'
      : 'bhumi-public-auth';

  if(window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
     !cfg.SUPABASE_URL.startsWith('YOUR_') && !cfg.SUPABASE_ANON_KEY.startsWith('YOUR_')){
    window.bhumiDb=window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY,
      {
        auth:{
          storageKey:authStorageKey,
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:true
        }
      }
    );
  }
  window.isDbReady=()=>!!window.bhumiDb;
  window.escapeHtml=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  window.safeUrl=(value,fallback='#')=>{
    const v=String(value||'').trim();
    if(!v) return fallback;
    if(/^(https?:\/\/|mailto:|tel:|\/|#|\.\/|\.\.\/)/i.test(v)) return v;
    return fallback;
  };
  window.loadNotices=async function(){
    if(!window.bhumiDb) return JSON.parse(localStorage.getItem('bhumi_notices')||'[]').length ? JSON.parse(localStorage.getItem('bhumi_notices')||'[]') : [
      {title:'Admissions enquiry desk is open',details:'Students and guardians can contact the college office for ANM, GNM and B.Sc Nursing course information.',category:'Admission',is_new:true,published_at:'2026-08-24T08:00:00'},
      {title:'Welcome to Bhumi Nursing College',details:'The college website has been updated with course information, campus facilities and student portal access.',category:'General',is_new:true,published_at:'2026-08-23T08:00:00'},
      {title:'Course information and eligibility',details:'Detailed duration, qualification and frequently asked questions are available on the Courses page.',category:'Notice',is_new:false,published_at:'2026-08-22T08:00:00'}
    ];
    const {data,error}=await bhumiDb.from('notices').select('*').order('published_at',{ascending:false});
    if(error) throw error;
    return (data&&data.length)?data:[
      {title:'Admissions enquiry desk is open',details:'Students and guardians can contact the college office for ANM, GNM and B.Sc Nursing course information.',category:'Admission',is_new:true,published_at:'2026-08-24T08:00:00'},
      {title:'Welcome to Bhumi Nursing College',details:'The college website has been updated with course information, campus facilities and student portal access.',category:'General',is_new:true,published_at:'2026-08-23T08:00:00'},
      {title:'Course information and eligibility',details:'Detailed duration, qualification and frequently asked questions are available on the Courses page.',category:'Notice',is_new:false,published_at:'2026-08-22T08:00:00'}
    ];
  };
  window.getFacultyPhotoUrl=async function(path,expires=3600){
    if(!path||!window.bhumiDb)return 'logo.png?v=20260903';
    try{const q=await bhumiDb.storage.from('faculty-profiles').createSignedUrl(path,expires);if(!q.error&&q.data?.signedUrl)return q.data.signedUrl;}catch(e){}
    return 'logo.png?v=20260903';
  };
  window.loadFaculty=async function(){
    if(!window.bhumiDb) return JSON.parse(localStorage.getItem('bhumi_faculty')||'[]');
    const {data,error}=await bhumiDb.from('faculty').select('*').order('name');
    if(error) throw error;
    const rows=data||[];
    return Promise.all(rows.map(async f=>({...f,photo_url:await getFacultyPhotoUrl(f.photo_path)})));
  };
  window.renderHome=async function(){
    try{
      const notices=await loadNotices();
      const grid=document.getElementById('updatesGrid');
      if(grid) grid.innerHTML=notices.length
        ? notices.slice(0,6).map(n=>`<article class="notice"><span class="tag ${n.is_new?'new':''}">${n.is_new?'<span class="new-badge">NEW</span> ':''}${escapeHtml(n.category||'Notice')}</span><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.details||'')}</p><small>${new Date(n.published_at||Date.now()).toLocaleDateString('en-IN')}</small></article>`).join('')
        : '<div class="loading">No updates published yet.</div>';
      const ticker=document.getElementById('homeTicker');
      if(ticker) ticker.innerHTML=notices.length
        ? (()=>{const items=notices.slice(0,8).map(n=>`<span>★ ${n.is_new?'<b class="ticker-new">NEW</b> ':''}${escapeHtml(n.title)}</span>`).join('');return items+items})()
        : '<span>★ Welcome to Bhumi Nursing College</span>';
    }catch(e){
      const g=document.getElementById('updatesGrid');
      if(g) g.innerHTML='<div class="loading">Live updates are temporarily unavailable.</div>';
      console.warn(e);
    }
  };
  if(document.getElementById('updatesGrid')) renderHome();
})();