<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Request as FacadeReq;
use App\Models\Registration;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        return view('home');
    }

    public function start(Request $request)
    {
        return view('start');
    }

    public function register(Request $request)
    {
        return view('register');
    }

    public function submitDataParticipant(Request $request)
    {
        $data = $request->validate([
            'name'   => ['required','string','min:2'],
            'gender' => ['required','in:male,female'],
            'age'    => ['required','string','max:20'],
        ]);

        try {
            $redirect = route('question', ['number' => 1]);

            // insert dan ambil id
            $regId = \DB::table('registrations')->insertGetId([
                'name'       => $data['name'],
                'gender'     => $data['gender'],
                'age'        => $data['age'],
                'source_ip'  => $request->ip(),
                'user_agent' => (string)$request->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // set session buat tracking user ini sepanjang kuis
            $request->session()->put('reg_id', $regId);
            // optional: simpan display data juga kalau mau dipakai di UI
            $request->session()->put('reg_name', $data['name']);
            $request->session()->put('reg_gender', $data['gender']);
            $request->session()->put('reg_age', $data['age']);

            return response()->json([
                'ok'       => true,
                'redirect' => $redirect,
            ]);
        } catch (\Throwable $e) {
            \Log::error('Registration failed', ['e' => $e]);
            return response()->json([
                'ok'      => false,
                'message' => 'Registrasi gagal. Coba lagi ya.',
            ], 500);
        }
    }


    public function submitDataParticipant__(Request $request)
    {
        $data = $request->validate([
            'name'   => ['required','string','min:2'],
            'gender' => ['required','in:male,female'],
            'age'    => ['required','string','max:20'],
        ]);

        try {
            $redirect = route('question', ['number' => 1]); 

            // simpan data
            \DB::table('registrations')->insert([
                'name'       => $data['name'],
                'gender'     => $data['gender'],
                'age'        => $data['age'],
                'source_ip'  => $request->ip(),
                'user_agent' => (string)$request->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'ok'       => true,
                'redirect' => $redirect,
            ]);
        } catch (\Throwable $e) {
            \Log::error('Registration failed', ['e' => $e]);
            return response()->json([
                'ok'      => false,
                'message' => 'Registrasi gagal. Coba lagi ya.',
            ], 500);
        }
    }

    public function question(int $number, Request $request)
    {
        if ($number < 1 || $number > 5) {
            abort(404);
        }

        // butuh reg_id di session
        if (! $request->session()->has('reg_id')) {
            return redirect()->route('registration')->with('warn', 'Silakan isi data dulu ya.');
        }

        $view = "questions.q{$number}";
        if (! view()->exists($view)) {
            abort(404, "Question view not found: {$view}");
        }

        $next = $number < 5 ? route('question', ['number' => $number + 1]) : null;
        $prev = $number > 1 ? route('question', ['number' => $number - 1]) : null;

        return view($view, [
            'number'  => $number,
            'nextUrl' => $next,
            'prevUrl' => $prev,
        ]);
    }



    public function question__(int $number)
    {
        // Guard: pastikan 1..5 (kalau rute sudah batasi, ini ekstra aman)
        if ($number < 1 || $number > 5) {
            abort(404);
        }

        // Nama view dinamis: resources/views/questions/q1.blade.php, q2.blade.php, dst.
        $view = "questions.q{$number}";

        // Kalau file view belum ada, kasih 404 biar jelas
        if (! view()->exists($view)) {
            abort(404, "Question view not found: {$view}");
        }

        // (Opsional) URL next/prev biar enak di tombol navigasi
        $next = $number < 5 ? route('question', ['number' => $number + 1]) : null;
        $prev = $number > 1 ? route('question', ['number' => $number - 1]) : null;

        return view($view, [
            'number' => $number,
            'nextUrl' => $next,
            'prevUrl' => $prev,
        ]);
    }
    public function result()
    {
        return view('questions.result'); // atau sesuaikan path view-nya
    }

    public function storeResult(Request $request)
    {
        $regId = $request->session()->get('reg_id');
        if (! $regId) {
            return response()->json(['ok'=>false,'message'=>'Session habis. Registrasi dulu ya.'], 419);
        }

        // Frontend kirim majority &/atau counts. Image opsional (dataURL PNG/JPEG).
        $data = $request->validate([
            'majority'   => ['nullable','in:A,B,C,D'],
            'counts'     => ['nullable','array'],
            'counts.A'   => ['nullable','integer','min:0'],
            'counts.B'   => ['nullable','integer','min:0'],
            'counts.C'   => ['nullable','integer','min:0'],
            'counts.D'   => ['nullable','integer','min:0'],
            'image'      => ['nullable','string'], // data:image/png;base64,... | data:image/jpeg;base64,...
        ]);

        if (empty($data['majority']) && empty($data['counts'])) {
            return response()->json([
                'ok' => false,
                'message' => 'Tidak ada data result. Kirim majority (A/B/C/D) atau counts.',
            ], 422);
        }

        $counts = [
            'A' => (int)($data['counts']['A'] ?? 0),
            'B' => (int)($data['counts']['B'] ?? 0),
            'C' => (int)($data['counts']['C'] ?? 0),
            'D' => (int)($data['counts']['D'] ?? 0),
        ];

        $winner = $data['majority'] ?? (function($c){
            $order = ['A','B','C','D'];
            $max = max($c);
            foreach ($order as $opt) if (($c[$opt] ?? 0) === $max) return $opt;
            return 'A';
        })($counts);

        // ====== Simpan image (opsional) — kompres agar <= 2 MB ======
        $imagePath = null;
        if (!empty($data['image']) && preg_match('/^data:image\/(png|jpeg);base64,/', $data['image'], $m)) {
            $binary = base64_decode(substr($data['image'], strpos($data['image'], ',') + 1), true);
            if ($binary === false) {
                return response()->json(['ok'=>false,'message'=>'Format gambar tidak valid.'], 422);
            }

            // Kompres ke <= 2MB (prefer JPEG)
            [$compressedBytes, $ext] = $this->compressImageToUnder2MB($binary, $m[1] ?? 'png');

            if ($compressedBytes === null) {
                return response()->json(['ok'=>false,'message'=>'Gagal memproses gambar.'], 422);
            }

            $filename = 'results/'.$regId.'-'.now()->format('Ymd_His').'.'.$ext; // .jpg
            Storage::disk('public')->put($filename, $compressedBytes);
            $imagePath = 'storage/'.$filename;
        }

        // Langsung masukin ke tabel registrations
        DB::table('registrations')->where('id', $regId)->update([
            'result_option' => $winner,
            'result_counts' => json_encode($counts),
            'result_image'  => $imagePath,   // bisa null kalau gak kirim gambar
            'updated_at'    => now(),
        ]);

        return response()->json([
            'ok'      => true,
            'result'  => $winner,
            'counts'  => $counts,
            'image'   => $imagePath,
            'message' => 'Result tersimpan.',
        ]);
    }

    /**
     * Kompres gambar ke <= 2MB.
     * - Load dari binary (png/jpeg) dengan GD.
     * - (Opsional) resize kalau di atas batas dimensi.
     * - Encode ke JPEG dengan quality step-down sampai <= 2MB.
     *
     * @param string $binary  Raw image bytes
     * @param string $formatHint 'png'|'jpeg'
     * @return array{0:?string,1:?string} [bytes|null, ext|null]
     */
    private function compressImageToUnder2MB(string $binary, string $formatHint = 'png'): array
    {
        // Pastikan GD tersedia
        if (!function_exists('imagecreatefromstring')) {
            return [null, null];
        }

        $img = @imagecreatefromstring($binary);
        if (!$img) {
            return [null, null];
        }

        // Dimensi asli
        $origW = imagesx($img);
        $origH = imagesy($img);

        // Batas dimensi: karena hasil canvas kamu 1080x1920, kita jaga di sini
        $maxW = 1080;
        $maxH = 1920;

        $w = $origW; $h = $origH;
        $scale = min($maxW / $origW, $maxH / $origH, 1); // hanya kecilin (<=1)
        if ($scale < 1) {
            $w = (int)floor($origW * $scale);
            $h = (int)floor($origH * $scale);

            $resampled = imagecreatetruecolor($w, $h);
            // Isi putih sebagai background (biar saat convert dari PNG transparan, background jadi putih)
            $white = imagecolorallocate($resampled, 255, 255, 255);
            imagefill($resampled, 0, 0, $white);

            // Resample
            imagecopyresampled($resampled, $img, 0, 0, 0, 0, $w, $h, $origW, $origH);
            imagedestroy($img);
            $img = $resampled;
        }

        // Encode ke JPEG dan turunkan quality sampai <= 2MB
        $target = 2 * 1024 * 1024; // 2 MB
        $quality = 85;             // start
        $minQuality = 50;          // jangan terlalu ancur

        // Helper untuk capture bytes dari imagejpeg()
        $encode = function($im, $q): string {
            ob_start();
            imagejpeg($im, null, $q);
            return tap(ob_get_clean(), function(){}); // return string bytes
        };

        $bytes = $encode($img, $quality);
        while (strlen($bytes) > $target && $quality > $minQuality) {
            $quality -= 5;
            $bytes = $encode($img, $quality);
        }

        imagedestroy($img);

        // Kalau masih >2MB walau quality 50, terakhir coba kecilin lagi dimensi 20% dan ulang
        if (strlen($bytes) > $target) {
            $tmp = imagecreatefromstring($bytes); // load kembali; kalau gagal ya sudah
            if ($tmp) {
                $w2 = (int)floor(imagesx($tmp) * 0.8);
                $h2 = (int)floor(imagesy($tmp) * 0.8);
                $res2 = imagecreatetruecolor($w2, $h2);
                $white = imagecolorallocate($res2, 255, 255, 255);
                imagefill($res2, 0, 0, $white);
                imagecopyresampled($res2, $tmp, 0, 0, 0, 0, $w2, $h2, imagesx($tmp), imagesy($tmp));
                imagedestroy($tmp);

                // reset quality ke 85 untuk percobaan kedua
                $quality = 85;
                $bytes = $encode($res2, $quality);
                while (strlen($bytes) > $target && $quality > $minQuality) {
                    $quality -= 5;
                    $bytes = $encode($res2, $quality);
                }
                imagedestroy($res2);
            }
        }

        if (strlen($bytes) > $target) {
            // masih kebesaran, gagal
            return [null, null];
        }

        return [$bytes, 'jpg'];
    }



}
