import { renderHeaderKol } from "../../components/headerKol.js";
import { renderFooterKol } from "../../components/footerKol.js";

export function render(target, params, query = {}, labelOverride = null) {
    renderHeaderKol("header");

    target.innerHTML = `
        
    

        <!-- Guidelines Section -->
        <section class="page-section min-vh-100 d-flex align-items-center bg-white">
            <div class="container pt-5">
                <h2 class="text-center text-uppercase">Syarat & Ketentuan</h2>

                <div class="mb-4">
                <strong>1. Penerimaan</strong>
                <p>
                    Dengan menggunakan website ini, Anda dianggap telah membaca, memahami,
                    dan menyetujui seluruh syarat dan ketentuan yang berlaku. Jika Anda tidak
                    menyetujui, mohon untuk tidak menggunakan layanan kami.
                </p>
                </div>

                <div class="mb-4">
                <strong>2. Tujuan Layanan</strong>
                <p>
                    Website ini bertujuan untuk membantu brand, agency, dan kreator dalam
                    memantau performa kampanye di TikTok. Data yang ditampilkan meliputi
                    jumlah tayangan (views), jumlah suka (likes), komentar (comments), serta
                    interaksi lain pada konten yang terhubung.
                </p>
                </div>

                <div class="mb-4">
                <strong>3. Pendaftaran & Akses</strong>
                <p>
                    Pengguna wajib melakukan pendaftaran dan memberikan otorisasi akun
                    TikTok untuk dapat menggunakan fitur pelacakan. Data otorisasi hanya
                    digunakan untuk menampilkan performa konten dan tidak akan disalahgunakan.
                </p>
                </div>

                <div class="mb-4">
                <strong>4. Kewajiban Pengguna</strong>
                <ul>
                    <li>Tidak menggunakan website untuk tujuan yang melanggar hukum.</li>
                    <li>Menjaga kerahasiaan akun masing-masing.</li>
                    <li>Memberikan informasi yang benar dan akurat saat pendaftaran.</li>
                </ul>
                </div>

                <div class="mb-4">
                <strong>5. Pengelolaan Data</strong>
                <p>
                    Data yang dikumpulkan dari TikTok (views, likes, comments, dsb) hanya
                    digunakan untuk keperluan pelaporan performa kampanye. Kami tidak
                    menyimpan atau menampilkan data pribadi selain yang diizinkan oleh
                    pengguna melalui otorisasi resmi TikTok.
                </p>
                </div>

                <div class="mb-4">
                <strong>6. Batasan Tanggung Jawab</strong>
                <p>
                    Kami tidak bertanggung jawab atas keakuratan data yang diberikan oleh
                    pihak ketiga (TikTok). Seluruh data performa konten sepenuhnya berasal
                    dari API resmi TikTok.
                </p>
                </div>

                <div class="mb-4">
                <strong>7. Perubahan Ketentuan</strong>
                <p>
                    Syarat dan ketentuan ini dapat diperbarui sewaktu-waktu. Pengguna
                    disarankan untuk memeriksa halaman ini secara berkala.
                </p>
                </div>

                <div class="mb-4">
                <strong>8. Hubungi Kami</strong>
                <p>
                    Jika ada pertanyaan terkait syarat & ketentuan ini, silakan hubungi kami
                    melalui email: <a href="mailto:support@yourcompany.com">support@yourcompany.com</a>.
                </p>
                </div>
            </div>
        </section>

    `;

   renderFooterKol();
}
