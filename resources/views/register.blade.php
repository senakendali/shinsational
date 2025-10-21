<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="csrf-token" content="{{ csrf_token() }}">
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
    .ps-registration{
      opacity:0;
      transform:translateY(18px);
      transition:opacity .55s ease, transform .55s ease;
      will-change: transform, opacity;
    }
    .ps-registration.is-visible{
      opacity:1;
      transform:none;
    }

    

    /* Hormati user yang memilih reduce motion */
    @media (prefers-reduced-motion: reduce){
      .ps-loading{ transition:none; }
      .ps-registration{ transition:none; transform:none; opacity:1; }
    }
  </style>

</head>
<body>
  <div id="psLoading" class="ps-loading" aria-hidden="true">
    <div class="text-center">
      <!-- Ganti loader sesuai kebutuhan; contoh pakai GIF -->
      <img src="/images/loader.gif" alt="Memuat">
    </div>
  </div>
  <div class="ps-root">
    <section class="ps-home">
      

      <div class="ps-header w-100">
        <div class="ps-logos d-flex justify-content-between w-100 align-items-center" aria-hidden="true">
          <img class="nongshim" src="/images/nongshim.png" alt="Nongshim">
          <img class="halal" src="/images/halal.png" alt="Halal">
        </div>
        <div class="ps-title">
          <img class="frame-2-title" src="/images/f-2-title.png" alt="Nongshim" style="margin-top:-25px;">
        </div>
      </div>

      {{-- === PUSAT KONTEN: selalu di tengah vertikal === --}}
      <div class="ps-center">
        <div class="ps-registration">
          <form class="ps-form" id="psRegForm" action="#" method="post" onsubmit="return false;">
            @csrf
            <div class="ps-form-row">
              <div class="ps-field-small">
                <input id="regName" name="name" type="text" placeholder="Nama:" autocomplete="name" required>
              </div>

              <div class="ps-field-small">
                <select id="regGender" name="gender" required>
                  <option value="" selected disabled>Gender:</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>
            </div>

            <!-- Umur dropdown -->
            <div class="ps-field ps-field--full ps-field--outline">
              <select id="regAge" name="age" class="ps-age" required aria-label="Umur">
                <option value="" selected disabled>Umur:</option>
                <option value="18-25">18-25 tahun</option>
                <option value="26-35">26-35 tahun</option>
                <option value="gt-35">&gt; 35 tahun</option>
              </select>
            </div>

            <!-- Button submit -->
            <div class="ps-submit">
              <button type="submit" class="ps-btn-submit" id="psSubmitBtn">Next</button>
            </div>
          </form>

        </div>
      </div>

      {{-- Badge / mark kanan bawah --}}
      <div class="ps-mark">
        <div class="left d-flex flex-column align-items-start">
           <img class="ps-mark-image" src="/images/socmed.png" alt="Shinsational" style="width:90px; ">
           <img class="ps-mark-image" src="/images/nongshim-socmed.png" alt="Shinsational" style="width:120px; ">
        </div>
        <div class="right d-flex flex-column align-items-end">
          <img class="ps-mark-image" src="/images/mark.png" alt="Shinsational" style="width:50px; ">
          <img src="/images/spicy-text.png" alt="" style="width:120px; ">
        </div>
      </div>
    </section>
  </div>

  {{-- Axios (opsional, untuk AJAX). Kalau ga kebaca, script fallback ke fetch --}}
  <script src="https://cdn.jsdelivr.net/npm/axios@1.7.7/dist/axios.min.js"
          integrity="sha384-8qZp7J7sM2Xg7n3gubcQH2qS/ZbTQFgn4C7dFfRVr+q8qE4w5q0v6I6y6uM2dQXg"
          crossorigin="anonymous"></script>

  <script>
  // ======= Config endpoint (ubah sesuai route backend kamu) =======
  const SUBMIT_URL = '/api/registration';

  // Ambil CSRF dari meta
  function getCsrf() {
    const el = document.querySelector('meta[name="csrf-token"]');
    return el ? el.getAttribute('content') : '';
  }

  // Kirim POST JSON pakai axios kalau ada, kalau tidak pakai fetch
  async function postJSON(url, data, headers = {}) {
    if (window.axios) {
      return window.axios.post(url, data, { headers }).then(r => r.data);
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
      credentials: 'same-origin',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'HTTP ' + res.status);
    }
    return res.json();
  }

  // Validasi ringan
  // Validasi untuk form dengan dropdown Gender & Umur
  function validateForm({ name, gender, age }) {
    const errors = {};

    // --- Nama ---
    if (!name || name.trim().length < 2) {
      errors.name = 'Nama minimal 2 karakter.';
    }

    // --- Gender (dropdown) ---
    const GENDER_ALLOWED = new Set(['male', 'female']);
    const genderNorm = String(gender || '').toLowerCase();
    if (!GENDER_ALLOWED.has(genderNorm)) {
      errors.gender = 'Pilih gender.';
    }

    // --- Umur (dropdown) ---
    // Terima value kode maupun label lama, lalu normalisasi ke kode
    const AGE_ALLOWED = new Set(['18-25', '26-35', 'gt-35']);
    const ageCode = normalizeAgeToCode(age);

    if (!ageCode || !AGE_ALLOWED.has(ageCode)) {
      errors.age = 'Pilih umur.';
    }

    return errors;
  }

  /* Helper: normalisasi input "age" ke kode dropdown:
    - '18-25'      -> '18-25'
    - '26-35'      -> '26-35'
    - 'gt-35'      -> 'gt-35'
    - '18–25 tahun' / '18 - 25' -> '18-25'
    - '> 35 tahun' / '>35' / '35+' -> 'gt-35'
  */
  function normalizeAgeToCode(age) {
    if (age == null) return null;
    let v = String(age).trim();

    // Sudah berupa kode?
    if (v === '18-25' || v === '26-35' || v === 'gt-35') return v;

    // Normalisasi label bebas
    v = v.toLowerCase()
        .replace(/–/g, '-')         // en dash -> hyphen
        .replace(/\s*tahun/g, '')   // buang kata "tahun"
        .replace(/\s+/g, ' ')       // rapikan spasi
        .trim();

    if (v === '18-25' || v === '18 - 25') return '18-25';
    if (v === '26-35' || v === '26 - 35') return '26-35';
    if (/^>?\s*35\s*\+?$/.test(v) || v === '> 35' || v === '>35') return 'gt-35';

    return null;
  }


  function setSubmitState(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.dataset._label = btn.textContent;
      btn.textContent = 'Memproses…';
      btn.disabled = true;
    } else {
      if (btn.dataset._label) btn.textContent = btn.dataset._label;
      btn.disabled = false;
    }
  }

  function toast(msg){ alert(msg); } // sederhana; bisa diganti Toast Bootstrap

  (function initReg() {
    const form = document.getElementById('psRegForm');
    if (!form) return;

    const nameEl    = document.getElementById('regName');
    const genderEl  = document.getElementById('regGender');
    const ageEl     = document.getElementById('regAge');
    const submitBtn = document.getElementById('psSubmitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        name:   (nameEl?.value || '').trim(),
        gender: (genderEl?.value || ''),
        age:    (ageEl?.value || '').trim(),
      };

      const errs = validateForm(payload);
      if (Object.keys(errs).length) {
        toast(Object.values(errs)[0]);
        return;
      }

      try {
        setSubmitState(submitBtn, true);
        const csrf = getCsrf();
        const data = await postJSON(SUBMIT_URL, payload, {
          'X-CSRF-TOKEN': csrf,
          'Accept': 'application/json'
        });

        // Expecting: { ok:true, redirect:'/start' } dari backend
        if (data?.redirect) {
          location.assign(data.redirect);
        } else {
          toast('Registrasi berhasil. Mulai tes sekarang!');
          // location.assign('/start');
        }
      } catch (err) {
        console.error(err);
        toast('Gagal mengirim data. Coba lagi.');
      } finally {
        setSubmitState(submitBtn, false);
      }
    });
  })();

   window.addEventListener('load', function(){
      const overlay = document.getElementById('psLoading');
      const banner  = document.querySelector('.ps-registration');

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
