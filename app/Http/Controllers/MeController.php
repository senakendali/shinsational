<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\LinkTiktokService;

class MeController extends Controller
{
    public function linkTiktok(Request $request)
    {
        // Ambil open_id dari session/cookie/body (urut prioritas)
        $openId = (string) ($request->session()->get('tiktok_user_id')
                  ?? $request->cookie('tkoid')
                  ?? $request->input('open_id', ''));

        $username = (string) $request->input('tiktok_username', '');
        $username = ltrim($username, '@');

        if ($openId === '' && $username === '') {
            return response()->json(['error' => 'open_id atau tiktok_username wajib diisi'], 422);
        }

        try {
            $migrated = LinkTiktokService::run($openId, $username ?: null);
            return response()->json([
                'message'  => 'Linking OK',
                'migrated' => $migrated, // boleh return counts/ids dari service
                'open_id'  => $openId,
                'username' => $username,
            ]);
        } catch (\Throwable $e) {
            Log::error('me_link_tiktok_failed', ['err'=>$e->getMessage()]);
            return response()->json(['error' => 'Gagal link TikTok'], 500);
        }
    }
}

