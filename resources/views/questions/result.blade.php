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
      height:100dvh;                                      /* full tinggi layar */
      width:min(100vw, calc(100dvh * 0.5625));            /* 9:16 box di tengah */
      margin:0 auto;
      overflow:hidden;
      box-shadow:0 10px 40px rgba(0,0,0,.35);
      background:#000;                                    /* frame dipasang sebagai <img.frame> */
    }

    /* Layering:
       1) video (kamera)     z=1
       2) overlay bidik      z=2
       3) frame overlay      z=3
       4) hasil komposit     z=4
       5) tombol & label     z=5+
    */
    .ps-result video{
      position:absolute; inset:0;
      width:100%; height:100%;
      object-fit:cover;           /* full area tanpa letterbox */
      transform:scaleX(-1);       /* mirror front camera */
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

    /* Tombol di TENGAH VERTIKAL, sejajar, kecil, warna #FFE100 */
    .ctrls{
      position:absolute;
      top:50%; left:50%;
      transform:translate(-50%,-50%);
      display:flex; gap:10px; justify-content:center; align-items:center;
      flex-wrap:nowrap;         /* sejajar satu baris */
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

    /* Label kecil (opsional) */
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
        z-index: 99999;
        bottom:10px;
        left:10%;
    }

    .err{
      position:absolute; left:50%; transform:translateX(-50%);
      top:14px; z-index:7; width:min(94%, 560px); padding:8px 12px
    }
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
      <div class="majority-label" id="majority">Memuat…</div>
      <div class="badge-wrap" id="counts"></div>

      <!-- Kontrol: tengah vertikal, sejajar, kecil, #FFE100, pakai Bootstrap Icons -->
      <div class="ctrls">
        <button id="btnCapture" style="background:none; border:none; ">
          <img src="images/capture.png" alt="" style="width:100px;">
        </button>
        
        <button id="btnReset" class="btn btn-sm btn-ps d-none">
          <i class="bi bi-trash"></i> Reset
        </button>

        <!-- Download: disembunyikan sampai selesai capture -->
        
      </div>


      <div class="tools">
            <button id="btnRetake" class="d-none" style="background:none; border:none; ">
                <img src="images/retake.png" alt="" style="width:100px;">
                </button>

            <a id="btnDownload" class="d-none" download="pedasnya-shinsational-story.png" role="button">
                <img src="images/download.png" alt="" style="width:100px;">
                </a>
      </div>
      

      <!-- Error -->
      <div id="errBox" class="alert alert-danger err d-none" role="alert"></div>
    </section>
  </div>

  <script>
    (function(){
      const QUIZ_KEY='ps-quiz-v1';

      // Elemen utama
      const cam   = document.getElementById('cam');
      const shot  = document.getElementById('shot');
      const frameFg = document.getElementById('frameFg');

      const btnCapture = document.getElementById('btnCapture');
      const btnRetake  = document.getElementById('btnRetake');
      const btnReset   = document.getElementById('btnReset');
      const btnDownload= document.getElementById('btnDownload');
      const errBox     = document.getElementById('errBox');

      const majorityEl = document.getElementById('majority');
      const countsEl   = document.getElementById('counts');

      let mediaStream=null;
      let frameURL='/images/frame-og.png';
      let compositeURL='';

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
        // file 1080x1920
        switch(opt){
          case 'A': return '/images/frame-og.png';
          case 'B': return '/images/frame-spicy.png';
          case 'C': return '/images/frame-cozy.png';
          case 'D': return '/images/frame-midnight.png';
          default:  return '/images/frame-og.png';
        }
      }
      function applyFrame(){
        const data=loadAns();
        const {counts,max,modes}=summarize(data);

        // label majority (opsional)
        if(!Object.keys(data).length || max===0 || modes.length===0){
          majorityEl.textContent='Belum ada jawaban';
        }else if(modes.length===1){
          majorityEl.textContent='Terbanyak: '+modes[0];
        }else{
          majorityEl.textContent='Imbang: '+modes.join(' & ');
        }

        // badge mini (opsional)
        countsEl.innerHTML='';
        ['A','B','C','D'].forEach(opt=>{
          const el=document.createElement('span');
          el.className='badge-count';
          el.textContent=`${opt}: ${counts[opt]||0}`;
          countsEl.appendChild(el);
        });

        // pilih frame
        const winner=modes[0]||'A';
        frameURL=frameBy(winner);
        frameFg.src=frameURL;                // frame overlay tetap di atas kamera
        frameFg.style.display='block';
      }

      // ===== Kamera =====
      async function startCam(){
        try{
          mediaStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' }, audio:false });
          cam.srcObject = mediaStream;
          cam.classList.remove('d-none');

          // state tombol
          shot.style.display='none';
          compositeURL='';
          btnCapture.disabled=false;
          //btnRetake.disabled=true;
          btnDownload.classList.add('d-none');   // download disembunyiin
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
          const img=new Image(); img.crossOrigin='anonymous';
          img.onload=()=>res(img); img.onerror=rej; img.src=src;
        });
      }

      // ===== Capture: komposit 1080x1920 -> tampilkan =====
      async function capture(){
        const W=1080, H=1920; // IG Story
        const vw=cam.videoWidth, vh=cam.videoHeight;
        if(!vw||!vh){ showErr('Kamera belum siap. Tunggu video muncul, lalu coba lagi.'); return; }

        const canvas=document.createElement('canvas');
        canvas.width=W; canvas.height=H;
        const ctx=canvas.getContext('2d');

        // cover fit + mirror (sesuai preview)
        const scale=Math.max(W/vw, H/vh);
        const dw=vw*scale, dh=vh*scale;
        const dx=(W-dw)/2, dy=(H-dh)/2;

        ctx.save();
        ctx.translate(W,0);
        ctx.scale(-1,1);
        ctx.drawImage(cam, dx, dy, dw, dh);
        ctx.restore();

        // frame di atas
        const frame=await loadImage(frameURL);
        ctx.drawImage(frame, 0, 0, W, H);

        // tampilkan hasil & siap download
        compositeURL=canvas.toDataURL('image/png');
        shot.src=compositeURL;
        shot.style.display='block';

        cam.classList.add('d-none');   // sembunyikan live
        frameFg.style.display='none';  // karena hasil sudah include frame

        btnRetake.classList.remove('d-none');
        btnDownload.href=compositeURL;
        btnDownload.classList.remove('d-none');  // tampilkan 
        btnCapture.classList.add('d-none'); 

        stopCam();
      }

      // ===== Events =====
      btnCapture.addEventListener('click', capture);
      btnRetake.addEventListener('click', ()=>{
        shot.style.display='none';
        cam.classList.remove('d-none');
        frameFg.style.display='block';         // frame overlay muncul lagi
        btnDownload.classList.add('d-none');   // sembunyikan download lagi
        btnRetake.classList.add('d-none');
        btnCapture.classList.remove('d-none'); 
        startCam();
      });
      btnReset.addEventListener('click', ()=>{
        localStorage.removeItem(QUIZ_KEY);
        applyFrame();
      });

      // ===== Init =====
      applyFrame();   // pilih frame dari majority A/B/C/D
      startCam();     // langsung buka kamera
      window.addEventListener('pagehide', stopCam);
      window.addEventListener('beforeunload', stopCam);
    })();
  </script>
</body>
</html>
