export function render(target, params, query = {}, labelOverride = null) {
  const v = window.BUILD_VERSION || Date.now();

  target.innerHTML = `
  <div class="ps-canvas">
    <section class="ps-phone ps-mobile-only">
      <!-- ORNAMENT LAYER (in front of bg-app.png, behind content) -->
      <div class="ps-ornament" aria-hidden="true" style="background-image:url('/images/home-ornament.png?v=${v}')"></div>

      <div class="ps-header">
        <div class="ps-screen ps-splash" data-screen="splash">
          <img src="/images/n-logo.png?v=${v}" alt="Pedasnya Shinsational" />
        </div>
      </div>

      <!-- START -->
      <div class="ps-screen ps-hero" data-screen="start">
        <div class="ps-hero__content">
          <h1 class="ps-title">Pedasnya <span>Shinsational</span></h1>
          <p class="ps-subtitle">Jawab beberapa pertanyaan ringan. Di akhir, kami rekomendasikan jenis mi yang cocok buat kamu.</p>
          <button id="psStartBtn" class="ps-btn ps-btn--primary">Mulai Tes</button>
        </div>
      </div>

      <!-- QUIZ (SKELETON) -->
      <div class="ps-screen ps-quiz is-hidden" data-screen="quiz">
        <div class="ps-topbar">
          <div class="ps-topbar__label">Pertanyaan <span id="psStepNow">1</span>/<span id="psStepTotal">6</span></div>
          <div class="ps-progress"><div class="ps-progress__fill" style="width:16%"></div></div>
        </div>

        <div class="ps-card ps-card--q">
          <div class="ps-qtext">
            <div class="ps-skel ps-skel--line w-80"></div>
            <div class="ps-skel ps-skel--line w-60 mt-2"></div>
          </div>

          <div class="ps-options">
            <button class="ps-option"><div class="ps-skel ps-skel--line w-70"></div></button>
            <button class="ps-option"><div class="ps-skel ps-skel--line w-55"></div></button>
            <button class="ps-option"><div class="ps-skel ps-skel--line w-65"></div></button>
          </div>
        </div>

        <div class="ps-actions">
          <button class="ps-btn ps-btn--ghost" id="psBackBtn" disabled>Kembali</button>
          <button class="ps-btn ps-btn--primary" id="psNextBtn">Lanjut</button>
        </div>
      </div>

      <!-- RESULT (SKELETON) -->
      <div class="ps-screen ps-result is-hidden" data-screen="result">
        <div class="ps-card ps-card--result">
          <div class="ps-badge">Hasil Kamu</div>
          <div class="ps-result__hero"><div class="ps-skel ps-skel--avatar"></div></div>
          <h2 class="ps-result__title"><span class="ps-skel ps-skel--line w-70"></span></h2>
          <p class="ps-result__desc">
            <span class="ps-skel ps-skel--line w-100"></span>
            <span class="ps-skel ps-skel--line w-90 mt-2"></span>
            <span class="ps-skel ps-skel--line w-60 mt-2"></span>
          </p>
          <div class="ps-result__metrics">
            <div class="ps-chip"><span class="ps-skel ps-skel--line w-40"></span></div>
            <div class="ps-chip"><span class="ps-skel ps-skel--line w-50"></span></div>
            <div class="ps-chip"><span class="ps-skel ps-skel--line w-35"></span></div>
            <div class="ps-chip"><span class="ps-skel ps-skel--line w-45"></span></div>
          </div>
        </div>

        <div class="ps-actions">
          <button class="ps-btn ps-btn--primary" id="psShareBtn">Bagikan</button>
          <button class="ps-btn ps-btn--ghost" id="psRetryBtn">Coba Lagi</button>
        </div>
      </div>
    </section>
  </div>
  `;

  // toggle sederhana (preview)
  const $start  = target.querySelector('.ps-hero');
  const $quiz   = target.querySelector('.ps-quiz');
  const $result = target.querySelector('.ps-result');
  const hide = el => el.classList.add('is-hidden');
  const show = el => el.classList.remove('is-hidden');

  target.querySelector('#psStartBtn')?.addEventListener('click', () => {
    hide($start); hide($result); show($quiz);
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  target.querySelector('#psNextBtn')?.addEventListener('click', () => {
    hide($start); hide($quiz); show($result);
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  target.querySelector('#psBackBtn')?.addEventListener('click', () => {
    hide($start); hide($result); show($quiz);
  });
  target.querySelector('#psRetryBtn')?.addEventListener('click', () => {
    hide($result); show($quiz);
  });
  target.querySelector('#psShareBtn')?.addEventListener('click', () => {
    alert('Share placeholder');
  });
}
