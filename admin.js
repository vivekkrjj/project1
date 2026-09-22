(function(){
const $=id=>document.getElementById(id), esc=window.escapeHtml||((s='')=>String(s));
let CONTENT={};

function showMsg(id,msg,error=false){const e=$(id);if(!e)return;e.textContent=msg;e.className=error?'error':'success';setTimeout(()=>{if(e)e.textContent=''},4000)}
async function isAdmin(userOverride=null){
  if(!isDbReady())return false;
  let user=userOverride;
  if(!user){ const {data:{user:currentUser},error:authError}=await bhumiDb.auth.getUser(); if(authError)throw authError; user=currentUser; }
  if(!user)return false;
  const {data,error}=await bhumiDb.from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(error)throw error;
  return data?.role==='admin';
}
async function requireAdmin(userOverride=null){if(!(await isAdmin(userOverride))){await bhumiDb.auth.signOut({scope:'local'});throw new Error('Administrator access required.');}}
async function saveContent(key,content){
  await requireAdmin();
  const {error}=await bhumiDb.from('site_content').upsert(
    {content_key:key,content,updated_at:new Date().toISOString()},
    {onConflict:'content_key'}
  );
  if(error){
    console.error('CMS saveContent error:',key,error);
    throw new Error(`${key} save failed: ${error.message}`);
  }
  CONTENT[key]=content;
}
function fill(id,val){const e=$(id);if(!e)return;if(e.type==='checkbox')e.checked=!!val;else e.value=val??''}
function read(id){const e=$(id);return e?.type==='checkbox'?e.checked:(e?.value||'').trim()}
function loadForms(){
  const s=CONTENT.site_settings||{},h=CONTENT.hero||{},a=CONTENT.about||{},ch=CONTENT.chairman||{},ad=CONTENT.admission||{},ac=CONTENT.academics||{},ct=CONTENT.contact||{},sec=CONTENT.sections||{},p=CONTENT.student_portal||{};
  [['chairman_name',ch.name],['chairman_designation',ch.designation],['chairman_mobile',ch.mobile],['chairman_message',ch.message],['academic_eyebrow',ac.eyebrow],['academic_title',ac.title],['academic_description',ac.description],['contact_title',ct.title],['contact_description',ct.description],['site_college_name',s.college_name],['site_tagline',s.tagline],['site_email',s.email],['site_phone',s.phone],['site_address',s.address],['site_footer',s.footer_text],['site_primary',s.primary_color],['site_accent',s.accent_color],['hero_eyebrow',h.eyebrow],['hero_title',h.title],['hero_description',h.description],['hero_button',h.button_text],['hero_link',h.button_link],['about_eyebrow',a.eyebrow],['about_title',a.title],['about_description',a.description],['about_button',a.button_text],['about_link',a.button_link],['admission_eyebrow',ad.eyebrow],['admission_title',ad.title],['admission_description',ad.description],['admission_button',ad.button_text],['admission_link',ad.button_link],['portal_title',p.title],['portal_prefix',p.welcome_prefix],['portal_intro',p.intro],['portal_updates',p.updates_title],['portal_faculty',p.faculty_title]].forEach(x=>fill(x[0],x[1]));
  ['hero_show','about_show','chairman_show','admission_show','academic_show','contact_show'].forEach((id,i)=>fill(id,[h.show,a.show,ch.show,ad.show,ac.show,ct.show][i]!==false));
  Object.keys(sec).forEach(k=>fill('sec_'+k,sec[k]!==false));
  fill('portal_show_updates',p.show_updates!==false);fill('portal_show_faculty',p.show_faculty!==false);
  const ap=$('aboutPhotoPreview'); if(ap){ap.src=a.image_url||'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80';ap.style.display='block';}
  const cp=$('chairmanPhotoPreview'); if(cp){cp.src=ch.photo_url||'logo.png?v=20260903';cp.style.display='block';}
}
async function loadCMS(){
  await requireAdmin();
  CONTENT=await getSiteContent();loadForms();
  await Promise.all([refreshItems(),refreshGallery(),refreshQuickLinks(),refresh(),refreshStudentRequests(),refreshLibraryAdmin(),refreshQuizAdmin()]);
}
function itemCard(i,kind){
 return `<div class="cms-item"><div><b>${esc(i.icon||'')} ${esc(i.title)}</b><small>${esc(i.subtitle||i.description||'')}</small></div><div class="cms-actions"><button class="outline-btn" data-edit-${kind}="${i.id}">Edit</button><button class="outline-btn danger" data-del-item="${i.id}">Delete</button></div></div>`;
}
async function refreshItems(){
 try{
  const [courses,fac]=await Promise.all([getSiteItems('course',true),getSiteItems('facility',true)]);
  $('courseList').innerHTML=courses.length?courses.map(i=>itemCard(i,'course')).join(''):'<p>No courses.</p>';
  $('facilityList').innerHTML=fac.length?fac.map(i=>itemCard(i,'facility')).join(''):'<p>No facilities.</p>';
  document.querySelectorAll('[data-edit-course]').forEach(b=>b.onclick=()=>editItem(b.dataset.editCourse,'course'));
  document.querySelectorAll('[data-edit-facility]').forEach(b=>b.onclick=()=>editItem(b.dataset.editFacility,'facility'));
  document.querySelectorAll('[data-del-item]').forEach(b=>b.onclick=()=>deleteItem(b.dataset.delItem));
 }catch(e){$('courseList').innerHTML=`<p class="error">${esc(e.message)}</p>`}
}
async function editItem(id,type){
 await requireAdmin();
 const {data,error}=await bhumiDb.from('site_items').select('*').eq('id',id).maybeSingle();if(error||!data)return alert(error?.message||'Item not found.');
 if(type==='course'){[['course_id',data.id],['course_title',data.title],['course_subtitle',data.subtitle],['course_icon',data.icon],['course_description',data.description],['course_link',data.link_url],['course_order',data.sort_order]].forEach(x=>fill(x[0],x[1]));}
 else{[['facility_id',data.id],['facility_title',data.title],['facility_icon',data.icon],['facility_description',data.description],['facility_order',data.sort_order]].forEach(x=>fill(x[0],x[1]));}
 document.querySelector('[data-tab=items]').click();
}
async function saveItem(type){
 try{
  await requireAdmin();
  let id,title,description,subtitle,icon,link_url,sort_order;
  if(type==='course'){
    id=read('course_id');title=read('course_title');description=read('course_description');
    subtitle=read('course_subtitle');icon=read('course_icon');link_url=read('course_link');
    sort_order=Number(read('course_order')||1);
  }else{
    id=read('facility_id');title=read('facility_title');description=read('facility_description');
    subtitle='';icon=read('facility_icon');link_url=null;sort_order=Number(read('facility_order')||1);
  }
  if(!title)return alert('Title is required.');
  const row={item_type:type,title,description,subtitle,icon,link_url,sort_order,is_active:true,updated_at:new Date().toISOString()};
  const result=id
    ? await bhumiDb.from('site_items').update(row).eq('id',id)
    : await bhumiDb.from('site_items').insert(row);
  if(result.error){
    console.error('CMS item save error:',result.error);
    return alert(`Could not save ${type}: ${result.error.message}`);
  }
  clearItem(type);await refreshItems();await renderDynamicHome();
  showMsg('siteMsg',`${type==='course'?'Course':'Facility'} saved successfully.`);
 }catch(e){
  console.error(e); alert(e.message||'Unable to save item.');
 }
}
function clearItem(type){if(type==='course'){['course_id','course_title','course_subtitle','course_icon','course_description','course_link'].forEach(id=>fill(id,''));fill('course_order',1)}else{['facility_id','facility_title','facility_icon','facility_description'].forEach(id=>fill(id,''));fill('facility_order',1)}}
async function deleteItem(id){if(!confirm('Delete this item?'))return;await requireAdmin();const {error}=await bhumiDb.from('site_items').delete().eq('id',id);if(error)return alert(error.message);await refreshItems();await renderDynamicHome()}
async function saveGallery(){
 await requireAdmin();
 const id=read('gallery_id'),title=read('gallery_title');let image_url=read('gallery_image');let file=$('gallery_file')?.files?.[0];
 if(!title)return alert('Title is required.');
 if(file){
   file=await BhumiCropper.open(file,{aspectRatio:16/9});
   if(!file){$('gallery_file').value='';return;}
   if(file.size>5*1024*1024)return alert('Image must be 5 MB or smaller.');
   const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=`${Date.now()}-${safe}`;
   const up=await bhumiDb.storage.from('gallery').upload(path,file,{upsert:false,contentType:file.type});
   if(up.error)return alert(up.error.message);
   image_url=bhumiDb.storage.from('gallery').getPublicUrl(path).data.publicUrl;
 }
 if(!image_url)return alert('Image URL or image file is required.');
 const row={item_type:'gallery',title,image_url,description:read('gallery_description'),sort_order:Number(read('gallery_order')||1),is_active:true,updated_at:new Date().toISOString()};
 const r=id?await bhumiDb.from('site_items').update(row).eq('id',id):await bhumiDb.from('site_items').insert(row);
 if(r.error)return alert(r.error.message);clearGallery();await refreshGallery();await renderDynamicHome();
}
function clearGallery(){['gallery_id','gallery_title','gallery_image','gallery_description'].forEach(id=>fill(id,''));if($('gallery_file'))$('gallery_file').value='';fill('gallery_order',1)}
async function refreshGallery(){
 const {data,error}=await bhumiDb.from('site_items').select('*').eq('item_type','gallery').order('sort_order',{ascending:true});
 if(error){$('galleryList').innerHTML=`<p class="error">${esc(error.message)}</p>`;return}
 $('galleryList').innerHTML=(data||[]).map(i=>`<div class="cms-item"><div><b>${esc(i.title)}</b><small>${esc(i.image_url||'')}</small></div><div class="cms-actions"><button class="outline-btn" data-eg="${i.id}">Edit</button><button class="outline-btn danger" data-dg="${i.id}">Delete</button></div></div>`).join('')||'<p>No gallery items.</p>';
 document.querySelectorAll('[data-eg]').forEach(b=>b.onclick=async()=>{try{await requireAdmin();}catch(e){alert(e.message);return;} const {data}=await bhumiDb.from('site_items').select('*').eq('id',b.dataset.eg).maybeSingle();if(data){fill('gallery_id',data.id);fill('gallery_title',data.title);fill('gallery_image',data.image_url);fill('gallery_description',data.description);fill('gallery_order',data.sort_order)}});
 document.querySelectorAll('[data-dg]').forEach(b=>b.onclick=async()=>{if(confirm('Delete image?')){await requireAdmin();const r=await bhumiDb.from('site_items').delete().eq('id',b.dataset.dg);if(r.error)alert(r.error.message);else{await refreshGallery();await renderDynamicHome()}}});
}
async function refreshQuickLinks(){
 const {data,error}=await bhumiDb.from('site_items').select('*').eq('item_type','quick_link').order('sort_order',{ascending:true});
 if(error){$('qlList').innerHTML=`<p class="error">${esc(error.message)}</p>`;return}
 $('qlList').innerHTML=(data||[]).map(i=>`<div class="cms-item"><div><b>${esc(i.icon||'🔗')} ${esc(i.title)}</b><small>${esc(i.link_url||'')}</small></div><div class="cms-actions"><button class="outline-btn" data-eql="${i.id}">Edit</button><button class="outline-btn danger" data-dql="${i.id}">Delete</button></div></div>`).join('')||'<p>No quick links.</p>';
 document.querySelectorAll('[data-eql]').forEach(b=>b.onclick=async()=>{try{await requireAdmin();}catch(e){alert(e.message);return;} const {data}=await bhumiDb.from('site_items').select('*').eq('id',b.dataset.eql).maybeSingle();if(data){fill('ql_id',data.id);fill('ql_title',data.title);fill('ql_link',data.link_url);fill('ql_icon',data.icon);fill('ql_order',data.sort_order)}});
 document.querySelectorAll('[data-dql]').forEach(b=>b.onclick=async()=>{if(confirm('Delete quick link?')){await requireAdmin();const r=await bhumiDb.from('site_items').delete().eq('id',b.dataset.dql);if(r.error)alert(r.error.message);else refreshQuickLinks()}});
}
async function saveQL(){await requireAdmin();const id=read('ql_id'),title=read('ql_title');if(!title)return alert('Title required.');const row={item_type:'quick_link',title,link_url:read('ql_link'),icon:read('ql_icon'),sort_order:Number(read('ql_order')||1),is_active:true,updated_at:new Date().toISOString()};const r=id?await bhumiDb.from('site_items').update(row).eq('id',id):await bhumiDb.from('site_items').insert(row);if(r.error)return alert(r.error.message);['ql_id','ql_title','ql_link','ql_icon'].forEach(id=>fill(id,''));await refreshQuickLinks();await renderDynamicHome()}
function clearNotice(){['noticeId','noticeTitle','noticeDetails'].forEach(id=>fill(id,''));fill('noticeCategory','Notice');fill('noticeNew','true');$('publishNotice').textContent='Save Update'}
async function saveNotice(){
 await requireAdmin();
 const id=read('noticeId'),title=read('noticeTitle'),details=read('noticeDetails');if(!title)return alert('Title required.');
 const row={title,details,category:read('noticeCategory'),is_new:read('noticeNew')==='true',published_at:new Date().toISOString()};
 const r=id?await bhumiDb.from('notices').update(row).eq('id',id):await bhumiDb.from('notices').insert(row);
 if(r.error)return alert(r.error.message);clearNotice();await refresh();await renderHome();showMsg('noticeMsg','Notice saved successfully.');
}
async function refresh(){
 try{
  const notices=await loadNotices();
  $('adminUpdates').innerHTML=notices.length?notices.map(n=>`<div class="portal-notice"><div class="cms-actions"><button class="outline-btn" data-edit-notice="${n.id}">Edit</button><button class="delete-btn" data-notice-id="${n.id}">Delete</button></div><span class="tag ${n.is_new?'new':''}">${n.is_new?'NEW ':''}${esc(n.category||'Notice')}</span><h4>${esc(n.title)}</h4><p>${esc(n.details||'')}</p><small>${new Date(n.published_at||Date.now()).toLocaleDateString('en-IN')}</small></div>`).join(''):'<p>No published updates.</p>';
  $('adminUpdates').querySelectorAll('[data-edit-notice]').forEach(b=>b.onclick=async()=>{try{await requireAdmin();}catch(e){alert(e.message);return;} const {data}=await bhumiDb.from('notices').select('*').eq('id',b.dataset.editNotice).maybeSingle();if(data){fill('noticeId',data.id);fill('noticeTitle',data.title);fill('noticeDetails',data.details);fill('noticeCategory',data.category||'Notice');fill('noticeNew',String(data.is_new));$('publishNotice').textContent='Update Notice'}});
  $('adminUpdates').querySelectorAll('[data-notice-id]').forEach(b=>b.onclick=()=>delNotice(b.dataset.noticeId));
  const faculty=await loadFaculty();
  $('facultyAdminList').innerHTML=faculty.map(f=>`<div class="faculty faculty-admin-row"><img class="faculty-admin-photo" src="${esc(f.photo_url||'logo.png?v=20260903')}" alt="${esc(f.name)} photo"><div class="faculty-admin-info"><div><b>${esc(f.name)}</b><span>${esc(f.role||'')}</span><small>${esc(f.department||'')}</small></div><div class="cms-actions"><button class="outline-btn" data-edit-faculty="${f.id}">Edit</button><button class="delete-btn" data-fid="${f.id}">Delete</button></div></div></div>`).join('')||'<p>No faculty.</p>';
  $('facultyAdminList').querySelectorAll('[data-edit-faculty]').forEach(b=>b.onclick=async()=>{try{await requireAdmin();}catch(e){alert(e.message);return;} const {data}=await bhumiDb.from('faculty').select('*').eq('id',b.dataset.editFaculty).maybeSingle();if(data){fill('facultyId',data.id);fill('facultyName',data.name);fill('facultyRole',data.role);fill('facultyDept',data.department);fillFacultyPhotoPreview(data.photo_path); $('facultyPhoto').value=''; document.querySelector('[data-tab=faculty]').click()}});
  $('facultyAdminList').querySelectorAll('[data-fid]').forEach(b=>b.onclick=()=>delFaculty(b.dataset.fid));
 }catch(e){$('adminUpdates').innerHTML=`<p class="error">${esc(e.message)}</p>`}
}
async function delNotice(id){if(!confirm('Delete this update?'))return;await requireAdmin();const r=await bhumiDb.from('notices').delete().eq('id',id);if(r.error)alert(r.error.message);else{await refresh();await renderHome()}}
async function delFaculty(id){if(!confirm('Delete this member?'))return;await requireAdmin();const {data,error}=await bhumiDb.from('faculty').select('photo_path').eq('id',id).maybeSingle();if(error)return alert(error.message);const r=await bhumiDb.from('faculty').delete().eq('id',id);if(r.error)return alert(r.error.message);if(data?.photo_path)await bhumiDb.storage.from('faculty-profiles').remove([data.photo_path]);await refresh();await renderDynamicHome()}
async function fillFacultyPhotoPreview(path){if(!path){$('facultyPhotoPreview').src='logo.png?v=20260903';return} $('facultyPhotoPreview').src=await getFacultyPhotoUrl(path)}
function clearFaculty(){['facultyId','facultyName','facultyRole','facultyDept'].forEach(id=>fill(id,''));if($('facultyPhoto'))$('facultyPhoto').value='';fillFacultyPhotoPreview('');$('facultyPhotoMsg').textContent='';$('addFaculty').textContent='Save Member'}
async function saveFaculty(){
 try{
  await requireAdmin(); const id=read('facultyId'),name=read('facultyName'); if(!name)return alert('Name required.');
  let file=$('facultyPhoto')?.files?.[0];
  if(file){
    file=await BhumiCropper.open(file,{aspectRatio:1});
    if(!file){$('facultyPhoto').value='';return;}if(file.size>5*1024*1024)return alert('Photo must be 5 MB or smaller.');if(!['image/jpeg','image/png','image/webp'].includes(file.type))return alert('Please select JPG, PNG or WEBP image.');}
  let existingPath=null;if(id){const q=await bhumiDb.from('faculty').select('photo_path').eq('id',id).maybeSingle();if(q.error)throw q.error;existingPath=q.data?.photo_path||null;}
  let photo_path=existingPath;
  if(file){const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';photo_path=`${crypto.randomUUID()}.${ext}`;const up=await bhumiDb.storage.from('faculty-profiles').upload(photo_path,file,{upsert:false,contentType:file.type});if(up.error)throw up.error;}
  const row={name,role:read('facultyRole'),department:read('facultyDept'),photo_path};
  const r=id?await bhumiDb.from('faculty').update(row).eq('id',id):await bhumiDb.from('faculty').insert(row).select('id').maybeSingle();
  if(r.error){if(file)await bhumiDb.storage.from('faculty-profiles').remove([photo_path]);throw r.error;}
  if(file&&existingPath)await bhumiDb.storage.from('faculty-profiles').remove([existingPath]);
  clearFaculty();await refresh();showMsg('siteMsg','Faculty / staff member saved successfully.');
 }catch(e){console.error(e);alert(e.message||'Unable to save faculty member.')}
}
let studentCourseFilter='ALL';let studentSearch='';
function normalizeCourse(course){const c=String(course||'').trim().toLowerCase();if(c.includes('b.sc'))return 'B.Sc Nursing';if(c.includes('anm'))return 'ANM';if(c.includes('gnm'))return 'GNM';return String(course||'Other').trim()||'Other'}
async function getStudentPhotoUrl(path){try{const q=await bhumiDb.storage.from('student-profiles').createSignedUrl(path,1800);if(!q.error&&q.data?.signedUrl)return q.data.signedUrl}catch(e){}return 'logo.png?v=20260903'}
async function renderStudentRequests(){
 const box=$('studentRequests'),all=window.__BHUMI_STUDENT_REQUESTS||[],search=studentSearch.toLowerCase();
 const filtered=all.filter(r=>{const course=normalizeCourse(r.course);const hay=[r.full_name,r.email,r.mobile,r.roll_number,r.course,r.status].map(x=>String(x||'').toLowerCase()).join(' ');return (studentCourseFilter==='ALL'||course===studentCourseFilter)&&(!search||hay.includes(search))});
 $('countAll').textContent=all.length;$('countANM').textContent=all.filter(r=>normalizeCourse(r.course)==='ANM').length;$('countGNM').textContent=all.filter(r=>normalizeCourse(r.course)==='GNM').length;$('countBSc').textContent=all.filter(r=>normalizeCourse(r.course)==='B.Sc Nursing').length;
 if(!filtered.length){box.innerHTML='<div class="empty-state">No matching student registration requests.</div>';return}
 const cards=await Promise.all(filtered.map(async r=>{let photo='logo.png?v=20260903';if(r.photo_path)photo=await getStudentPhotoUrl(r.photo_path);return `<article class="student-profile-card"><div class="student-card-photo-wrap"><img src="${esc(photo)}" alt="${esc(r.full_name||'Student')} photo" class="student-card-photo" loading="lazy"></div><div class="student-card-info"><div class="student-card-top"><div><h4>${esc(r.full_name||'Student')}</h4><p>${esc(normalizeCourse(r.course))} ${r.roll_number?`• ${esc(r.roll_number)}`:''}</p></div><span class="status ${esc(r.status||'pending')}">${esc((r.status||'pending').toUpperCase())}</span></div><div class="student-card-details"><span>📧 ${esc(r.email||'—')}</span><span>📱 ${esc(r.mobile||'—')}</span><span>🎂 ${r.dob?new Date(r.dob+'T00:00:00').toLocaleDateString('en-IN'):'—'}</span></div><div class="student-card-actions"><button class="primary-btn small-btn" data-student-detail="${r.id}">View Full Profile</button>${r.status==='pending'?`<button class="approve-btn" data-rid="${r.id}" data-status="approved">Approve</button><button class="reject-btn" data-rid="${r.id}" data-status="rejected">Reject</button>`:''}${r.status==='approved'?`<button class="reject-btn" data-rid="${r.id}" data-status="banned">Ban Student</button>`:''}${r.status==='banned'?`<button class="approve-btn" data-rid="${r.id}" data-status="approved">Unban / Restore</button>`:''}</div></div></article>`}));
 box.innerHTML=cards.join('');box.querySelectorAll('[data-rid]').forEach(b=>b.onclick=()=>reviewStudent(b.dataset.rid,b.dataset.status));box.querySelectorAll('[data-student-detail]').forEach(b=>b.onclick=()=>showStudentDetail(b.dataset.studentDetail));
}
async function refreshStudentRequests(){const box=$('studentRequests');try{const {data,error}=await bhumiDb.from('student_registration_requests').select('*').order('created_at',{ascending:false});if(error)throw error;window.__BHUMI_STUDENT_REQUESTS=data||[];await renderStudentRequests()}catch(e){box.innerHTML=`<p class="error">${esc(e.message)}</p>`}}
async function reviewStudent(id,status){
  const action=status==='approved'?'Approve this student registration?':status==='banned'?'Ban this student?':status==='rejected'?'Reject this student registration?':'Restore this student registration?';
  if(!confirm(action))return;
  try{
    await requireAdmin();
    const {data:{user}}=await bhumiDb.auth.getUser();
    if(!user)throw new Error('Admin session expired. Please login again.');
    const payload={status,reviewed_at:new Date().toISOString(),reviewed_by:user.id};
    const {data,error}=await bhumiDb.from('student_registration_requests').update(payload).eq('id',Number(id)).select('id,status').maybeSingle();
    if(error)throw error;
    if(!data)throw new Error('No student record was updated. Please refresh the Admin panel and try again.');
    showMsg('studentMsg',status==='rejected'?'Student registration rejected successfully.':status==='banned'?'Student banned successfully.':status==='approved'?'Student approved successfully.':'Student restored successfully.');
    await refreshStudentRequests();
  }catch(e){console.error('Student status update failed:',e);alert(`Could not update student status: ${e.message||e}`)}
}
async function showStudentDetail(id){
 const r=(window.__BHUMI_STUDENT_REQUESTS||[]).find(x=>String(x.id)===String(id)); if(!r)return;
 let photo='logo.png?v=20260903';
 if(r.photo_path)photo=await getStudentPhotoUrl(r.photo_path);
 $('studentDetailBody').innerHTML=`<div class="student-detail-head"><img src="${photo}" alt="Student photo" class="student-detail-photo"><div><h2>${esc(r.full_name||'Student')}</h2><span class="status ${esc(r.status||'pending')}">${esc((r.status||'pending').toUpperCase())}</span></div></div><div class="student-detail-grid"><div><span>Name</span><b>${esc(r.full_name||'—')}</b></div><div><span>Email</span><b>${esc(r.email||'—')}</b></div><div><span>Mobile</span><b>${esc(r.mobile||'—')}</b></div><div><span>Roll Number</span><b>${esc(r.roll_number||'—')}</b></div><div><span>Course</span><b>${esc(r.course||'—')}</b></div><div><span>Date of Birth</span><b>${r.dob?new Date(r.dob+'T00:00:00').toLocaleDateString('en-IN'):'—'}</b></div><div><span>Registration ID</span><b>${esc(r.id)}</b></div><div><span>Submitted</span><b>${r.created_at?new Date(r.created_at).toLocaleString('en-IN'):'—'}</b></div><div><span>Reviewed</span><b>${r.reviewed_at?new Date(r.reviewed_at).toLocaleString('en-IN'):'—'}</b></div></div>`;
 $('studentDetailModal').classList.remove('hidden');
}

async function refreshQuizAdmin(){try{const {data,error}=await bhumiDb.from('quiz_questions').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});if(error)throw error;const box=$('quizList');box.innerHTML=(data||[]).map(i=>`<div class="cms-item"><div><b>${esc(i.course)} · ${esc(i.subject||'')} · ${esc(i.question)}</b><small>${esc(i.year_level||'')} · Correct: ${['A','B','C','D','E','F'][i.correct_option]||'?'} · ${i.is_active?'Active':'Hidden'}</small></div><div class="cms-actions"><button class="outline-btn" data-qedit="${i.id}">Edit</button><button class="outline-btn danger" data-qdel="${i.id}">Delete</button></div></div>`).join('')||'<p>No MCQs.</p>';box.querySelectorAll('[data-qedit]').forEach(b=>b.onclick=()=>editQuiz(b.dataset.qedit));box.querySelectorAll('[data-qdel]').forEach(b=>b.onclick=()=>deleteQuiz(b.dataset.qdel))}catch(e){$('quizList').innerHTML=`<p class="error">${esc(e.message)}</p>`}}
async function editQuiz(id){await requireAdmin();const {data,error}=await bhumiDb.from('quiz_questions').select('*').eq('id',id).maybeSingle();if(error||!data)return alert(error?.message||'Question not found.');[['quiz_id',data.id],['quiz_course',data.course],['quiz_year',data.year_level],['quiz_subject',data.subject],['quiz_question',data.question],['quiz_a',data.options?.[0]||''],['quiz_b',data.options?.[1]||''],['quiz_c',data.options?.[2]||''],['quiz_d',data.options?.[3]||''],['quiz_correct',data.correct_option],['quiz_explanation',data.explanation],['quiz_order',data.sort_order],['quiz_active',data.is_active]].forEach(x=>fill(x[0],x[1]));document.querySelector('[data-tab=quiz]').click()}
async function saveQuiz(){try{await requireAdmin();const id=read('quiz_id'),question=read('quiz_question');if(!question)return alert('Question is required.');const options=[read('quiz_a'),read('quiz_b'),read('quiz_c'),read('quiz_d')];if(options.some(x=>!x))return alert('All four options are required.');const row={course:read('quiz_course'),year_level:read('quiz_year')||null,subject:read('quiz_subject')||null,question,options,correct_option:Number(read('quiz_correct')),explanation:read('quiz_explanation')||null,sort_order:Number(read('quiz_order')||1),is_active:read('quiz_active'),updated_at:new Date().toISOString()};const r=id?await bhumiDb.from('quiz_questions').update(row).eq('id',id):await bhumiDb.from('quiz_questions').insert(row);if(r.error)return alert(r.error.message);clearQuiz();await refreshQuizAdmin();showMsg('siteMsg','MCQ saved successfully.')}catch(e){alert(e.message)}}
function clearQuiz(){['quiz_id','quiz_year','quiz_subject','quiz_question','quiz_a','quiz_b','quiz_c','quiz_d','quiz_explanation'].forEach(id=>fill(id,''));fill('quiz_course','ANM');fill('quiz_correct',0);fill('quiz_order',1);fill('quiz_active',true)}
async function deleteQuiz(id){if(!confirm('Delete this MCQ?'))return;await requireAdmin();const r=await bhumiDb.from('quiz_questions').delete().eq('id',id);if(r.error)alert(r.error.message);else refreshQuizAdmin()}

function getLibraryCatalog(){return window.BHUMI_CHAPTER_CATALOG||[];}
function uniqueSorted(arr){return [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'}));}
function refreshLibraryFormOptions(){
 const course=read('lib_course');
 const all=getLibraryCatalog();
 const cats=all.filter(x=>x.course===course);
 const years=uniqueSorted(cats.map(x=>x.year));
 const year=$('lib_year'), oldYear=year?.value||'';
 if(year){year.innerHTML='<option value="">All Years / Select</option>'+years.map(x=>`<option>${esc(x)}</option>`).join('');if(years.includes(oldYear))year.value=oldYear;}
 const selectedYear=year?.value||'';
 const yearCats=cats.filter(x=>!selectedYear||x.year===selectedYear);
 const sems=uniqueSorted(yearCats.map(x=>x.semester).filter(Boolean));
 const sem=$('lib_semester'), oldSem=sem?.value||'';
 if(sem){sem.innerHTML='<option value="">All Semesters / Not applicable</option>'+sems.map(x=>`<option>${esc(x)}</option>`).join('');if(sems.includes(oldSem))sem.value=oldSem;}
 const selectedSem=sem?.value||'';
 const subjectCats=yearCats.filter(x=>!selectedSem||x.semester===selectedSem);
 const subs=uniqueSorted(subjectCats.map(x=>x.subject));
 const subj=$('lib_subject'), oldSub=subj?.value||'';
 if(subj){subj.innerHTML='<option value="">All Subjects / Optional</option>'+subs.map(x=>`<option>${esc(x)}</option>`).join('');if(subs.includes(oldSub))subj.value=oldSub;}
 refreshLibraryChapterOptions();
}
function refreshLibraryChapterOptions(){
 const course=read('lib_course'), year=read('lib_year'), sem=read('lib_semester'), subject=read('lib_subject');
 const cats=getLibraryCatalog().filter(x=>x.course===course && (!year||x.year===year) && (!sem||x.semester===sem) && (!subject||x.subject===subject));
 const sel=$('lib_chapter');
 if(sel){sel.innerHTML='<option value="">All Chapters / Optional</option>'+cats.map(x=>`<option value="${esc(x.no)}">Chapter ${x.no}: ${esc(x.title||x.chapter_title||'')}</option>`).join('');}
}
function refreshLibraryFilterOptions(){
 const all=getLibraryCatalog();
 const course=read('lib_filter_course'), year=read('lib_filter_year'), sem=read('lib_filter_semester'), subject=read('lib_filter_subject');
 const base=all.filter(x=>!course||x.course===course);
 const years=uniqueSorted(base.map(x=>x.year));
 const fy=$('lib_filter_year'), oldY=fy?.value||''; if(fy){fy.innerHTML='<option value="">All Years</option>'+years.map(x=>`<option>${esc(x)}</option>`).join('');if(years.includes(oldY))fy.value=oldY;}
 const baseY=base.filter(x=>!fy?.value||x.year===fy.value);
 const sems=uniqueSorted(baseY.map(x=>x.semester).filter(Boolean));
 const fs=$('lib_filter_semester'), oldS=fs?.value||''; if(fs){fs.innerHTML='<option value="">All Semesters</option>'+sems.map(x=>`<option>${esc(x)}</option>`).join('');if(sems.includes(oldS))fs.value=oldS;}
 const baseS=baseY.filter(x=>!fs?.value||x.semester===fs.value);
 const subs=uniqueSorted(baseS.map(x=>x.subject));
 const fsub=$('lib_filter_subject'), oldSub=fsub?.value||''; if(fsub){fsub.innerHTML='<option value="">All Subjects</option>'+subs.map(x=>`<option>${esc(x)}</option>`).join('');if(subs.includes(oldSub))fsub.value=oldSub;}
}
async function refreshLibraryAdmin(){try{const {data,error}=await bhumiDb.from('library_materials').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});if(error)throw error;window.__BHUMI_LIBRARY_ADMIN_ROWS=data||[];renderLibraryAdminList();refreshLibraryFilterOptions();}catch(e){$('libraryList').innerHTML=`<p class="error">${esc(e.message)}</p>`}}
function renderLibraryAdminList(){
 const all=window.__BHUMI_LIBRARY_ADMIN_ROWS||[];
 const course=read('lib_filter_course'), year=read('lib_filter_year'), sem=read('lib_filter_semester'), subject=read('lib_filter_subject'), type=read('lib_filter_type'), q=read('lib_filter_search').toLowerCase().trim();
 const data=all.filter(i=>(!course||i.course===course)&&(!year||i.year_level===year)&&(!sem||i.semester===sem)&&(!subject||i.subject===subject)&&(!type||i.material_type===type)&&(!q||[i.title,i.subject,i.chapter_title,i.material_type,i.author,i.provider].some(v=>String(v||'').toLowerCase().includes(q))));
 const box=$('libraryList'), status=$('libraryFilterStatus');
 const books=all.filter(i=>i.material_type==='E-Book').length, notes=all.filter(i=>['Study Notes','Lecture Notes','Important Questions'].includes(i.material_type)).length, visible=all.filter(i=>i.is_active).length;
 if($('libAdminTotal'))$('libAdminTotal').textContent=all.length;
 if($('libAdminBooks'))$('libAdminBooks').textContent=books;
 if($('libAdminNotes'))$('libAdminNotes').textContent=notes;
 if($('libAdminVisible'))$('libAdminVisible').textContent=visible;
 if(status)status.textContent=`Showing ${data.length} of ${all.length}`;
 box.innerHTML=data.map(i=>`<div class="cms-item library-admin-item"><div><b>${esc(i.title||'Untitled material')}</b><div class="lib-badges"><span class="lib-badge">${esc(i.course||'All Nursing')}</span>${i.year_level?`<span class="lib-badge">${esc(i.year_level)}</span>`:''}${i.subject?`<span class="lib-badge">${esc(i.subject)}</span>`:''}<span class="lib-badge type">${esc(i.material_type||'Resource')}</span><span class="lib-badge">${i.is_active?'✓ Visible':'Hidden'}</span></div><small>${esc(i.chapter_title||'Chapter-wise / General resource')}${i.author?' · '+esc(i.author):''}</small></div><div class="cms-actions"><button class="outline-btn" data-lib-edit="${i.id}">✏️ Edit</button><button class="outline-btn danger" data-lib-del="${i.id}">🗑 Delete</button></div></div>`).join('')||'<div class="lib-empty"><strong>📚 No materials found</strong><br><small>Try another filter or use a Quick Add option above.</small></div>';
 box.querySelectorAll('[data-lib-edit]').forEach(b=>b.onclick=()=>editLibrary(b.dataset.libEdit));box.querySelectorAll('[data-lib-del]').forEach(b=>b.onclick=()=>deleteLibrary(b.dataset.libDel));
}
async function editLibrary(id){await requireAdmin();const {data,error}=await bhumiDb.from('library_materials').select('*').eq('id',id).maybeSingle();if(error||!data)return alert(error?.message||'Material not found.');[['lib_id',data.id],['lib_course',data.course],['lib_year',data.year_level],['lib_semester',data.semester||''],['lib_subject',data.subject],['lib_type',data.material_type],['lib_title',data.title],['lib_description',data.description],['lib_author',data.author],['lib_provider',data.provider],['lib_external',data.external_url],['lib_file',data.file_url],['lib_order',data.sort_order],['lib_active',data.is_active]].forEach(x=>fill(x[0],x[1]));refreshLibraryChapterOptions();setTimeout(()=>{const d=data;const sel=$('lib_chapter');if(sel){const cats=getLibraryCatalog().filter(x=>x.course===d.course&&x.year===d.year_level&&((x.semester||'')===(d.semester||''))&&x.subject===d.subject);sel.innerHTML='<option value="">All Chapters / Optional</option>'+cats.map(x=>`<option value="${esc(x.no)}">Chapter ${x.no}: ${esc(x.title||x.chapter_title||'')}</option>`).join('');const found=cats.find(x=>String(x.no)===String(d.chapter_no));if(found)sel.value=String(found.no);}},0);document.querySelector('[data-tab=library]').click()}
async function saveLibrary(){try{await requireAdmin();const id=read('lib_id'),title=read('lib_title');if(!title)return alert('Title is required.');let fileUrl=read('lib_file')||null;const file=$('lib_file_upload')?.files?.[0];if(file){if(file.size>25*1024*1024)return alert('File is too large. Please keep it under 25 MB.');const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${read('lib_course')}/${Date.now()}_${safe}`;const up=await bhumiDb.storage.from('library-files').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});if(up.error)return alert(up.error.message);fileUrl=`storage:${path}`}let chapterId=null;const chapterNo=read('lib_chapter');if(chapterNo){const cat=(window.BHUMI_CHAPTER_CATALOG||[]).find(x=>x.course===read('lib_course')&&x.year===read('lib_year')&&((x.semester||'')===(read('lib_semester')||''))&&x.subject===read('lib_subject')&&String(x.no)===String(chapterNo));if(cat){let cr=await bhumiDb.from('library_chapters').select('id').eq('course',cat.course).eq('year_level',cat.year).eq('subject',cat.subject).eq('chapter_no',cat.no).limit(1).maybeSingle();if(cr.error)return alert(cr.error.message);if(cr.data){chapterId=cr.data.id;}else{const ins=await bhumiDb.from('library_chapters').insert({course:cat.course,year_level:cat.year,semester:cat.semester||null,subject:cat.subject,chapter_no:cat.no,chapter_title:cat.title||cat.chapter_title,is_active:true,sort_order:cat.no}).select('id').single();if(ins.error)return alert(ins.error.message);chapterId=ins.data.id;}}}const row={course:read('lib_course'),year_level:read('lib_year')||null,semester:read('lib_semester')||null,subject:read('lib_subject')||null,chapter_id:chapterId,material_type:read('lib_type'),title,description:read('lib_description'),author:read('lib_author'),provider:read('lib_provider'),external_url:read('lib_external')||null,file_url:fileUrl,sort_order:Number(read('lib_order')||1),is_active:read('lib_active'),updated_at:new Date().toISOString()};const r=id?await bhumiDb.from('library_materials').update(row).eq('id',id):await bhumiDb.from('library_materials').insert(row);if(r.error)return alert(r.error.message);clearLibrary();await refreshLibraryAdmin();showMsg('siteMsg','Library material saved successfully.')}catch(e){alert(e.message)}}
function clearLibrary(){['lib_id','lib_title','lib_description','lib_author','lib_provider','lib_external','lib_file'].forEach(id=>fill(id,''));if($('lib_file_upload'))$('lib_file_upload').value='';fill('lib_course','ANM');fill('lib_year','');fill('lib_semester','');fill('lib_subject','');refreshLibraryFormOptions();fill('lib_type','Study Notes');fill('lib_order',1);fill('lib_active',true)}
async function deleteLibrary(id){if(!confirm('Delete this study material?'))return;await requireAdmin();const r=await bhumiDb.from('library_materials').delete().eq('id',id);if(r.error)alert(r.error.message);else refreshLibraryAdmin()}
function bindCMS(){
 $('closeStudentDetail').onclick=()=>$('studentDetailModal').classList.add('hidden');
$('facultyPhoto').onchange=()=>{const f=$('facultyPhoto').files?.[0];if(!f)return;$('facultyPhotoMsg').textContent=f.size>5*1024*1024?'Photo must be 5 MB or smaller.':'Selected: '+f.name;$('facultyPhotoPreview').src=URL.createObjectURL(f)};
$('chairman_photo').onchange=()=>{const f=$('chairman_photo').files?.[0];if(!f)return;$('chairmanPhotoMsg').textContent=f.size>5*1024*1024?'Photo must be 5 MB or smaller.':'Selected: '+f.name;$('chairmanPhotoPreview').src=URL.createObjectURL(f);$('chairmanPhotoPreview').style.display='block'};
$('about_photo').onchange=()=>{const f=$('about_photo').files?.[0];if(!f)return;$('aboutPhotoMsg').textContent=f.size>5*1024*1024?'Photo must be 5 MB or smaller.':'Selected: '+f.name;$('aboutPhotoPreview').src=URL.createObjectURL(f);$('aboutPhotoPreview').style.display='block'};
$('studentRequestSearch').oninput=e=>{studentSearch=e.target.value.trim();renderStudentRequests()};
document.querySelectorAll('[data-course-filter]').forEach(b=>b.onclick=()=>{studentCourseFilter=b.dataset.courseFilter;document.querySelectorAll('[data-course-filter]').forEach(x=>x.classList.toggle('active',x===b));renderStudentRequests()});
 $('studentDetailModal').onclick=e=>{if(e.target.id==='studentDetailModal')$('studentDetailModal').classList.add('hidden')};
 document.querySelectorAll('.cms-nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.cms-nav button').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.cms-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(b.dataset.tab==='students'){ $('tab-students').classList.add('active'); $('tab-portal').classList.add('active'); } else $('tab-'+b.dataset.tab).classList.add('active')});
$('enquirySearch')?.addEventListener('input',renderEnquiries); $('enquiryStatusFilter')?.addEventListener('change',renderEnquiries); document.querySelector('[data-tab=enquiries]')?.addEventListener('click',()=>loadEnquiries().catch(e=>{if($('adminEnquiries'))$('adminEnquiries').innerHTML='<p class=error>'+esc(e.message)+'</p>'}));
 $('saveSite').onclick=async()=>{try{await saveContent('site_settings',{college_name:read('site_college_name'),tagline:read('site_tagline'),email:read('site_email'),phone:read('site_phone'),address:read('site_address'),footer_text:read('site_footer'),primary_color:read('site_primary'),accent_color:read('site_accent'),show_topbar:true,show_news:true});showMsg('siteMsg','Site settings saved.');await renderDynamicHome()}catch(e){showMsg('siteMsg',e.message,true)}};
 
async function loadEnquiries(){
  await requireAdmin();
  const {data,error}=await bhumiDb.from('admission_enquiries').select('*').order('created_at',{ascending:false});
  if(error)throw error;
  window.__enquiries=data||[]; renderEnquiries();
}
function renderEnquiries(){
  const box=$('adminEnquiries'); if(!box)return;
  const q=($('enquirySearch')?.value||'').toLowerCase().trim();
  const st=($('enquiryStatusFilter')?.value||'').toLowerCase();
  const norm=e=>String(e.status||'new').toLowerCase();
  const rows=(window.__enquiries||[]).filter(e=>{
    const text=[e.full_name,e.mobile,e.email,e.course,e.message,e.status].map(v=>String(v||'').toLowerCase()).join(' ');
    return (!st||norm(e)===st)&&(!q||text.includes(q));
  });
  box.innerHTML=rows.length?rows.map(e=>{
    const reply=e.email?'<button type="button" class="outline-btn" data-enquiry-reply="'+e.id+'">✉️ Reply</button>':'';
    return '<div class="cms-item"><div><strong>'+esc(e.full_name)+'</strong><small>Mobile: '+esc(e.mobile)+'</small><small>Course: '+esc(e.course||'Not specified')+'</small><p>'+esc(e.message||'')+'</p></div><div class="cms-actions"><select data-enquiry-status="'+e.id+'"><option value="new" '+(norm(e)==='new'?'selected':'')+'>New</option><option value="contacted" '+(norm(e)==='contacted'?'selected':'')+'>Contacted</option><option value="closed" '+(norm(e)==='closed'?'selected':'')+'>Closed</option></select>'+reply+'<button type="button" class="delete-btn" data-enquiry-delete="'+e.id+'">Delete</button></div></div>';
  }).join(''):'<p>No enquiries found.</p>';
  box.querySelectorAll('[data-enquiry-status]').forEach(el=>el.onchange=async()=>{
    try{await requireAdmin();const {error}=await bhumiDb.from('admission_enquiries').update({status:el.value}).eq('id',el.dataset.enquiryStatus);if(error)throw error;const x=(window.__enquiries||[]).find(x=>String(x.id)===String(el.dataset.enquiryStatus));if(x)x.status=el.value;renderEnquiries();showMsg('enquiryAdminMsg','Status updated.')}catch(err){alert(err.message)}
  });
  box.querySelectorAll('[data-enquiry-reply]').forEach(btn=>btn.onclick=()=>{ 
    const e=(window.__enquiries||[]).find(x=>String(x.id)===String(btn.dataset.enquiryReply));
    if(!e?.email)return;
    const card=btn.closest('.cms-item');
    const existing=card?.querySelector('[data-enquiry-composer]');
    if(existing){existing.remove();btn.textContent='✉️ Reply';return;}
    const composer=document.createElement('div');
    composer.setAttribute('data-enquiry-composer','true');
    composer.style.cssText='margin-top:12px;padding:14px;border:1px solid #d9e2ec;border-radius:12px;background:#f8fbff;width:100%;box-sizing:border-box;';
    composer.innerHTML='<div style="font-weight:700;margin-bottom:8px;">✉️ Your Reply</div><textarea data-enquiry-reply-text rows="6" placeholder="Write your response to the student..." style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:8px;resize:vertical;"></textarea><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;"><button type="button" class="primary-btn" data-enquiry-send>Send Reply</button><button type="button" class="outline-btn" data-enquiry-cancel>Cancel</button></div>';
    card?.querySelector(':scope > div:first-child')?.appendChild(composer);
    const textarea=composer.querySelector('[data-enquiry-reply-text]');
    textarea?.focus();
    composer.querySelector('[data-enquiry-cancel]').onclick=()=>{composer.remove();btn.textContent='✉️ Reply';};
    composer.querySelector('[data-enquiry-send]').onclick=()=>{
      const replyText=(textarea?.value||'').trim();
      if(!replyText){alert('Please write your reply first.');textarea?.focus();return;}
      const subject=encodeURIComponent('Response to Your Enquiry - Bhumi Nursing College');
      const body=encodeURIComponent(
        'Dear '+(e.full_name||'Student')+',\\n\\n'+
        'Thank you for contacting Bhumi Nursing College.\\n\\n'+
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n'+
        'YOUR QUERY\\n'+
        '“'+(e.message||'')+'”\\n'+
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n'+
        'RESPONSE FROM BHUMI NURSING COLLEGE\\n'+
        '“'+replyText+'”\\n\\n'+
        'If you have any further queries or require additional information, please feel free to contact Bhumi Nursing College. Our Admissions Office will be happy to assist you.\\n\\n'+
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n'+
        'BHUMI NURSING COLLEGE\\n'+
        'Admissions Office\\n\\n'+
        'Lalganj near Govt Referral Hospital,\\n'+
        'Lalganj, Vaishali\\n'+
        'Contact: '+(CONTENT.site_settings?.phone||'Please contact the college office')+'\\n'+
        'Email: '+(CONTENT.site_settings?.email||'Please contact the college office')+'\\n'+
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n'+
        'Warm regards,\\n'+
        'Admissions Office\\n'+
        'BHUMI NURSING COLLEGE'
      );
      window.location.href='mailto:'+e.email+'?subject='+subject+'&body='+body;
    };
    btn.textContent='✖ Close Reply';
  });
  box.querySelectorAll('[data-enquiry-delete]').forEach(btn=>btn.onclick=async()=>{
    if(!confirm('Delete this enquiry?'))return;
    try{await requireAdmin();const {error}=await bhumiDb.from('admission_enquiries').delete().eq('id',btn.dataset.enquiryDelete);if(error)throw error;await loadEnquiries();}catch(err){alert(err.message)}
  });
}

const saves={saveHero:['hero',{eyebrow:'hero_eyebrow',title:'hero_title',description:'hero_description',button_text:'hero_button',button_link:'hero_link',show:'hero_show'}],saveAbout:['about',{eyebrow:'about_eyebrow',title:'about_title',description:'about_description',button_text:'about_button',button_link:'about_link',show:'about_show'}],saveAcademic:['academics',{eyebrow:'academic_eyebrow',title:'academic_title',description:'academic_description',show:'academic_show'}],saveContact:['contact',{title:'contact_title',description:'contact_description',show:'contact_show'}],saveAdmission:['admission',{eyebrow:'admission_eyebrow',title:'admission_title',description:'admission_description',button_text:'admission_button',button_link:'admission_link',show:'admission_show'}],saveSections:['sections',{about:'sec_about',chairman:'sec_chairman',courses:'sec_courses',updates:'sec_updates',academics:'sec_academics',admission:'sec_admission',facilities:'sec_facilities',gallery:'sec_gallery',contact:'sec_contact'}],savePortal:['student_portal',{title:'portal_title',welcome_prefix:'portal_prefix',intro:'portal_intro',updates_title:'portal_updates',faculty_title:'portal_faculty',show_updates:'portal_show_updates',show_faculty:'portal_show_faculty'}]};
 Object.entries(saves).forEach(([id,[key,map]])=>{$(id).onclick=async()=>{try{const obj={};Object.entries(map).forEach(([k,v])=>obj[k]=read(v));await saveContent(key,obj);showMsg('siteMsg',key==='student_portal'?'Student Portal saved.':`${key} saved.`);await renderDynamicHome()}catch(e){alert(e.message)}}});
$('saveChairman').onclick=async()=>{try{await requireAdmin();const old=CONTENT.chairman||{};let photo_url=old.photo_url||'';let f=$('chairman_photo')?.files?.[0];if(f){f=await BhumiCropper.open(f,{aspectRatio:1});if(!f){$('chairman_photo').value='';return;}if(f.size>5*1024*1024)return alert('Photo must be 5 MB or smaller.');if(!['image/jpeg','image/png','image/webp'].includes(f.type))return alert('Please select JPG, PNG or WEBP image.');const ext=f.type==='image/png'?'png':f.type==='image/webp'?'webp':'jpg';const path=`chairman/${crypto.randomUUID()}.${ext}`;const up=await bhumiDb.storage.from('site-media').upload(path,f,{upsert:false,contentType:f.type});if(up.error)throw up.error;photo_url=bhumiDb.storage.from('site-media').getPublicUrl(path).data.publicUrl;}const obj={name:read('chairman_name'),designation:read('chairman_designation')||'Chairman, Bhumi Nursing College',mobile:read('chairman_mobile').replace(/\D/g,''),message:read('chairman_message'),photo_url,show:read('chairman_show')};await saveContent('chairman',obj);$('chairman_photo').value='';showMsg('siteMsg','Chairman message saved successfully.');await renderDynamicHome();}catch(e){alert(e.message)}};
$('saveAbout').onclick=async()=>{try{await requireAdmin();const old=CONTENT.about||{};let image_url=old.image_url||'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80';let f=$('about_photo')?.files?.[0];if(f){f=await BhumiCropper.open(f,{aspectRatio:16/9});if(!f){$('about_photo').value='';return;}if(f.size>5*1024*1024)return alert('Photo must be 5 MB or smaller.');if(!['image/jpeg','image/png','image/webp'].includes(f.type))return alert('Please select JPG, PNG or WEBP image.');const ext=f.type==='image/png'?'png':f.type==='image/webp'?'webp':'jpg';const path=`about/${crypto.randomUUID()}.${ext}`;const up=await bhumiDb.storage.from('site-media').upload(path,f,{upsert:false,contentType:f.type});if(up.error)throw up.error;image_url=bhumiDb.storage.from('site-media').getPublicUrl(path).data.publicUrl;}const obj={eyebrow:read('about_eyebrow'),title:read('about_title'),description:read('about_description'),button_text:read('about_button'),button_link:read('about_link'),image_url,show:read('about_show')};await saveContent('about',obj);$('about_photo').value='';showMsg('siteMsg','About section and building photo saved.');await renderDynamicHome();}catch(e){alert(e.message)}};
 $('lib_course').onchange=refreshLibraryFormOptions;$('lib_year').onchange=refreshLibraryFormOptions;$('lib_semester').onchange=refreshLibraryFormOptions;$('lib_subject').onchange=refreshLibraryChapterOptions;refreshLibraryFormOptions();$('lib_filter_course').onchange=()=>{refreshLibraryFilterOptions();renderLibraryAdminList()};$('lib_filter_year').onchange=()=>{refreshLibraryFilterOptions();renderLibraryAdminList()};$('lib_filter_semester').onchange=()=>{refreshLibraryFilterOptions();renderLibraryAdminList()};$('lib_filter_subject').onchange=renderLibraryAdminList;$('lib_filter_type').onchange=renderLibraryAdminList;$('lib_filter_search').oninput=renderLibraryAdminList;$('saveLibrary').onclick=saveLibrary;$('clearLibrary').onclick=clearLibrary;$('saveQuiz').onclick=saveQuiz;$('clearQuiz').onclick=clearQuiz;$('saveCourse').onclick=()=>saveItem('course');$('clearCourse').onclick=()=>clearItem('course');$('saveFacility').onclick=()=>saveItem('facility');$('clearFacility').onclick=()=>clearItem('facility');$('saveGallery').onclick=saveGallery;$('clearGallery').onclick=clearGallery;$('saveQL').onclick=saveQL;$('publishNotice').onclick=saveNotice;$('clearNotice').onclick=clearNotice;$('addFaculty').onclick=saveFaculty;$('clearFaculty').onclick=clearFaculty;
}
async function login(){
 const err=$('adminError');err.textContent='';
 const btn=$('adminLoginBtn');
 if(btn){btn.disabled=true;btn.textContent='Checking...';}
 if(!isDbReady()){err.textContent='Supabase is not configured.';if(btn){btn.disabled=false;btn.textContent='Login';}return}
 const email=read('adminEmail'),password=$('adminPassword').value;
 if(!email||!password){err.textContent='Email and password are required.';if(btn){btn.disabled=false;btn.textContent='Login';}return}
 const {data,error}=await bhumiDb.auth.signInWithPassword({email,password});
 if(error){err.textContent=error.message; if(btn){btn.disabled=false;btn.textContent='Login';} return}
 try{
   await requireAdmin(data?.user||null);
   $('adminLogin').classList.add('hidden');
   $('adminDashboard').classList.remove('hidden');
   err.textContent='';
   loadCMS().catch(e=>{console.error(e);showMsg('siteMsg',e.message||'Some admin data could not be loaded.',true);});
 }catch(e){
   try{await bhumiDb.auth.signOut({scope:'local'});}catch(_e){}
   try{localStorage.removeItem('bhumi-admin-auth');}catch(_e){}
   err.textContent=e.message||'Administrator access denied.';
 }finally{
   if(btn){btn.disabled=false;btn.textContent='Login';}
 }
}
$('adminLoginBtn').onclick=login;
$('adminLogout').onclick=async()=>{
 if(isDbReady()) await bhumiDb.auth.signOut({scope:'local'});
 try{localStorage.removeItem('bhumi-admin-auth');}catch(e){}
 $('adminDashboard').classList.add('hidden');
 $('adminLogin').classList.remove('hidden');
};
bindCMS();
if(isDbReady()){
 bhumiDb.auth.getSession().then(async({data})=>{
   if(data.session){
     try{
       await requireAdmin();
       $('adminLogin').classList.add('hidden');
       $('adminDashboard').classList.remove('hidden');
       await loadCMS();
     }catch(e){
       await bhumiDb.auth.signOut();
     }
   }
 });
}
})();