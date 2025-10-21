<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>Pedasnya Shinsational — Question {{ $number ?? 3 }}</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700&family=Bebas+Neue&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{{ asset('css/app.css?v=' . time() . '#') }}">

  <style>
    html, body { margin:0; height:100%; }

    /* Loader (optional) */
    .ps-loading{
      position:fixed; inset:0; display:grid; place-items:center;
      background:#fff; z-index:9999; transition:opacity .35s ease, visibility .35s ease;
    }
    .ps-loading.is-hidden{ opacity:0; visibility:hidden; pointer-events:none; }

    /* Section wrapper */
    .ps-phone{
      min-height: 100svh;
      display:flex; flex-direction:column;
    }
    .ps-header{ flex:0 0 auto; }

    /* Area tengah (anchor, tanpa spacer default) */
    .ps-center{
      flex:1 1 auto;
      position:relative;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      gap:min(3vh, 5px);
      text-align:center;
      margin-top:0;
      padding-bottom:0; /* spacer ditambah khusus di mobile saat frame fixed */
    }

    /* ========= Global frame config (samain di semua halaman) ========= */
    :root{
      --frame-h: 720px;   /* <<< tinggi frame global */
      --bg-nudge: 12px;   /* dorong bg ke bawah (atasi PNG transparan di bawah) */
    }

    /* ========= Movie frame (container TIDAK dianimasikan) =========
       - Proporsional 1052/1543
       - Lebar dari tinggi target; cap ke 100vw
       - Background 100% 100% (kontainer = rasio sama, jadi aman)
    */
    .movie-frame{
      position:absolute; left:50%; bottom:0;  /* desktop/tablet */
      transform:translateX(-50%);

      aspect-ratio: 1052 / 1543;
      --w-from-h: calc(var(--frame-h) * (1052 / 1543));
      width: min(100vw, var(--w-from-h));
      height: auto;
      max-width: 100vw;

      background-image:url('/images/question-frame-red.png');
      background-size: 100% 100%;
      background-repeat:no-repeat;
      background-position: center calc(100% + var(--bg-nudge));
      background-color:transparent;

      border-top-left-radius:30px; border-top-right-radius:30px;
      padding:0;   /* jangan padding di container */
      z-index:10;
    }

    /* Isi & animasi (rise-up di inner) */
    .movie-frame__inner{
      padding:20px;
      padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
      opacity:0;
      transform:translateY(18px);
      transition: opacity .55s ease, transform .55s ease;
      will-change: transform, opacity;
    }
    .movie-frame.is-visible .movie-frame__inner{
      opacity:1; transform:none;
    }

    /* ========= Mobile: fixed biar nempel bawah + spacer konten ========= */
    @media (max-width: 600px){
      .movie-frame{
        position:fixed; left:50%; bottom:0; transform:translateX(-50%);
      }
      .ps-center{
        padding-bottom: calc(var(--frame-h) + env(safe-area-inset-bottom, 0px));
      }
    }
    /* iOS garis 1px di bawah */
    @supports (-webkit-touch-callout: none){
      @media (max-width: 600px){
        .movie-frame{ bottom:-1px; }
      }
    }

    @media (prefers-reduced-motion: reduce){
      .ps-loading{ transition:none; }
      .movie-frame__inner{ transition:none; transform:none; opacity:1; }
    }

    .poll-title{
      font-family:"Baloo 2",system-ui,sans-serif; font-weight:700;
      font-size:clamp(18px,2.6vw,28px); text-align:center; margin:0 0 14px; color:#2b2b2b;
    }

    /* Grid opsi */
    .poll-grid{
      display:grid;
      grid-template-columns:1fr;
      gap:16px;
      max-width:520px;
      width:92%;
      margin:0 auto;
    }

    .opt{
      position:relative;
      display:flex; align-items:center; justify-content:center;
      width:100%;
      padding:0; border:0; background:transparent; cursor:pointer;
      border-radius:16px; overflow:hidden;
      transition: transform .15s ease, box-shadow .15s ease;
      outline:none; gap:15px;
    }
    .opt img{
      max-width:85%; height:auto; display:block; margin:0 auto; object-fit:contain;
    }
    .opt:focus-visible{ box-shadow:0 0 0 3px #ffd54a; }

    .yellow-label{
      background:#FFE100; width:200px; height:30px; border-radius:10px;
      display:flex; align-items:center; justify-content:center;
      font-family:'Kanit','Prompt',sans-serif; color:#F91315; font-weight:600;
    }

    @media (max-width:520px){
      .poll-grid{ gap:5px; width:94%; }
      .opt{ border-radius:14px; }
      .opt img{ max-width:90%; }
    }
  </style>
</head>
<body>
  <div id="psLoading" class="ps-loading" aria-hidden="true">
    <div class="text-center">
      <img src="/images/loader.gif" alt="Memuat">
    </div>
  </div>

  <div class="ps-root">
    <section class="ps-phone">
      <div class="ps-header w-100">
        <div class="ps-logos d-flex justify-content-between w-100 align-items-center" aria-hidden="true">
          <img class="nongshim" src="/images/nongshim.png" alt="Nongshim">
          <img class="halal" src="/images/halal.png" alt="Halal">
        </div>
        <div class="ps-title">
          <img class="frame-2-title" src="/images/f-2-title.png" alt="Nongshim" style="margin-top:-25px;">
        </div>
      </div>

      <div class="ps-center">
        <div class="movie-frame">
          <div class="movie-frame__inner">
            <div class="poll-wrap">
              <div class="mt-3 mb-3 text-center">
                <img src="/images/q-{{ $number ?? 3 }}-title.png" alt="Judul Pertanyaan" style="width:min(320px, 80%);">
              </div>

              <input type="hidden" id="qNumber" value="{{ $number ?? 3 }}">
              <input type="hidden" id="nextUrl" value="{{ $nextUrl ?? '' }}">
              <input type="hidden" id="prevUrl" value="{{ $prevUrl ?? '' }}">

              <!-- 2 pilihan, gambar otomatis center -->
              <div class="poll-grid" id="grid">
                <button type="button" class="opt d-flex justify-content-center flex-column" data-value="A" aria-label="A">
                  <img src="/images/q-{{ $number ?? 3 }}-a.png" alt="A" style="width:150px; margin-top:10px;">
                </button>

                <button type="button" class="opt d-flex justify-content-center flex-column" data-value="B" aria-label="B">
                  <img src="/images/q-{{ $number ?? 3 }}-b.png" alt="B" style="width:150px;">
                </button>
              </div>
            </div>

            <div class="d-flex justify-content-start mt-3 mb-1">
              <img src="/images/small-product.png" alt="Shinsational" style="width:140px;">
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <script>
    const QUIZ_KEY = 'ps-quiz-v1';
    function loadAns(){ try{ return JSON.parse(localStorage.getItem(QUIZ_KEY)) || {}; }catch(_){ return {}; } }
    function saveAns(o){ localStorage.setItem(QUIZ_KEY, JSON.stringify(o)); }
    function setAns(q,v){ const a=loadAns(); a[String(q)]=v; saveAns(a); }
    function getAns(q){ return loadAns()[String(q)] || null; }

    (function(){
      const qNum    = parseInt(document.getElementById('qNumber')?.value || '3', 10);
      const nextUrl = document.getElementById('nextUrl')?.value || '';
      const grid    = document.getElementById('grid');
      let navigating = false;

      const prev = getAns(qNum);
      if (prev) {
        const btn = grid.querySelector(`.opt[data-value="${prev}"]`);
        if (btn) btn.classList.add('is-selected');
      }

      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.opt');
        if (!btn || navigating) return;

        const value = btn.dataset.value;
        setAns(qNum, value);

        grid.querySelectorAll('.opt').forEach(el => el.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        navigating = true;
        document.body.style.cursor = 'wait';

        setTimeout(() => {
          document.body.style.cursor = '';
          if (qNum < 5 && nextUrl) {
            location.assign(nextUrl);
          } else if (qNum === 5) {
            location.assign('/result');
          } else {
            navigating = false;
          }
        }, 2000);
      });
    })();

    // Sembunyikan overlay (kalau ada) dan trigger rise-up frame (inner)
    window.addEventListener('load', () => {
      document.getElementById('psLoading')?.classList.add('is-hidden');
      requestAnimationFrame(() => {
        document.querySelector('.movie-frame')?.classList.add('is-visible');
      });
    });
  </script>
</body>
</html>
