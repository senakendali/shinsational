import { renderHeaderKol } from "../../components/headerKol.js";
import { renderFooterKol } from "../../components/footerKol.js";

export function render(target, params, query = {}, labelOverride = null) {
    renderHeaderKol("header");

    target.innerHTML = `
        
    

       
        <section class="page-section min-vh-100 d-flex align-items-center bg-white">
            <div class="container pt-5">
                <h2 class="text-center text-uppercase">Kebijakan Privasi</h2>

                <div class="mb-4">
                <strong>1. Pengantar</strong>
                <p>
                    Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan,
                    dan melindungi informasi yang diperoleh dari pengguna saat mengakses dan
                    menggunakan website ini. Dengan menggunakan layanan kami, Anda dianggap telah
                    menyetujui Kebijakan Privasi ini.
                </p>
                </div>

                <div class="mb-4">
                <strong>2. Informasi yang Dikumpulkan</strong>
                <p>
                    Kami dapat mengumpulkan informasi yang diberikan secara langsung oleh pengguna,
                    serta data yang diperoleh melalui integrasi dengan TikTok, termasuk namun tidak
                    terbatas pada:
                </p>
                <ul>
                    <li>Data akun TikTok (OpenID, nama tampilan, avatar) setelah otorisasi.</li>
                    <li>Data performa konten seperti jumlah tayangan (views), suka (likes),
                        komentar (comments), dan interaksi lain yang tersedia melalui API resmi TikTok.</li>
                    <li>Informasi lain yang Anda berikan saat pendaftaran atau penggunaan layanan.</li>
                </ul>
                </div>

                <div class="mb-4">
                <strong>3. Penggunaan Informasi</strong>
                <p>
                    Informasi yang dikumpulkan digunakan untuk:
                </p>
                <ul>
                    <li>Menampilkan laporan performa kampanye.</li>
                    <li>Memberikan layanan pelacakan konten sesuai dengan kebutuhan pengguna.</li>
                    <li>Meningkatkan kualitas dan keamanan layanan.</li>
                </ul>
                </div>

                <div class="mb-4">
                <strong>4. Penyimpanan & Keamanan Data</strong>
                <p>
                    Kami berkomitmen untuk menjaga keamanan data Anda. Informasi pribadi hanya
                    disimpan selama diperlukan untuk tujuan layanan. Kami menggunakan langkah-langkah
                    teknis dan organisasi yang sesuai untuk melindungi data dari akses tidak sah,
                    penggunaan yang salah, atau pengungkapan.
                </p>
                </div>

                <div class="mb-4">
                <strong>5. Berbagi Informasi</strong>
                <p>
                    Kami tidak menjual atau membagikan data pribadi pengguna kepada pihak ketiga
                    untuk kepentingan komersial. Data hanya dapat dibagikan jika diwajibkan oleh
                    hukum atau untuk memenuhi permintaan resmi dari otoritas berwenang.
                </p>
                </div>

                <div class="mb-4">
                <strong>6. Hak Pengguna</strong>
                <p>
                    Pengguna memiliki hak untuk:
                </p>
                <ul>
                    <li>Mengakses dan meninjau data pribadi yang telah diberikan.</li>
                    <li>Meminta perbaikan data yang tidak akurat.</li>
                    <li>Mencabut izin akses TikTok kapan saja melalui pengaturan akun TikTok.</li>
                </ul>
                </div>

                <div class="mb-4">
                <strong>7. Perubahan Kebijakan</strong>
                <p>
                    Kebijakan Privasi ini dapat diperbarui sewaktu-waktu untuk menyesuaikan dengan
                    perkembangan layanan atau regulasi yang berlaku. Perubahan akan diumumkan melalui
                    halaman ini.
                </p>
                </div>

                <div class="mb-4">
                <strong>8. Hubungi Kami</strong>
                <p>
                    Jika ada pertanyaan mengenai Kebijakan Privasi ini, silakan hubungi kami melalui
                    email: <a href="mailto:support@yourcompany.com">support@yourcompany.com</a>.
                </p>
                </div>
            </div>
            </section>


    `;

   renderFooterKol();
}
