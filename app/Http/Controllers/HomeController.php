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

    // Frontend kirim majority &/atau counts. Image opsional (dataURL PNG).
    $data = $request->validate([
        'majority'   => ['nullable','in:A,B,C,D'],     // pemenang langsung dari FE (opsional)
        'counts'     => ['nullable','array'],          // {A: int, B: int, C: int, D: int}
        'counts.A'   => ['nullable','integer','min:0'],
        'counts.B'   => ['nullable','integer','min:0'],
        'counts.C'   => ['nullable','integer','min:0'],
        'counts.D'   => ['nullable','integer','min:0'],
        'image'      => ['nullable','string'],         // data:image/png;base64,...
    ]);

    // Minimal harus ada majority ATAU counts
    if (empty($data['majority']) && empty($data['counts'])) {
        return response()->json([
            'ok' => false,
            'message' => 'Tidak ada data result. Kirim majority (A/B/C/D) atau counts.',
        ], 422);
    }

    // Normalisasi counts (default 0 biar aman)
    $counts = [
        'A' => (int)($data['counts']['A'] ?? 0),
        'B' => (int)($data['counts']['B'] ?? 0),
        'C' => (int)($data['counts']['C'] ?? 0),
        'D' => (int)($data['counts']['D'] ?? 0),
    ];

    // Tentukan winner:
    // - kalau majority ada, pakai itu
    // - kalau tidak, hitung dari counts (tie → pilih urutan A→B→C→D)
    $winner = $data['majority'] ?? (function($c){
        $order = ['A','B','C','D'];
        $max = max($c);
        foreach ($order as $opt) {
            if (($c[$opt] ?? 0) === $max) return $opt;
        }
        return 'A';
    })($counts);

    // Simpan image (opsional)
    $imagePath = null;
    if (!empty($data['image']) && preg_match('/^data:image\/png;base64,/', $data['image'])) {
        // Batas ukuran ~2.5MB (opsional)
        $raw = substr($data['image'], strpos($data['image'], ',') + 1);
        if (strlen($raw) > 3_300_000) { // ~2.5MB base64
            return response()->json(['ok'=>false,'message'=>'Gambar terlalu besar (maks 2.5MB).'], 413);
        }
        $binary = base64_decode($raw, true);
        if ($binary === false) {
            return response()->json(['ok'=>false,'message'=>'Format gambar tidak valid.'], 422);
        }
        $filename = 'results/'.$regId.'-'.now()->format('Ymd_His').'.png';
        Storage::disk('public')->put($filename, $binary);
        $imagePath = 'storage/'.$filename; // akses via public/storage
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



}
