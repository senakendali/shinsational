<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Pedasnya Shinsational — Home</title>
  <link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
    rel="stylesheet"
    integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB"
    crossorigin="anonymous"
  />
  <link rel="stylesheet" href="{{ asset('css/app.css?v=' . time() . '#') }}">

  <style>
    html,body{margin:0;height:100%}

    /* ===== Start banner: rise-up (fade + naik) ===== */
    .ps-start-banner{
      opacity:0;
      transform:translateY(18px);
      transition:opacity .55s ease, transform .55s ease;
      will-change: transform, opacity;
    }
    .ps-start-banner.is-visible{
      opacity:1;
      transform:none;
    }

    /* Hormati user yang memilih reduce motion */
    @media (prefers-reduced-motion: reduce){
      .ps-loading{ transition:none; }
      .ps-start-banner{ transition:none; transform:none; opacity:1; }
    }
  </style>
</head>
<body>
  <!-- Overlay loading -->
  <div id="psLoading" class="ps-loading" aria-hidden="true">
    <div class="text-center">
      <!-- Ganti loader sesuai kebutuhan; contoh pakai GIF -->
      <img src="/images/loader.gif" alt="Memuat">
    </div>
  </div>

  <div class="ps-root">
    <section class="ps-phone">
      {{-- Layer kedua di depan bg-app.png --}}

      <div class="ps-header w-100">
        <div class="ps-logos d-flex justify-content-between w-100 align-items-center" aria-hidden="true">
          <img class="nongshim" src="/images/nongshim.png" alt="Nongshim">
          <img class="halal" src="/images/halal.png" alt="Halal">
        </div>
        <div class="ps-title">
          <img class="frame-2-title" src="/images/f-2-title.png" alt="Nongshim">
        </div>
      </div>

      <div class="ps-center">
        <div class="ps-start-banner d-flex justify-content-center w-100">
          <img class="img-fluid" src="/images/start-hero.png" alt="Shinsational">
        </div>

        <div>
          <a href="{{ url('registration') }}">
            <img src="/images/next.png" class="ps-next" alt="Shinsational">
          </a>
        </div>
      </div>
    </section>
  </div>

  <script>
    // Sembunyikan overlay saat SEMUA asset selesai load,
    // lalu trigger "rise up" untuk .ps-start-banner
    window.addEventListener('load', function(){
      const overlay = document.getElementById('psLoading');
      const banner  = document.querySelector('.ps-start-banner');

      requestAnimationFrame(() => {
        overlay.classList.add('is-hidden');
        // Sedikit jeda agar transisi overlay & rise-up terasa urut
        setTimeout(() => {
          if (banner) banner.classList.add('is-visible');
        }, 120);
      });
    });
  </script>
</body>
</html>
