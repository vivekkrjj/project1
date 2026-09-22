(function(){
const $=id=>document.getElementById(id);
async function getRegistration(userId){
  const {data,error}=await bhumiDb.from('student_registration_requests').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error) throw error;
  return data;
}
async function refresh(){
 try{
  const notices=await loadNotices();
  $('studentUpdates').innerHTML=notices.length?notices.map(n=>`<div class="portal-notice"><span class="tag ${n.is_new?'new':''}">${n.is_new?'<span class="new-badge">NEW</span> ':''}${escapeHtml(n.category||'Notice')}</span><h4>${escapeHtml(n.title)}</h4><p>${escapeHtml(n.details||'')}</p><small>${new Date(n.published_at||Date.now()).toLocaleDateString('en-IN')}</small></div>`).join(''):'<p>No updates available.</p>';
  const faculty=await loadFaculty();
  $('facultyList').innerHTML=faculty.length?faculty.map(f=>`<div class="faculty faculty-portal-card"><img class="faculty-portal-photo" src="${escapeHtml(f.photo_url||'logo.png?v=20260903')}" alt="${escapeHtml(f.name)} photo"><div><b>${escapeHtml(f.name)}</b><span>${escapeHtml(f.role||'')}</span><small>${escapeHtml(f.department||'')}</small></div></div>`).join(''):'<p>No faculty/staff details published yet.</p>';
 }catch(e){$('studentUpdates').innerHTML='<p>Unable to load live data. Check Supabase configuration.</p>';}
}
async function loadStudentProfile(user,reg){
  $('profileName').textContent=reg?.full_name||user.user_metadata?.full_name||'Student';
  $('profileEmail').textContent=reg?.email||user.email||'—';
  $('profileMobile').textContent=reg?.mobile||'—';
  $('profileRoll').textContent=reg?.roll_number||'—';
  $('profileCourse').textContent=reg?.course||'—';
  $('profileDob').textContent=reg?.dob?new Date(reg.dob+'T00:00:00').toLocaleDateString('en-IN'):'—';
  const path=user.user_metadata?.student_photo_path;
  $('studentProfilePhoto').src=path ? (await signedProfileUrl(path)) : 'logo.png?v=20260903';
  updateStudentIdCard(reg,user);
}
async function signedProfileUrl(path){
  try{const {data,error}=await bhumiDb.storage.from('student-profiles').createSignedUrl(path,3600); if(!error&&data?.signedUrl)return data.signedUrl;}catch(e){}
  return 'logo.png?v=20260903';
}
async function uploadStudentPhoto(){
  const input=$('studentPhotoInput'),msg=$('profilePhotoMsg'); let file=input.files?.[0]; if(!file)return; msg.textContent='Opening photo cropper...'; file=await BhumiCropper.open(file,{aspectRatio:1}); if(!file){input.value='';msg.textContent='Photo selection cancelled.';return;} msg.textContent='Uploading cropped photo...';
  if(!isDbReady()){msg.textContent='Supabase is not configured.';return}
  if(file.size>5*1024*1024){msg.textContent='Photo must be 5 MB or smaller.';input.value='';return}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){msg.textContent='Please select JPG, PNG or WEBP image.';input.value='';return}
  const {data:{user},error:ue}=await bhumiDb.auth.getUser(); if(ue||!user){msg.textContent='Please login again.';return}
  const old=user.user_metadata?.student_photo_path; const path=user.id+'/profile-'+Date.now()+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');
  const up=await bhumiDb.storage.from('student-profiles').upload(path,file,{upsert:false,contentType:file.type});
  if(up.error){msg.textContent=(up.error.message||'Upload failed')+(String(up.error.message||'').toLowerCase().includes('bucket')?' — profile storage is not configured.':'' );return}
  const upd=await bhumiDb.auth.updateUser({data:{student_photo_path:path}});
  await bhumiDb.from('student_registration_requests').update({photo_path:path}).eq('user_id',user.id);
  if(upd.error){msg.textContent=upd.error.message;return}
  if(old) await bhumiDb.storage.from('student-profiles').remove([old]);
  $('studentProfilePhoto').src=await signedProfileUrl(path); msg.textContent='Photo updated successfully.'; input.value='';
}
function updateStudentIdCard(reg,user){
  const photo=user.user_metadata?.student_photo_path;
  const fallbackLogo = 'assets/bhumi-nursing-college-logo.png';
  $('idCardPhoto').src=photo ? $('studentProfilePhoto').src : fallbackLogo;
  $('idCardName').textContent=reg?.full_name||user.user_metadata?.full_name||'Student';
  $('idCardCourse').textContent=reg?.course||'—';
  $('idCardRoll').textContent=reg?.roll_number||'—';
  $('idCardDob').textContent=reg?.dob?new Date(reg.dob+'T00:00:00').toLocaleDateString('en-IN'):'—';
  $('idCardEmail').textContent=reg?.email||user.email||'—';
  $('idCardMobile').textContent=reg?.mobile||'—';
  $('idCardRegistration').textContent=reg?.id??'—';
  $('idCardStatus').textContent=String(reg?.status||'approved').toUpperCase();

  const qrBox=$('studentIdQr');
  if(qrBox){
    qrBox.innerHTML='';
    const payload={name:reg?.full_name||user.user_metadata?.full_name||'Student',course:reg?.course||'—',roll:reg?.roll_number||'—',registration_id:reg?.id??'—',dob:reg?.dob?new Date(reg.dob+'T00:00:00').toLocaleDateString('en-IN'):'—',email:reg?.email||user.email||'—',mobile:reg?.mobile||'—',status:String(reg?.status||'approved').toUpperCase()};
    try{
      const bytes=new TextEncoder().encode(JSON.stringify(payload));
      let bin=''; bytes.forEach(b=>bin+=String.fromCharCode(b));
      const token=btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      const qrText='BHUMI NURSING COLLEGE\\nName: '+payload.name+'\\nCourse: '+payload.course+'\\nRoll: '+payload.roll+'\\nRegistration ID: '+payload.registration_id+'\\nDOB: '+payload.dob+'\\nEmail: '+payload.email+'\\nMobile: '+payload.mobile+'\\nStatus: '+payload.status;
      if(typeof QRCode==='function'){
        new QRCode(qrBox,{text:qrText,width:220,height:220,colorDark:'#111827',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
      }else{
        qrBox.innerHTML='<span style="font-size:11px;color:#b42318;text-align:center;display:block;padding:18px">QR generator unavailable. Please reload the page.</span>';
      }
    }catch(e){console.warn('QR generation failed:',e);}
  }
}
async function downloadStudentId(){
 const {data:{user},error}=await bhumiDb.auth.getUser();
 if(error||!user){alert('Please login again.');return}
 const reg=await getRegistration(user.id);
 if(!reg||reg.status!=='approved'){alert('Student ID Card is available only for approved students.');return}
 updateStudentIdCard(reg,user);
 window.print();
}
async function removeStudentPhoto(){
  const msg=$('profilePhotoMsg'); const {data:{user}}=await bhumiDb.auth.getUser(); if(!user)return; const old=user.user_metadata?.student_photo_path;
  if(old) await bhumiDb.storage.from('student-profiles').remove([old]); await bhumiDb.auth.updateUser({data:{student_photo_path:null}}); $('studentProfilePhoto').src='logo.png?v=20260903'; msg.textContent='Profile photo removed.';
}
async function login(){
 const err=$('studentError');err.textContent='';
 if(!isDbReady()){err.textContent='Supabase is not configured yet.';return}
 const identifier=$('studentEmail').value.trim(), password=$('studentPassword').value;
 if(!identifier||!password){err.textContent='Email, mobile or roll number and password are required.';return}
 let email=identifier;
 try{
   const lookup=await fetch(`${window.BHUMI_CONFIG.SUPABASE_URL}/functions/v1/student-login-lookup`,{
     method:'POST',headers:{'Content-Type':'application/json','apikey':window.BHUMI_CONFIG.SUPABASE_ANON_KEY},
     body:JSON.stringify({identifier})
   });
   const body=await lookup.json().catch(()=>({}));
   if(!lookup.ok){err.textContent=body.error||'Student not found.';return}
   email=body.email||identifier;
 }catch(e){err.textContent='Login service is temporarily unavailable. Please try again.';return}
 const {data,error}=await bhumiDb.auth.signInWithPassword({email,password});
 if(error){err.textContent=error.message;return}
 const reg=await getRegistration(data.user.id);
 if(!reg){await bhumiDb.auth.signOut();err.textContent='No student registration request was found for this account.';return}
 if(reg.status!=='approved'){
   await bhumiDb.auth.signOut();
   err.textContent=reg.status==='rejected'?'Your registration was rejected. Please contact the college office.':reg.status==='banned'?'Your student account has been banned. Please contact the college office.':'Your registration is still pending admin approval.';
   return;
 }
 $('studentLogin').classList.add('hidden');$('studentRegistration').classList.add('hidden');$('studentDashboard').classList.remove('hidden');
 $('studentName').textContent=reg.full_name||data.user.user_metadata?.full_name||email.split('@')[0]||'Student';loadStudentProfile(data.user,reg);refresh();
}
async function register(){
 const msg=$('registrationMsg'),err=$('registrationError');msg.textContent='';err.textContent='';
 const full_name=$('regName').value.trim(),email=$('regEmail').value.trim(),mobile=$('regMobile').value.trim(),dob=$('regDob').value,course=$('regCourse').value,roll_number=$('regRoll').value.trim(),password=$('regPassword').value,confirm=$('regConfirmPassword').value;
 if(!full_name||!email||!mobile||!dob||!course||!roll_number||!password||!confirm){err.textContent='Please fill all required fields.';return}
 if(password!==confirm){err.textContent='Passwords do not match.';return}
 if(password.length<6){err.textContent='Password must be at least 6 characters.';return}
 if(!/^\d{10}$/.test(mobile)){err.textContent='Please enter a valid 10-digit mobile number.';return}
 if(!isDbReady()){err.textContent='Supabase is not configured yet.';return}
 const {data,error}=await bhumiDb.auth.signUp({email,password,options:{data:{full_name,role:'student'}}});
 if(error){err.textContent=error.message;return}
 if(!data.user){err.textContent='Unable to create account. Please try again.';return}
 const row={user_id:data.user.id,full_name,email,mobile,dob,course,roll_number,status:'pending'};
 const ins=await bhumiDb.from('student_registration_requests').insert(row);
 if(ins.error){err.textContent=ins.error.message;return}
 if(data.session) await bhumiDb.auth.signOut();
 msg.textContent='Registration submitted successfully. Your account is pending admin approval.';
 $('regPassword').value='';$('regConfirmPassword').value='';
}
$('studentLoginBtn').onclick=login;
$('registerStudentBtn').onclick=register;
$('showRegistration').onclick=()=>{$('studentLogin').classList.add('hidden');$('studentRegistration').classList.remove('hidden');$('registrationMsg').textContent='';$('registrationError').textContent='';};
$('backToLogin').onclick=()=>{$('studentRegistration').classList.add('hidden');$('studentLogin').classList.remove('hidden');};
$('studentPhotoInput').onchange=uploadStudentPhoto; $('removeStudentPhoto').onclick=removeStudentPhoto; $('downloadStudentId').onclick=downloadStudentId;
function showStudentView(view){
  document.querySelectorAll('.student-view').forEach(v=>v.classList.remove('active-view'));
  const target=document.querySelector('.student-view-'+view);
  if(target) target.classList.add('active-view');
  document.querySelectorAll('[data-student-view]').forEach(a=>a.classList.toggle('active',a.dataset.studentView===view));
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('[data-student-view]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showStudentView(a.dataset.studentView);}));

async function performStudentLogout(){
  const btn=$('studentLogout');
  if(btn){btn.disabled=true;btn.textContent='Logging out...';}
  try{
    if(isDbReady()) await bhumiDb.auth.signOut({scope:'global'});
  }catch(e){ console.warn('Student logout warning:',e); }
  try{
    localStorage.removeItem('bhumi-student-auth');
    sessionStorage.clear();
  }catch(e){}
  window.location.replace('index.html?logout=1');
}
const studentLogoutBtn=$('studentLogout');
if(studentLogoutBtn){
  studentLogoutBtn.addEventListener('click',performStudentLogout,true);
}

async function restoreStudentSession(){
 if(!isDbReady())return;
 const {data,error}=await bhumiDb.auth.getSession();
 if(error||!data.session)return;
 try{
  const reg=await getRegistration(data.session.user.id);
  if(reg?.status==='approved'){
   $('studentLogin').classList.add('hidden');
   $('studentRegistration').classList.add('hidden');
   $('studentDashboard').classList.remove('hidden');
   $('studentName').textContent=reg.full_name||data.session.user.user_metadata?.full_name||'Student';
   try{await loadStudentProfile(data.session.user,reg)}catch(e){console.warn('Profile load failed:',e)}
   refresh();
   if(location.hash==='#profile')showStudentView('profile');
  }else if(reg && reg.status!=='approved'){
   // Keep the authenticated session intact. Show the login screen without
   // destroying the session so a temporary navigation/RLS issue cannot log out the student.
   $('studentLogin').classList.remove('hidden');
  }
 }catch(e){
  // Do not sign the student out on a transient database/network error.
  console.warn('Student session restore failed:',e);
 }
}
restoreStudentSession();
})();