<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class TiktokDebugController extends Controller
{
    /**
     * Hit:
     * GET/POST /api/debug/tiktok/video-stats
     * Params (opsional, semua ada default dari kamu):
     * - open_id
     * - access_token
     * - video_url (atau video_id)
     */
    public function videoStats(Request $request)
    {
        // ====== default dari kamu (bisa di-override lewat request) ======
        $openIdDefault  = '-000RR69zq1jdCCtaaGwy4Nj8MUZv4oqeX7W';
        $tokenDefault   = 'eyJpdiI6InEwSFBiNHg2SnpCVFZaczBLZUkvdUE9PSIsInZhbHVlIjoiMlJiU255Q3dORmJXZ0NYZGU3Sk1odjUvNFk5MzlEcXJwMXRVWGgzeXRLTE9ET0FxSTNUUUZMVy9FZHdHdjI5U1k2cFNSd2E1Z0lGZHgwdk9KbzZhSVJNU1BXSDFVT2dBeVFDbGRuM3NOeWs9IiwibWFjIjoiY2ZhOThmNGY4MDQwYzVhOTBmZmQ4NDNjZmQ5MTU1ZmY4NjA2YTE1YzQxNWZiMDRjMjg2NGI2Y2JlYzY2ZWVhMiIsInRhZyI6IiJ9';
        $videoUrlDefault= 'https://www.tiktok.com/@daengbantangpikki/video/7547923112726220052';

        $openId = (string) $request->input('open_id', $openIdDefault);
        $token  = (string) $request->input('access_token', $tokenDefault);
        $videoId= (string) $request->input('video_id', '');
        $videoUrl = (string) $request->input('video_url', $videoUrlDefault);

        if (!$videoId && $videoUrl) {
            $videoId = $this->extractVideoId($videoUrl);
        }

        if (!$openId || !$token || !$videoId) {
            return response()->json([
                'ok' => false,
                'message' => 'open_id, access_token, dan video_id/video_url wajib diisi.',
                'debug' => compact('openId','token','videoId','videoUrl'),
            ], 422);
        }

        // Coba decrypt token kalau itu hasil encrypt() Laravel
        $accessToken = $token;
        try {
            // Heuristik: token terenkripsi Laravel biasanya JSON terenkripsi berisi iv/value/mac/tag
            if ($this->looksLikeLaravelEncrypted($token)) {
                $accessToken = Crypt::decryptString($token);
            }
        } catch (\Throwable $e) {
            // Jika decrypt gagal, pakai raw token.
        }

        // ====== 1) Coba TikTok Open API v2 ======
        $api = $this->callTiktokOpenApi($openId, $accessToken, $videoId);

        if ($api['ok'] === true) {
            return response()->json([
                'ok' => true,
                'source' => 'open_api',
                'video_id' => $videoId,
                'open_id'  => $openId,
                'stats' => $api['stats'], // ['views','likes','comments','shares','favorites']
                'raw'   => $api['raw'],   // sebagian raw (dipotong) buat debug
            ]);
        }

        // ====== 2) Fallback scrape HTML publik ======
        $fallback = $this->probeFromHtml($videoUrl);
        if ($fallback) {
            return response()->json([
                'ok' => true,
                'source' => 'html_fallback',
                'video_id' => $videoId,
                'open_id'  => $openId,
                'stats' => $fallback, // ['views','likes','comments','shares']
            ]);
        }

        // Gagal semua
        return response()->json([
            'ok' => false,
            'message' => $api['message'] ?? 'Gagal mengambil metrik dari Open API dan HTML.',
            'hint' => 'Pastikan token valid dan scope mencakup video.query / video.list. Juga pastikan video milik open_id terkait.',
            'debug' => [
                'open_api_status' => $api['status'] ?? null,
                'video_id' => $videoId,
                'open_id'  => $openId,
            ]
        ], 502);
    }

    protected function looksLikeLaravelEncrypted(string $token): bool
    {
        // Sangat heuristik: string JSON dengan keys iv/value/mac (dan kadang tag)
        // Token yang kamu kirim memang terlihat seperti ini.
        return Str::contains($token, ['"iv":','"value":','"mac":']);
    }

    protected function extractVideoId(string $url): ?string
    {
        // Contoh: https://www.tiktok.com/@user/video/7548710295141666055
        if (preg_match('#/video/(\d+)#', $url, $m)) {
            return $m[1];
        }
        return null;
    }

    protected function callTiktokOpenApi(string $openId, string $accessToken, string $videoId): array
    {
        try {
            $endpoint = 'https://open.tiktokapis.com/v2/video/query/';

            $payload = [
                'open_id'   => $openId,
                'video_ids' => [$videoId],
                // Minta field statistik dan beberapa field dasar untuk debug
                'fields'    => [
                    'video_id',
                    'share_url',
                    'title',
                    'create_time',
                    'statistics',
                ],
            ];

            $resp = Http::withToken($accessToken)
                ->withHeaders([
                    'Content-Type'  => 'application/json',
                    'Accept'        => 'application/json',
                ])
                ->timeout(20)
                ->post($endpoint, $payload);

            if (!$resp->ok()) {
                return [
                    'ok' => false,
                    'status' => $resp->status(),
                    'message' => 'Open API HTTP error',
                ];
            }

            $json = $resp->json();
            // Struktur umum: { "data": { "videos": [ { "video_id": "...", "statistics": { "play_count":..., "like_count":..., "comment_count":..., "share_count":..., "favorite_count":... } } ] }, "error": {...} }
            $video = $json['data']['videos'][0] ?? null;
            $stats = $video['statistics'] ?? null;

            if (!$stats) {
                return [
                    'ok' => false,
                    'status' => 200,
                    'message' => 'Tidak menemukan statistics di respons Open API',
                    'raw' => $json,
                ];
            }

            return [
                'ok' => true,
                'stats' => [
                    'views'     => (int) ($stats['play_count']     ?? 0),
                    'likes'     => (int) ($stats['like_count']     ?? 0),
                    'comments'  => (int) ($stats['comment_count']  ?? 0),
                    'shares'    => (int) ($stats['share_count']    ?? 0),
                    'favorites' => (int) ($stats['favorite_count'] ?? 0),
                ],
                // kirim raw terbatas untuk debug
                'raw' => [
                    'video_id' => $video['video_id'] ?? null,
                    'title'    => $video['title'] ?? null,
                    'share_url'=> $video['share_url'] ?? null,
                    'create_time' => $video['create_time'] ?? null,
                    'statistics'  => $stats,
                ],
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Fallback scraping HTML publik (tanpa token): ambil playCount/diggCount/commentCount/shareCount
     */
    protected function probeFromHtml(string $videoUrl): ?array
    {
        try {
            $url = $this->normalizeUrl($videoUrl);
            $resp = Http::withHeaders([
                    'User-Agent'      => $this->randomDesktopUA(),
                    'Accept'          => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language' => 'en-US,en;q=0.9,id;q=0.8',
                    'Referer'         => 'https://www.tiktok.com/',
                ])
                ->timeout(15)
                ->get($url);

            if (!$resp->ok()) return null;

            $html = $resp->body();

            $views    = $this->firstIntMatch($html, '/"playCount"\s*:\s*([0-9]+)/');
            $likes    = $this->firstIntMatch($html, '/"diggCount"\s*:\s*([0-9]+)/');
            $comments = $this->firstIntMatch($html, '/"commentCount"\s*:\s*([0-9]+)/');
            $shares   = $this->firstIntMatch($html, '/"shareCount"\s*:\s*([0-9]+)/');

            // Fallback pola "stats": { ... }
            if ($views === null)    $views    = $this->firstIntMatch($html, '/"stats"\s*:\s*{[^}]*"playCount"\s*:\s*([0-9]+)/');
            if ($likes === null)    $likes    = $this->firstIntMatch($html, '/"stats"\s*:\s*{[^}]*"diggCount"\s*:\s*([0-9]+)/');
            if ($comments === null) $comments = $this->firstIntMatch($html, '/"stats"\s*:\s*{[^}]*"commentCount"\s*:\s*([0-9]+)/');
            if ($shares === null)   $shares   = $this->firstIntMatch($html, '/"stats"\s*:\s*{[^}]*"shareCount"\s*:\s*([0-9]+)/');

            if ($views === null && $likes === null && $comments === null && $shares === null) {
                return null;
            }

            return [
                'views'    => $views    ?? 0,
                'likes'    => $likes    ?? 0,
                'comments' => $comments ?? 0,
                'shares'   => $shares   ?? 0,
            ];
        } catch (\Throwable $e) {
            return null;
        }
    }

    protected function firstIntMatch(string $haystack, string $regex): ?int
    {
        if (preg_match($regex, $haystack, $m)) {
            return (int) $m[1];
        }
        return null;
    }

    protected function normalizeUrl(string $url): string
    {
        $u = trim($url);
        $u = preg_replace('/\?(.*)$/', '', $u);
        if (!Str::startsWith($u, ['http://','https://'])) {
            $u = 'https://' . ltrim($u, '/');
        }
        return $u;
    }

    protected function randomDesktopUA(): string
    {
        $uas = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
        ];
        return $uas[array_rand($uas)];
    }
}
