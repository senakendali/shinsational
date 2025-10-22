<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>Pedasnya Shinsational — Result</title>

  <!-- Bootstrap CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous"/>
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700&family=Bebas+Neue&family=Kanit:wght@400;700&display=swap" rel="stylesheet">
  <!-- Bootstrap Icons -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <!-- App CSS (opsional) -->
  <link rel="stylesheet" href="{{ asset('css/app.css?v=' . time() . '#') }}">

  <style>
    html, body { height:100%; margin:0; background:#b30e16; }
    .ps-root{ min-height:100dvh; display:flex; align-items:center; justify-content:center; }

    /* PERSIS area kamera 9:16 */
    .ps-result{
      position:relative;
      height:100dvh;
      width:min(100vw, calc(100dvh * 0.5625));
      margin:0 auto;
      overflow:hidden;
      box-shadow:0 10px 40px rgba(0,0,0,.35);
      background:#000;
    }

    .ps-result video{
      position:absolute; inset:0;
      width:100%; height:100%;
      object-fit:cover;
      transform:scaleX(-1);
      z-index:1;
      background:#000;
    }

    .lens-overlay{
      position:absolute; inset:0; pointer-events:none;
      display:grid; place-items:center; z-index:2;
    }
    .lens-overlay:before{
      content:"";
      width:min(82%, 760px);
      height:min(60%, 1000px);
    }

    .ps-result img.frame{
      position:absolute; inset:0;
      width:100%; height:100%;
      object-fit:cover;
      pointer-events:none;
      z-index:3;
    }

    .ps-result img.result{
      position:absolute; inset:0;
      width:100%; height:100%;
      object-fit:cover;
      display:none;
      z-index:4;
    }

    .ctrls{
      position:absolute;
      top:50%; left:50%;
      transform:translate(-50%,-50%);
      display:flex; gap:10px; justify-content:center; align-items:center;
      flex-wrap:nowrap;
      z-index:5;
    }
    .btn-ps{
      --ps-yellow:#FFE100;
      background:var(--ps-yellow);
      border-color:var(--ps-yellow);
      color:#111;
    }
    .btn-ps:hover, .btn-ps:focus{
      filter:brightness(0.95);
      background:var(--ps-yellow);
      border-color:var(--ps-yellow);
      color:#111;
    }
    .ctrls .btn.btn-sm{
      padding:.35rem .6rem;
      font-size:.9rem;
      border-radius:.5rem;
      font-weight:700;
      white-space:nowrap;
    }
    @media (max-width:380px){
      .ctrls{ flex-wrap:wrap; row-gap:8px; }
    }

    .majority-label{
      position:absolute; top:12px; right:12px; z-index:6;
      background:#FFE100; color:#F91315; padding:6px 12px;
      font-weight:700; font-family:'Kanit', sans-serif;
      display:none;
    }
    .badge-wrap{
      position:absolute; top:12px; left:12px; z-index:6; display:flex; gap:6px; flex-wrap:wrap; display:none;
    }
    .badge-count{
      background:#111; color:#ffd54a; padding:4px 8px;
      font-family:"Bebas Neue",Arial,sans-serif; font-size:16px
    }

    .tools{
      position:absolute;
      z-index:99999;
      bottom:10px;
      left:10%;
      display:flex; align-items:center;
    }

    .err{
      position:absolute; left:50%; transform:translateX(-50%);
      top:14px; z-index:7; width:min(94%, 560px); padding:8px 12px
    }

    /* Badge kecil status simpan */
    .save-badge{
      position:absolute;
      bottom:16px;
      right:16px;
      z-index:7;
      display:none;
      padding:6px 10px;
      border-radius:8px;
      font-weight:700;
      background:#111;
      color:#fff;
    }
    .save-badge.saving{ background:#0d6efd; }   /* biru: proses */
    .save-badge.saved{ background:#198754; }    /* hijau: sukses */
    .save-badge.failed{ background:#dc3545; }   /* merah: gagal */
  </style>
</head>
<body>
  <div class="ps-root">
    <section class="ps-result" id="psResult">
      <!-- Live kamera -->
      <video id="cam" autoplay playsinline muted></video>

      <!-- Overlay bidik (opsional) -->
      <div class="lens-overlay"></div>

      <!-- Frame overlay (selalu di atas video) -->
      <img id="frameFg" class="frame" alt="Frame">

      <!-- Hasil komposit 1080x1920 -->
      <img id="shot" class="result" alt="Hasil">

      <!-- Info kecil (opsional) -->
      <div class="majority-label d-none" id="majority">Memuat…</div>
      <div class="badge-wrap" id="counts"></div>

      <!-- Kontrol -->
      <div class="ctrls">
        <button id="btnCapture" style="background:none; border:none;">
          <img src="images/capture.png" alt="" style="width:100px;">
        </button>

        <button id="btnReset" class="btn btn-sm btn-ps d-none">
          <i class="bi bi-trash"></i> Reset
        </button>
      </div>

      <div class="tools">
        <button id="btnRetake" class="d-none" style="background:none; border:none;">
          <img src="images/retake.png" alt="" style="width:100px;">
        </button>

        <a id="btnDownload" class="d-none" download="pedasnya-shinsational-story.png" role="button">
          <img src="images/download.png" alt="" style="width:100px;">
        </a>
      </div>

      <!-- Status simpan -->
      <div id="saveBadge" class="save-badge">Menyimpan…</div>

      <!-- Error -->
      <div id="errBox" class="alert alert-danger err d-none" role="alert"></div>
    </section>
  </div>

  <script>
    (function(){
      const QUIZ_KEY='ps-quiz-v1';

      // Elemen utama
      const cam        = document.getElementById('cam');
      const shot       = document.getElementById('shot');
      const frameFg    = document.getElementById('frameFg');

      const btnCapture = document.getElementById('btnCapture');
      const btnRetake  = document.getElementById('btnRetake');
      const btnReset   = document.getElementById('btnReset');
      const btnDownload= document.getElementById('btnDownload');
      const errBox     = document.getElementById('errBox');

      const majorityEl = document.getElementById('majority');
      const countsEl   = document.getElementById('counts');
      const saveBadge  = document.getElementById('saveBadge');

      let mediaStream=null;
      let frameURL='/images/frame-og.png';
      let compositeURL='';
      let isSaving=false;

      // ===== Majority dari localStorage -> pilih frame =====
      function loadAns(){ try{ return JSON.parse(localStorage.getItem(QUIZ_KEY)) || {}; }catch(_){ return {}; } }
      function summarize(obj){
        const counts={};
        Object.keys(obj).forEach(k=>{ const v=obj[k]; if(!v) return; counts[v]=(counts[v]||0)+1; });
        let max=0, modes=[];
        for(const [opt,cnt] of Object.entries(counts)){
          if(cnt>max){max=cnt; modes=[opt];}
          else if(cnt===max){modes.push(opt);}
        }
        return {counts,max,modes};
      }
      function frameBy(opt){
        switch(opt){
          case 'A': return '/images/frame-og.png';
          case 'B': return '/images/frame-spicy.png';
          case 'C': return '/images/frame-cozy.png';
          case 'D': return '/images/frame-midnight.png';
          default:  return '/images/frame-og.png';
        }
      }
      function getResultPayload(){
        const data = loadAns(); // {q1:'A', ...}
        const { counts, max, modes } = summarize(data);
        const order = ['A','B','C','D'];
        let winner = order[0];
        if (modes && modes.length) {
          for (const o of order) { if (modes.includes(o)) { winner = o; break; } }
        }
        const safeCounts = {
          A: counts?.A || 0,
          B: counts?.B || 0,
          C: counts?.C || 0,
          D: counts?.D || 0,
        };
        return { majority: winner, counts: safeCounts };
      }
      function applyFrame(){
        const data=loadAns();
        const {counts,max,modes}=summarize(data);

        if(!Object.keys(data).length || max===0 || modes.length===0){
          majorityEl.textContent='Belum ada jawaban';
        }else if(modes.length===1){
          majorityEl.textContent='Terbanyak: '+modes[0];
        }else{
          majorityEl.textContent='Imbang: '+modes.join(' & ');
        }

        countsEl.innerHTML='';
        ['A','B','C','D'].forEach(opt=>{
          const el=document.createElement('span');
          el.className='badge-count';
          el.textContent=`${opt}: ${counts[opt]||0}`;
          countsEl.appendChild(el);
        });

        const winner=(modes && modes.length? modes[0] : 'A');
        frameURL=frameBy(winner);
        frameFg.src=frameURL;
        frameFg.style.display='block';
      }

      // ===== Kamera =====
      async function startCam(){
        try{
          mediaStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' }, audio:false });
          cam.srcObject = mediaStream;
          cam.classList.remove('d-none');

          shot.style.display='none';
          compositeURL='';
          btnCapture.disabled=false;
          btnDownload.classList.add('d-none');
          hideErr();
        }catch(e){
          showErr('Gagal akses kamera. Gunakan HTTPS (kecuali localhost) atau izinkan kamera di browser.');
          btnCapture.disabled=true;
        }
      }
      function stopCam(){
        if(mediaStream){ mediaStream.getTracks().forEach(t=>t.stop()); mediaStream=null; }
      }

      // ===== Utils =====
      function showErr(msg){ errBox.textContent=msg; errBox.classList.remove('d-none'); }
      function hideErr(){ errBox.classList.add('d-none'); }
      function loadImage(src){
        return new Promise((res,rej)=>{
          const img=new Image();
          try {
            const u = new URL(src, window.location.origin);
            if (u.origin !== window.location.origin) img.crossOrigin='anonymous';
          } catch(_){}
          img.onload=()=>res(img);
          img.onerror=()=>rej(new Error('Gagal load frame: '+src));
          img.src=src;
        });
      }
      function setSaveBadge(state, text){
        // state: 'saving' | 'saved' | 'failed' | 'hide'
        saveBadge.classList.remove('saving','saved','failed');
        if(state==='hide'){ saveBadge.style.display='none'; return; }
        saveBadge.textContent = text || (state==='saving' ? 'Menyimpan…' : state==='saved' ? 'Tersimpan' : 'Gagal menyimpan');
        saveBadge.classList.add(state);
        saveBadge.style.display='inline-block';
      }

      // ===== API: kirim result ke server (majority + counts + image opsional) =====
      async function sendResultToServer(imageDataUrl){
        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const { majority, counts } = getResultPayload();

        const res = await fetch('{{ route('api.result') }}', {
          method: 'POST',
          headers: {
            'X-CSRF-TOKEN': token,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            majority,
            counts,
            image: imageDataUrl || null
          })
        });

        const json = await res.json().catch(()=>({ ok:false, message:'Respon tidak valid' }));
        if(!res.ok || !json.ok){
          throw new Error(json.message || 'Gagal simpan result');
        }
        return json; // {ok:true, result, counts, image}
      }

      // ===== Capture: komposit 1080x1920 -> tampilkan + KIRIM KE SERVER =====
      async function capture(){
        const W=1080, H=1920; // IG Story
        const vw=cam.videoWidth, vh=cam.videoHeight;
        if(!vw||!vh){ showErr('Kamera belum siap. Tunggu video muncul, lalu coba lagi.'); return; }

        const canvas=document.createElement('canvas');
        canvas.width=W; canvas.height=H;
        const ctx=canvas.getContext('2d');

        const scale=Math.max(W/vw, H/vh);
        const dw=vw*scale, dh=vh*scale;
        const dx=(W-dw)/2, dy=(H-dh)/2;

        ctx.save();
        ctx.translate(W,0);
        ctx.scale(-1,1);
        ctx.drawImage(cam, dx, dy, dw, dh);
        ctx.restore();

        // frame di atas (kalau gagal tetap lanjut)
        try {
          const frame=await loadImage(frameURL);
          ctx.drawImage(frame, 0, 0, W, H);
        } catch(e) {
          console.warn('[frame] gagal load:', e?.message || e);
        }

        // preview untuk user (server tetap bisa tanpa image kalau mau)
        try{
          compositeURL=canvas.toDataURL('image/png');
          shot.src=compositeURL;
          shot.style.display='block';
          cam.classList.add('d-none');
          frameFg.style.display='none';

          btnRetake.classList.remove('d-none');
          btnDownload.href=compositeURL;
          btnDownload.classList.remove('d-none');
          btnCapture.classList.add('d-none');
        }catch(te){
          console.warn('toDataURL gagal, tapi tetap lanjut kirim majority+counts:', te);
        }

        stopCam();

        // === Kirim ke server (majority + counts + image opsional) ===
        if(isSaving) return;
        isSaving = true;
        setSaveBadge('saving','Menyimpan…');
        try{
          const saved = await sendResultToServer(compositeURL); // kirim image; kalau tak perlu: null
          setSaveBadge('saved','Tersimpan');

          // Tampilkan hasil dari server biar konsisten
          if(saved && saved.result){
            majorityEl.style.display='block';
            majorityEl.textContent = 'Winner (server): ' + saved.result;
          }
        }catch(e){
          console.error(e);
          setSaveBadge('failed', e.message || 'Gagal menyimpan');
          showErr(e.message || 'Gagal menyimpan result. Coba lagi.');
        }finally{
          isSaving = false;
          if(saveBadge.classList.contains('saved')){
            setTimeout(()=>setSaveBadge('hide'), 2500);
          }
        }
      }

      // ===== Events =====
      btnCapture.addEventListener('click', capture);
      btnRetake.addEventListener('click', ()=>{
        shot.style.display='none';
        cam.classList.remove('d-none');
        frameFg.style.display='block';
        btnDownload.classList.add('d-none');
        btnRetake.classList.add('d-none');
        btnCapture.classList.remove('d-none');
        setSaveBadge('hide');
        startCam();
      });
      btnReset.addEventListener('click', ()=>{
        localStorage.removeItem(QUIZ_KEY);
        applyFrame();
      });

      // ===== Init =====
      applyFrame();
      startCam();
      window.addEventListener('pagehide', stopCam);
      window.addEventListener('beforeunload', stopCam);
    })();
  </script>
</body>
</html>
