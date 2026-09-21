(function(){
  const defaults={
    site_settings:{college_name:'Bhumi Nursing College',tagline:'Healthy • Skilled • Compassionate',email:'info@bhuminc.edu.in',phone:'+91 98765 43210',address:'Lalganj, Vaishali, Bihar',footer_text:'© 2026 Bhumi Nursing College. All Rights Reserved.',primary_color:'#123b73',accent_color:'#e5b51b',show_topbar:true,show_news:true},
    hero:{eyebrow:'BUILDING',title:'HEALTHIER TOMORROWS',description:'Nursing education with knowledge, clinical skills, compassion and service at its heart.',button_text:'Explore Our Courses',button_link:'#courses',show:true},
    about:{eyebrow:'ABOUT US',title:'Welcome to Bhumi Nursing College',description:'Bhumi Nursing College is focused on preparing caring, confident and professionally skilled nurses through classroom learning, practical skill development and clinical exposure. Our aim is to create a supportive academic environment where students learn with discipline, empathy and a strong commitment to patient care.',button_text:'Know More',button_link:'#contact',image_url:'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',show:true},
    admission:{eyebrow:'ADMISSIONS OPEN',title:'Start Your Nursing Journey With Us',description:'Apply online and become part of a learning community focused on care, knowledge and service.',button_text:'Apply Now',button_link:'mailto:info@bhuminc.edu.in',show:true},
    academics:{eyebrow:'ACADEMIC EXCELLENCE',title:'Student Information',description:'Academic calendar, examination schedules, attendance information and learning resources.',show:true},
    contact:{title:'Contact Bhumi Nursing College',description:'For admission, courses and student support, contact our college office.',show:true},
    student_portal:{title:'Student Portal',welcome_prefix:'Welcome',intro:'Access the latest college updates and faculty information from one place.',updates_title:'Latest Updates',faculty_title:'Faculty & Staff',show_updates:true,show_faculty:true},
    sections:{about:true,courses:true,updates:true,academics:true,admission:true,facilities:true,gallery:true,contact:true}
  };
  const fallbackItems=[
    {item_type:'course',title:'B.Sc Nursing',description:'Four-year undergraduate nursing program with theory, skills lab and clinical training.',subtitle:'4 Years',icon:'🎓',link_url:'bsc-nursing.html',sort_order:1,is_active:true},
    {item_type:'course',title:'GNM',description:'Three-year General Nursing and Midwifery program focused on practical patient care.',subtitle:'3 Years',icon:'⚕',link_url:'gnm.html',sort_order:2,is_active:true},
    {item_type:'course',title:'ANM',description:'Two-year Auxiliary Nurse Midwifery program for foundational nursing practice.',subtitle:'2 Years',icon:'📜',link_url:'anm.html',sort_order:3,is_active:true},
    {item_type:'facility',title:'Modern Campus',description:'A clean, welcoming campus designed for focused nursing education.',icon:'🏫',image_url:'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80',sort_order:1,is_active:true},
    {item_type:'facility',title:'Nursing Skill Lab',description:'Hands-on practice for essential nursing procedures and clinical skills.',icon:'🧪',image_url:'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=900&q=80',sort_order:2,is_active:true},
    {item_type:'facility',title:'Library',description:'A quiet study space with books and learning resources for students.',icon:'📖',image_url:'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80',sort_order:3,is_active:true},
    {item_type:'facility',title:'Smart Classrooms',description:'Interactive classrooms for theory, discussion and academic learning.',icon:'🏥',image_url:'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=900&q=80',sort_order:4,is_active:true},
        {item_type:'gallery',title:'College Campus',description:'Campus view',image_url:'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',sort_order:1,is_active:true},
    {item_type:'gallery',title:'Nursing Learning',description:'Healthcare learning environment',image_url:'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=80',sort_order:2,is_active:true},
    {item_type:'gallery',title:'Library',description:'Study and reference resources',image_url:'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80',sort_order:3,is_active:true},
    {item_type:'gallery',title:'Classroom',description:'Academic classroom',image_url:'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1200&q=80',sort_order:4,is_active:true},
{item_type:'feature',title:'B.Sc Nursing',description:'4 Years',icon:'🎓',sort_order:1,is_active:true},
    {item_type:'feature',title:'GNM',description:'3 Years',icon:'⚕',sort_order:2,is_active:true},
    {item_type:'feature',title:'ANM',description:'2 Years',icon:'📜',sort_order:3,is_active:true},
    {item_type:'feature',title:'Modern Campus',description:'Smart Campus',icon:'🏢',sort_order:4,is_active:true},
    {item_type:'feature',title:'Well Equipped Labs',description:'Practical Skills',icon:'⚗',sort_order:5,is_active:true},
    {item_type:'feature',title:'Clinical Training',description:'Hands-on Care',icon:'❤',sort_order:6,is_active:true}
  ];
  window.BHUMI_DEFAULT_CONTENT=defaults;
  window.getSiteContent=async function(){
    const out=structuredClone(defaults);
    if(!isDbReady()) return out;
    const {data,error}=await bhumiDb.from('site_content').select('content_key,content');
    if(error){console.warn('site_content:',error.message);return out;}
    (data||[]).forEach(r=>{if(out[r.content_key]) out[r.content_key]={...out[r.content_key],...(r.content||{})};});
    return out;
  };
  window.getSiteItems=async function(type,includeInactive=false){
    const fallback=fallbackItems.filter(x=>!type||x.item_type===type);
    if(!isDbReady()) return fallback;
    let q=bhumiDb.from('site_items').select('*').order('sort_order',{ascending:true}).order('id',{ascending:true});
    if(type) q=q.eq('item_type',type);
    if(!includeInactive) q=q.eq('is_active',true);
    const {data,error}=await q;
    if(error){console.warn('site_items:',error.message);return fallback;}
    return data||[];
  };
  window.applyTheme=function(s){
    document.documentElement.style.setProperty('--primary',s.primary_color||'#123b73');
    document.documentElement.style.setProperty('--accent',s.accent_color||'#e5b51b');
  };
  function set(id,val){const e=document.getElementById(id);if(e)e.textContent=val??'';}
  function setDisplay(id,show){const e=document.getElementById(id);if(e)e.style.display=show?'':'none';}
  window.renderDynamicHome=async function(){
    try{
      const c=await getSiteContent(),s=c.site_settings||{},sec=c.sections||{};
      applyTheme(s);
      document.title=s.college_name||'Bhumi Nursing College';
      set('siteCollegeName',s.college_name);set('siteTagline',s.tagline);set('siteEmail',s.email);set('sitePhone',s.phone);set('siteAddress',s.address);set('contactEmail',s.email);set('contactPhone',s.phone);set('contactAddress',s.address);set('siteFooter',s.footer_text);
      setDisplay('topbar',s.show_topbar!==false); setDisplay('updates',sec.updates!==false); setDisplay('about',sec.about!==false); setDisplay('courses',sec.courses!==false); setDisplay('academics',sec.academics!==false); setDisplay('admission',sec.admission!==false); setDisplay('facilities',sec.facilities!==false); setDisplay('gallery',sec.gallery!==false); setDisplay('contact',sec.contact!==false);
      const hero=c.hero||defaults.hero,about=c.about||defaults.about,ad=c.admission||defaults.admission,ac=c.academics||defaults.academics,ct=c.contact||defaults.contact;
      set('heroEyebrow',hero.eyebrow);set('heroTitle',hero.title);set('heroDescription',hero.description);set('heroButton',hero.button_text);const hb=document.getElementById('heroButtonLink');if(hb)hb.href=safeUrl(hero.button_link,'#courses');setDisplay('hero',hero.show!==false);
      set('aboutEyebrow',about.eyebrow);set('aboutTitle',about.title);set('aboutDescription',about.description);set('aboutButton',about.button_text);const ap=document.getElementById('aboutPhoto');if(ap)ap.src=about.image_url||'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80';const ab=document.getElementById('aboutButtonLink');if(ab)ab.href=safeUrl(about.button_link,'#contact');
      set('admissionEyebrow',ad.eyebrow);set('admissionTitle',ad.title);set('admissionDescription',ad.description);set('admissionButton',ad.button_text);const adb=document.getElementById('admissionButtonLink');if(adb)adb.href=safeUrl(ad.button_link,'#contact');setDisplay('admission',sec.admission!==false && ad.show!==false);
      set('academicsEyebrow',ac.eyebrow);set('academicsTitle',ac.title);set('academicsDescription',ac.description);setDisplay('academics',sec.academics!==false && ac.show!==false);
      set('contactTitle',ct.title);set('contactDescription',ct.description);setDisplay('contact',sec.contact!==false && ct.show!==false);
      const features=await getSiteItems('feature'),fg=document.getElementById('featureGrid');
      if(fg)fg.innerHTML=features.length?features.map(i=>`<div><span>${escapeHtml(i.icon||'🎓')}</span><b>${escapeHtml(i.title)}</b><small>${escapeHtml(i.description||i.subtitle||'')}</small></div>`).join(''):'';
      const courses=await getSiteItems('course'),cg=document.getElementById('coursesGrid');
      if(cg)cg.innerHTML=courses.length?courses.map(i=>{const t=(i.title||'').toLowerCase();const courseUrl=t.includes('b.sc')||t.includes('bsc')?'bsc-nursing.html':t.includes('gnm')?'gnm.html':t.includes('anm')?'anm.html':safeUrl(i.link_url,'#courses');return '<article class="card"><div class="icon">'+escapeHtml(i.icon||'🎓')+'</div><h3>'+escapeHtml(i.title)+'</h3><p>'+escapeHtml(i.description||'')+'</p><small>'+escapeHtml(i.subtitle||'')+'</small><a href="'+courseUrl+'">View Full Course Details →</a></article>';}).join(''):'<div class="loading">No courses published yet.</div>';
      const facilities=await getSiteItems('facility'),fac=document.getElementById('facilityGrid');
      if(fac)fac.innerHTML=facilities.length?facilities.map(i=>`<div class="facility-card"><div class="photo" style="background-image:url('${escapeHtml(i.image_url||'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80')}')"></div><div class="inside"><b>${escapeHtml(i.icon||'🏫')} ${escapeHtml(i.title)}</b><small>${escapeHtml(i.description||'')}</small></div></div>`).join(''):'<div class="loading">No facilities published yet.</div>';
      const gallery=await getSiteItems('gallery'),gg=document.getElementById('galleryGrid');
      if(gg){
        gg.innerHTML=gallery.length?gallery.map(i=>`<div class="gallery-item" style="background-image:url('${escapeHtml(i.image_url||'')}')"><span>${escapeHtml(i.title)}</span></div>`).join(''):'<div class="loading">No gallery images published yet.</div>';
        const slider=document.getElementById('gallerySlider'),dots=document.getElementById('gallerySliderDots'),track=gg;
        if(slider&&dots&&gallery.length){
          let current=0,timer=null;
          dots.innerHTML=gallery.map((_,n)=>`<button type="button" aria-label="Go to photo ${n+1}" class="${n===0?'active':''}"></button>`).join('');
          const go=n=>{current=(n+gallery.length)%gallery.length;track.style.transform=`translateX(-${current*100}%)`;dots.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===current));};
          const startAuto=()=>{clearInterval(timer);timer=setInterval(()=>go(current+1),4000)};
          slider.querySelector('.home-slider-arrow.prev').onclick=()=>{go(current-1);startAuto()};
          slider.querySelector('.home-slider-arrow.next').onclick=()=>{go(current+1);startAuto()};
          dots.querySelectorAll('button').forEach((b,n)=>b.onclick=()=>{go(n);startAuto()});
          slider.onmouseenter=()=>clearInterval(timer);slider.onmouseleave=startAuto;
          go(0);startAuto();
        }
      }
      const ql=await getSiteItems('quick_link'),qlbox=document.getElementById('quickLinks');
      if(qlbox)qlbox.innerHTML=ql.length?ql.map(i=>`<a href="${safeUrl(i.link_url,'#contact')}">${escapeHtml(i.icon||'🔗')} ${escapeHtml(i.title)} <b>→</b></a>`).join(''):'';
    }catch(e){console.warn('CMS content unavailable',e);}
  };
  async function renderStudentCMS(){
    if(!document.getElementById('studentDashboard'))return;
    try{const c=await getSiteContent(),s=c.student_portal||defaults.student_portal;
      set('studentPortalTitle',s.title);set('studentWelcomePrefix',s.welcome_prefix);set('studentIntro',s.intro);set('studentUpdatesTitle',s.updates_title);set('studentFacultyTitle',s.faculty_title);
      setDisplay('studentUpdatesSection',s.show_updates!==false);setDisplay('studentFacultySection',s.show_faculty!==false);
    }catch(e){console.warn(e);}
  }
  if(document.getElementById('hero')) renderDynamicHome();
  renderStudentCMS();
})();