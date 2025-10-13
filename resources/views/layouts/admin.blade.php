<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>@yield('title', 'Beauty Tech Lab by Group M')</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" />

  <link rel="stylesheet" href="{{ asset('css/app.css?v=' . time()) }}" />
  <link rel="stylesheet" href="{{ asset('css/button.css?v=' . time()) }}" />
  <link rel="stylesheet" href="{{ asset('css/toast.css?v=' . time()) }}" />
  <meta name="csrf-token" content="{{ csrf_token() }}">

  <style>
    /* Default tinggi header (kalau belum kebaca) */
    :root { --header-h: 80px; }

    /* Wrapper header boleh relative aja */
    .app-header { position: relative; z-index: 1050; }

    /* Kalau di dalam #header ada .fixed-top / .navbar, mereka yang nempel di atas */
    /* (Bootstrap-style) */
    #header .fixed-top,
    #header .navbar.fixed-top,
    #header [data-header-bar].fixed-top {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1050;
    }

    /* Yang penting: spasi konten = padding-top body */
    body {
      padding-top: calc(var(--header-h) + env(safe-area-inset-top, 0px));
    }

    /* Biar anchor #id nggak ketutup header saat scroll */
    html { scroll-padding-top: calc(var(--header-h) + 8px); }

    /* Hapus margin-top di main (biar gak dobel) */
    .main { margin-top: 0 !important; }
  </style>
</head>
<body>
  <!-- HEADER (diisi oleh app.js; taruh .navbar.fixed-top di dalam sini) -->
  <div id="header" class="app-header"></div>

  <!-- MAIN CONTENT -->
  <main id="app" class="main container-fluid"></main>

  <!-- FOOTER -->
  <div id="footer"></div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

  <script>
    window.BUILD_VERSION = "{{ now()->timestamp }}";
    window.APP_URL = "{{ url('/') }}"; // <— penting
  </script>
  <script type="module" src="{{ asset('js/app.js?v=' . time()) }}"></script>

  <script>
    (function () {
      const header = document.getElementById('header');
      if (!header) return;

      // Cari elemen bar yang bener-bener nempel di atas (Bootstrap .fixed-top umumnya .navbar)
      const pickBar = () =>
        header.querySelector('.navbar.fixed-top, [data-header-bar].fixed-top, .fixed-top') ||
        header.querySelector('.navbar, [data-header-bar]') ||
        header;

      const measure = () => {
        const bar = pickBar();

        // 1) ukur langsung
        let h = Math.ceil(bar?.getBoundingClientRect().height || 0);

        // 2) fallback: scan anak tertinggi
        if (!h && bar) {
          let maxH = 0;
          bar.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.height > maxH) maxH = r.height;
          });
          h = Math.ceil(maxH);
        }

        // 3) fallback akhir
        if (!h) h = 80;

        document.documentElement.style.setProperty('--header-h', h + 'px');
      };

      // Observers agar reaktif saat SPA render / shrink
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(measure);
        ro.observe(header);
      }
      if (window.MutationObserver) {
        const mo = new MutationObserver(measure);
        mo.observe(header, { childList: true, subtree: true, attributes: true });
      }

      // Triggers awal & retry
      window.addEventListener('load', measure, { passive: true });
      document.fonts?.ready?.then(measure);
      window.addEventListener('resize', measure, { passive: true });
      setTimeout(measure, 120);
      setTimeout(measure, 400);
      setTimeout(measure, 1000);

      // Helper debug (opsional di console)
      window.__debugHeader = () => ({
        var: getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
        headerRect: header.getBoundingClientRect(),
        barRect: (pickBar() || {}).getBoundingClientRect?.()
      });
    })();
  </script>
</body>
</html>
