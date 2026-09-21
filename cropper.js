(function(){
  let state=null;
  const $=id=>document.getElementById(id);
  function ensure(){
    if($('bhumiCropModal')) return;
    document.body.insertAdjacentHTML('beforeend',`
      <div id="bhumiCropModal" class="bhumi-crop-modal" aria-hidden="true">
        <div class="bhumi-crop-card" role="dialog" aria-modal="true" aria-labelledby="bhumiCropTitle">
          <div class="bhumi-crop-head"><div><h3 id="bhumiCropTitle">Crop Photo</h3><p>Drag the photo, zoom and crop the important area.</p></div><button type="button" id="bhumiCropClose" class="bhumi-crop-close">×</button></div>
          <div class="bhumi-crop-stage"><canvas id="bhumiCropCanvas"></canvas><div id="bhumiCropFrame" class="bhumi-crop-frame"></div></div>
          <div class="bhumi-crop-controls"><label>Zoom <input id="bhumiCropZoom" type="range" min="1" max="3" step=".01" value="1"></label><button type="button" id="bhumiCropReset" class="outline-btn">Reset</button></div>
          <div class="bhumi-crop-actions"><button type="button" id="bhumiCropCancel" class="outline-btn">Cancel</button><button type="button" id="bhumiCropUse" class="primary-btn">✂️ Crop & Use Photo</button></div>
        </div>
      </div>`);
    $('bhumiCropClose').onclick=cancel;$('bhumiCropCancel').onclick=cancel;$('bhumiCropReset').onclick=reset;
    $('bhumiCropUse').onclick=use;
    const c=$('bhumiCropCanvas');
    c.addEventListener('pointerdown',e=>{if(!state)return;c.setPointerCapture(e.pointerId);state.drag={x:e.clientX,y:e.clientY,ox:state.x,oy:state.y}});
    c.addEventListener('pointermove',e=>{if(!state?.drag)return;state.x=state.drag.ox+(e.clientX-state.drag.x);state.y=state.drag.oy+(e.clientY-state.drag.y);draw()});
    c.addEventListener('pointerup',()=>{if(state)state.drag=null});
    c.addEventListener('pointercancel',()=>{if(state)state.drag=null});
    c.addEventListener('wheel',e=>{if(!state)return;e.preventDefault();const z=state.zoom*(e.deltaY<0?1.08:.925);state.zoom=Math.max(1,Math.min(3,z));$('bhumiCropZoom').value=state.zoom;draw()},{passive:false});
    $('bhumiCropZoom').oninput=e=>{if(state){state.zoom=Number(e.target.value);draw()}};
  }
  function open(file,opts={}){
    if(!file)return Promise.resolve(null);
    ensure();
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.reject(new Error('Please select JPG, PNG or WEBP image.'));
    return new Promise((resolve,reject)=>{
      const img=new Image(), url=URL.createObjectURL(file), ratio=Number(opts.aspectRatio)||1;
      img.onload=()=>{
        URL.revokeObjectURL(url);
        const modal=$('bhumiCropModal'),stage=modal.querySelector('.bhumi-crop-stage');
        const maxW=Math.min(window.innerWidth*.9,760), maxH=Math.min(window.innerHeight*.62,520);
        let w=maxW,h=w/ratio;if(h>maxH){h=maxH;w=h*ratio}
        stage.style.setProperty('--crop-ratio',ratio);
        $('bhumiCropCanvas').width=Math.round(w);$('bhumiCropCanvas').height=Math.round(h);
        state={file,img,ratio,w,h,zoom:1,x:0,y:0,resolve,reject,drag:null};
        $('bhumiCropZoom').value=1;modal.classList.add('open');modal.setAttribute('aria-hidden','false');draw();
      };
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Unable to read this image.'))};
      img.src=url;
    });
  }
  function reset(){if(!state)return;state.zoom=1;state.x=0;state.y=0;$('bhumiCropZoom').value=1;draw()}
  function draw(){
    const s=state,c=$('bhumiCropCanvas'),ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);
    const scale=Math.max(c.width/s.img.width,c.height/s.img.height)*s.zoom;
    const dw=s.img.width*scale,dh=s.img.height*scale;
    const x=(c.width-dw)/2+s.x,y=(c.height-dh)/2+s.y;
    ctx.drawImage(s.img,x,y,dw,dh);
  }
  function cancel(){if(!state)return;const r=state.resolve;state=null;$('bhumiCropModal').classList.remove('open');$('bhumiCropModal').setAttribute('aria-hidden','true');r(null)}
  async function use(){
    if(!state)return;const s=state,c=$('bhumiCropCanvas'),ctx=c.getContext('2d');
    const scale=Math.max(c.width/s.img.width,c.height/s.img.height)*s.zoom;
    const sx=Math.max(0,Math.min(s.img.width,(0-((c.width-s.img.width*scale)/2+s.x))/scale));
    const sy=Math.max(0,Math.min(s.img.height,(0-((c.height-s.img.height*scale)/2+s.y))/scale));
    const sw=Math.min(s.img.width-sx,c.width/scale),sh=Math.min(s.img.height-sy,c.height/scale);
    const outW=Math.min(1600,Math.max(600,Math.round(c.width))),outH=Math.round(outW/s.ratio);
    const out=document.createElement('canvas');out.width=outW;out.height=outH;
    out.getContext('2d').drawImage(s.img,sx,sy,sw,sh,0,0,outW,outH);
    const blob=await new Promise(res=>out.toBlob(res,'image/jpeg',.88));
    const file=new File([blob],(s.file.name.replace(/\.[^.]+$/,'')||'photo')+'-cropped.jpg',{type:'image/jpeg'});
    const r=s.resolve;state=null;$('bhumiCropModal').classList.remove('open');$('bhumiCropModal').setAttribute('aria-hidden','true');r(file);
  }
  window.BhumiCropper={open};
})();