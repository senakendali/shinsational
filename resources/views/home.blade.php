<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Pedasnya Shinsational — Home</title>

  <!-- Bootstrap CSS -->
  <link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
    rel="stylesheet"
    integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB"
    crossorigin="anonymous"
  />

  <!-- App CSS (punyamu) -->
  <link rel="stylesheet" href="{{ asset('css/app.css?v=' . time() . '#') }}">

  <style>
    html,body{margin:0;height:100%}

    

    /* ===== CTA fade-in ===== */
    .ps-cta { 
      opacity: 0; 
      transform: translateY(8px);
      transition: opacity .6s ease, transform .6s ease;
    }
    .ps-cta.is-visible {
      opacity: 1;
      transform: none;
    }
  </style>
</head>
<body>
  <!-- Overlay loading -->
  <div id="psLoading" class="ps-loading" aria-hidden="true">
    <div class="text-center">
      <!-- Bisa ganti dengan logo sendiri kalau mau -->
      
      <img src="/images/loader.gif" alt="">
    </div>
  </div>

  <div class="ps-root">
    <section class="ps-home">
      {{-- Layer kedua di depan bg-app.png --}}
      <div class="ps-ornament" aria-hidden="true"></div>

      <div class="ps-header w-100">
        <div class="ps-logos d-flex justify-content-between w-100 align-items-center" aria-hidden="true">
          <img class="nongshim" src="/images/nongshim.png" alt="Nongshim">
          <img class="halal" src="/images/halal.png" alt="Halal">
        </div>
        <div class="ps-title">
          <img class="ps-app-title" src="/images/app-title.png" alt="Nongshim">
        </div>
      </div>

      {{-- === PUSAT KONTEN: selalu di tengah vertikal === --}}
      <div class="ps-center">
        <div class="ps-campaign-title">
          <img class="ps-app-campaign-title" src="/images/campaign-title.png" alt="Shinsational" style="margin-bottom:20px;">
        </div>

        <div class="ps-cta">
          <img class="ps-cta-caption" src="/images/cta-caption.png" alt="Shinsational">
        </div>

        <div class="ps-start">
          <a href="/start">
            <img class="ps-start-button" src="/images/start-button.png" alt="Shinsational">
          </a>
        </div>
      </div>

      {{-- Badge / mark kanan bawah --}}
      <div class="ps-mark">
        <div class="left d-flex flex-column align-items-start">
          <img class="ps-mark-image" src="/images/socmed.png" alt="Shinsational" style="width:90px;">
          <img class="ps-mark-image" src="/images/nongshim-socmed.png" alt="Shinsational" style="width:120px;">
        </div>
        <div class="right d-flex flex-column align-items-end">
          <img class="ps-mark-image" src="/images/mark.png" alt="Shinsational" style="width:50px;">
          <img src="/images/spicy-text.png" alt="" style="width:120px;">
        </div>
      </div>
    </section>
  </div>

  <script>
    // Sembunyikan overlay setelah SEMUA asset (image, css) loaded
    window.addEventListener('load', function(){
      const overlay = document.getElementById('psLoading');
      // Tampilkan CTA fade-in setelah overlay hilang
      requestAnimationFrame(() => {
        overlay.classList.add('is-hidden');
        // kasih sedikit jeda supaya CTA muncul halus setelah overlay benar2 hilang
        setTimeout(() => {
          const cta = document.querySelector('.ps-cta');
          if (cta) cta.classList.add('is-visible');
        }, 120);
      });
    });
  </script>
</body>
</html>
