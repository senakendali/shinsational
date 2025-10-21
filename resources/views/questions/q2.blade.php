<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>Pedasnya Shinsational — Question {{ $number ?? 1 }}</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700&family=Bebas+Neue&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{{ asset('css/app.css?v=' . time() . '#') }}">

  <style>
    html, body { margin:0; height:100%; }

    /* Overlay */
    .ps-loading{
      position:fixed; inset:0; display:grid; place-items:center;
      background:#fff; z-index:9999; transition:opacity .35s ease, visibility .35s ease;
    }
    .ps-loading.is-hidden{ opacity:0; visibility:hidden; pointer-events:none; }

    /* Section */
    .ps-red{
      min-height: 100svh; min-height: 100vh;
      display:flex; flex-direction:column;
    }
    .ps-header{ flex:0 0 auto; }

    /* Area tengah sebagai anchor absolute/fixed */
    .ps-center{
      flex:1 1 auto;
      position:relative;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      gap:min(3vh,5px);
      text-align:center; margin-top:0;
      padding-bottom:0;            /* <— buang padding yg bikin jeda bawah */
    }

    /* ====== Konfigurasi frame ======
       Rasio gambar: 1052x1543 (W x H) → aspect-ratio: 1052/1543
       - --frame-h  : tinggi target (desktop & mobile)
       - --bg-nudge : dorong background turun utk nutup PNG transparan bawah
    */
    :root{
      --frame-h: 720px;            /* UBAH INI untuk set tinggi frame */
      --bg-nudge: 12px;            /* naikin kalau masih terlihat “melayang” */
    }

    /* ====== Movie frame (container) ======
       Container tidak dianimasikan (biar nempel presisi),
       animasi ada di .movie-frame__inner.
    */
    .movie-frame{
      position:absolute; left:50%; bottom:0;       /* desktop/tablet */
      transform:translateX(-50%);                  /* center X saja */

      /* ukuran proporsional dari tinggi target */
      aspect-ratio: 1052 / 1543;
      --w-from-h: calc(var(--frame-h) * (1052 / 1543));
      width: min(100vw, var(--w-from-h));
      height: auto;                                 /* tinggi ikut rasio */
      max-width: 100vw;

      /* background memenuhi kontainer (kontainer sudah rasio sama) */
      background-image:url('/images/question-frame.png');
      background-size: 100% 100%;
      background-repeat:no-repeat;
      /* dorong sedikit kebawah utk nutup ruang transparan PNG */
      background-position: center calc(100% + var(--bg-nudge));
      background-color:transparent;

      border-top-left-radius:30px; border-top-right-radius:30px;
      padding:0;                                     /* jangan padding di container */
      z-index:10;
    }

    /* Konten & animasi */
    .movie-frame__inner{
      padding-top: 20px;
      padding-left: 15px;
      padding-right: 20px;
      padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
      opacity:0;
      transform:translateY(18px);
      transition:opacity .55s ease, transform .55s ease;
      will-change: transform, opacity;
    }
    .movie-frame.is-visible .movie-frame__inner{
      opacity:1; transform:none;
    }

    /* MOBILE: pakai fixed supaya benar2 nempel viewport, tambah spacer konten */
    @media (max-width:600px){
      .movie-frame{
        position:fixed; left:50%; bottom:0; transform:translateX(-50%);
      }
      .ps-center{
        /* spacer agar konten atas tidak ketiban frame */
        padding-bottom: calc(var(--frame-h) + env(safe-area-inset-bottom, 0px));
      }
    }
    /* iOS celah 1px di bawah */
    @supports (-webkit-touch-callout: none){
      @media (max-width:600px){
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

    .poll-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:4px; }

    .opt{
      position:relative; display:block; width:100%; aspect-ratio:1/1;
      padding:0; border:0; background:transparent; cursor:pointer;
      transition: transform .15s ease, box-shadow .15s ease; outline:none;
    }
    .opt img{ width:100%; height:100%; display:block; }

    .opt:hover{ transform:translateY(-2px); }
    .opt:focus-visible{ box-shadow:0 0 0 3px #ffd54a; }
    .opt.is-selected{
      box-shadow:0 0 0 3px #ffd54a, 0 6px 18px rgba(0,0,0,.18);
      transform:translateY(-2px);
    }
    @media (max-width:520px){ .opt{ border-radius:10px; } }
  </style>
</head>
<body>
  <div id="psLoading" class="ps-loading" aria-hidden="true">
    <div class="text-center">
      <img src="/images/loader.gif" alt="Memuat">
    </div>
  </div>

  <div class="ps-root">
    <section class="ps-red">
      <div class="ps-header w-100">
        <div class="ps-logos d-flex justify-content-between w-100 align-items-center" aria-hidden="true">
          <img class="nongshim" src="/images/logo-white.png" alt="Nongshim">
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
              <div class="mt-3 mb-3">
                <img src="/images/q-2-title.png" alt="Nongshim" style="width:200px;">
              </div>

              <input type="hidden" id="qNumber" value="{{ $number ?? 1 }}">
              <input type="hidden" id="nextUrl" value="{{ $nextUrl ?? '' }}">
              <input type="hidden" id="prevUrl" value="{{ $prevUrl ?? '' }}">

              <div class="poll-grid" id="grid">
                <button type="button" class="opt" data-value="A" aria-label="A">
                  <img src="/images/q-{{ $number ?? 1 }}-a.png" alt="A">
                </button>
                <button type="button" class="opt" data-value="B" aria-label="B">
                  <img src="/images/q-{{ $number ?? 1 }}-b.png" alt="B">
                </button>
                <button type="button" class="opt" data-value="C" aria-label="C">
                  <img src="/images/q-{{ $number ?? 1 }}-c.png" alt="C">
                </button>
                <button type="button" class="opt" data-value="D" aria-label="D">
                  <img src="/images/q-{{ $number ?? 1 }}-d.png" alt="D">
                </button>
              </div>
            </div>

            <div class="d-flex justify-content-start mt-3 mb-1">
              <img src="/images/campaign-title.png" alt="Shinsational" style="width:140px;">
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
      const qNum    = parseInt(document.getElementById('qNumber')?.value || '1', 10);
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
        }, 1000);
      });
    })();

    window.addEventListener('load', function(){
      const overlay = document.getElementById('psLoading');
      const frame   = document.querySelector('.movie-frame');

      requestAnimationFrame(() => {
        overlay?.classList.add('is-hidden');
        setTimeout(() => { frame?.classList.add('is-visible'); }, 120);
      });
    });
  </script>
</body>
</html>
