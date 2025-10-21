<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Request as FacadeReq;
use App\Models\Registration;

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


    public function question(int $number)
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



}
