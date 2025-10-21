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
    /* Overlay */
    .ps-loading{
      position:fixed; inset:0; display:grid; place-items:center;
      background:#fff; z-index:9999; transition:opacity .35s ease, visibility .35s ease;
    }
    .ps-loading.is-hidden{ opacity:0; visibility:hidden; pointer-events:none; }

    /* Section wrapper */
    .ps-red{
      min-height: 100svh;
      display: flex;
      flex-direction: column;
    }
    .ps-header{ flex: 0 0 auto; }
    .ps-center{
      flex: 1 1 auto;
      min-height: 0;              /* biar fleksibel */
      position: relative;         /* anchor absolute child di bawah */
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;     /* vertical center area */
      gap: min(3vh, 5px);
      text-align:center;
      margin-top: 0;
      padding-bottom: 200px;      /* ruang untuk frame bawah */
    }
    @media (max-width:520px){
      .ps-center{ padding-bottom: 160px; }
    }

    /* ===== Frame bawah (animated + absolute) ===== */
    .movie-frame{
      position:absolute;
      left:50%;
      bottom:0;
      width:100%;
      max-width: 720px;           /* batasi agar nggak terlalu lebar */
      height:auto;
      padding-right:20px;

      /* Background frame */
      background-image:url('/images/question-frame.png');
      background-size:cover;
      background-repeat:no-repeat;
      background-position:center top; /* jangan dobel/konflik */

      background-color:transparent;
      border-top-left-radius:30px;
      border-top-right-radius:30px;

      /* RISE-UP: gabungkan X dan Y */
      opacity:0;
      transform: translate(-50%, 18px);
      transition: opacity .55s ease, transform .55s ease;
      will-change: transform, opacity;
    }
    .movie-frame.is-visible{
      opacity:1;
      transform: translate(-50%, 0);
    }

    /* Hormati reduce motion */
    @media (prefers-reduced-motion: reduce){
      .ps-loading{ transition:none; }
      .movie-frame{ transition:none; transform: translate(-50%, 0); opacity:1; }
    }

    .poll-title{
      font-family:"Baloo 2",system-ui,sans-serif; font-weight:700;
      font-size:clamp(18px,2.6vw,28px); text-align:center; margin:0 0 14px; color:#2b2b2b;
    }

    /* GRID 2x2 */
    .poll-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:4px; }

    /* BUTTON KARTU GAMBAR */
    .opt{
      position:relative; display:block; width:100%; aspect-ratio:1/1; padding:0; border:0; background:transparent;
      cursor:pointer;
      transition: transform .15s ease, box-shadow .15s ease;
      outline: none;
    }
    .opt img{ width:100%; height:100%; display:block;  }

    .opt:hover{ transform: translateY(-2px); }
    .opt:focus-visible{ box-shadow: 0 0 0 3px #ffd54a; }

    .opt.is-selected{
      box-shadow: 0 0 0 3px #ffd54a, 0 6px 18px rgba(0,0,0,.18);
      transform: translateY(-2px);
    }

    @media (max-width:520px){
      .opt{ border-radius:10px; }
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
          <div class="poll-wrap">
            <div class="mt-1 mb-3">
              <img src="/images/q-1-title.png" alt="Nongshim" style="width:200px;">
            </div>

            <!-- info halaman -->
            <input type="hidden" id="qNumber" value="{{ $number ?? 1 }}">
            <input type="hidden" id="nextUrl" value="{{ $nextUrl ?? '' }}">
            <input type="hidden" id="prevUrl" value="{{ $prevUrl ?? '' }}">

            <!-- 2x2 gambar (teks ada di gambar) -->
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
            <img src="/images/campaign-title.png" alt="Shinsational" style="width:120px;">
          </div>
        </div>
      </div>
    </section>
  </div>

  <!-- JS: simpan ke localStorage + auto-next -->
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

      // cegah double-redirect
      let navigating = false;

      // restore selected
      const prev = getAns(qNum);
      if (prev) {
        const btn = grid.querySelector(`.opt[data-value="${prev}"]`);
        if (btn) btn.classList.add('is-selected');
      }

      // klik gambar => simpan -> efek -> delay 2 detik -> pindah
      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.opt');
        if (!btn || navigating) return;

        const value = btn.dataset.value;
        setAns(qNum, value); // simpan ke localStorage

        // efek selected & lock UI
        grid.querySelectorAll('.opt').forEach(el => el.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        navigating = true;

        // (opsional) feedback kursor
        document.body.style.cursor = 'wait';

        setTimeout(() => {
          document.body.style.cursor = '';
          if (qNum < 5 && nextUrl) {
            location.assign(nextUrl);
          } else if (qNum === 5) {
            location.assign('/result'); // ganti jika route hasil beda
          } else {
            navigating = false; // fallback
          }
        }, 1000); // delay 2 detik
      });
    })();

    window.addEventListener('load', function(){
      const overlay = document.getElementById('psLoading');
      const banner  = document.querySelector('.movie-frame');

      requestAnimationFrame(() => {
        overlay?.classList.add('is-hidden');
        // jeda kecil agar overlay fade dulu lalu rise-up
        setTimeout(() => {
          banner?.classList.add('is-visible');
        }, 120);
      });
    });
  </script>

</body>
</html>
