<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class TikTokDisplayApi
{
    private string $baseUrl;
    private array $defaultFields;

    public function __construct()
    {
        $this->baseUrl       = rtrim(config('tiktok.base_url', 'https://open.tiktokapis.com/v2'), '/');
        $this->defaultFields = config('tiktok.default_fields', [
            'id','create_time','view_count','like_count','comment_count','share_count'
        ]);
    }

    /** HTTP client dengan retry/backoff untuk 429/5xx */
    private function http(string $token): PendingRequest
    {
        return Http::withToken($token)
            ->acceptJson()
            ->timeout(20)
            ->retry(
                4, // total percobaan
                500, // base sleep ms (exponential)
                function ($exception, $request) {
                    // Retry kalau koneksi gagal/5xx/429
                    $response = method_exists($exception, 'response') ? $exception->response : null;
                    $status   = $response ? $response->status() : null;
                    if ($status === 429) {
                        // hormati Retry-After kalau ada
                        $retryAfter = (int) ($response->header('Retry-After') ?? 0);
                        if ($retryAfter > 0) {
                            usleep($retryAfter * 1_000_000);
                        }
                        return true;
                    }
                    return $status && $status >= 500;
                }
            );
    }

    /** Format fields valid jadi CSV untuk query string */
    private function buildFieldsCsv(?array $fields): string
    {
        $list = $fields && count($fields) ? $fields : $this->defaultFields;
        // jaga-jaga: hapus duplikat & spasi
        $list = array_values(array_unique(array_map(fn($f) => trim($f), $list)));
        return implode(',', $list);
    }

    /**
     * Query metrik untuk video tertentu (max 20 id)
     * return: ['videos' => [...]], atau throw RequestException kalau gagal
     */
    public function queryVideos(string $accessToken, array $videoIds, ?array $fields = null): array
    {
        $videoIds = array_values(array_unique(array_filter($videoIds, fn($v) => (string) $v !== '')));
        if (empty($videoIds)) {
            return ['videos' => []];
        }
        if (count($videoIds) > 20) {
            $videoIds = array_slice($videoIds, 0, 20);
        }

        $fieldsCsv = $this->buildFieldsCsv($fields);
        $url = $this->baseUrl . '/video/query/?fields=' . urlencode($fieldsCsv);

        $res = $this->http($accessToken)->asJson()->post($url, [
            'filters' => ['video_ids' => $videoIds],
        ]);

        if ($res->failed()) {
            $this->throwWithContext($res);
        }

        return $res->json('data') ?? ['videos' => []];
    }

    /**
     * List video milik user yg authorize + metriknya
     * cursor default 0, max_count wajib 1..20
     */
    public function listVideos(string $accessToken, int $cursor = 0, int $maxCount = 20, ?array $fields = null): array
    {
        $maxCount = max(1, min($maxCount, 20));
        $fieldsCsv = $this->buildFieldsCsv($fields);
        $url = $this->baseUrl . '/video/list/?fields=' . urlencode($fieldsCsv);

        $res = $this->http($accessToken)->asJson()->post($url, [
            'cursor'    => $cursor,
            'max_count' => $maxCount,
        ]);

        if ($res->failed()) {
            $this->throwWithContext($res);
        }

        return $res->json('data') ?? ['videos' => [], 'cursor' => 0, 'has_more' => false];
    }

    /** Helper: ekstrak video ID dari URL canonical TikTok */
    public static function extractIdFromUrl(string $url): ?string
    {
        // Contoh URL: https://www.tiktok.com/@username/video/7550282617065573639
        if (preg_match('~tiktok\.com/.*/video/(\d+)~', $url, $m)) {
            return $m[1];
        }
        // Kalau user sudah langsung kasih ID
        if (preg_match('~^\d{8,}$~', trim($url))) {
            return trim($url);
        }
        // Short link vm.tiktok.com biasanya perlu follow redirect; kita skip di sini
        return null;
    }

    /**
     * Probe metrik 1 video: terima URL atau ID.
     * Return: ['views'=>..,'likes'=>..,'comments'=>..,'shares'=>..] | null
     */
    public function probeVideoMetrics(string $accessToken, string $videoUrlOrId): ?array
    {
        $id = self::extractIdFromUrl($videoUrlOrId);
        if (!$id) {
            if (config('tiktok.enable_html_fallback') && method_exists($this, 'probeFromHtml')) {
                // Kalau kamu mau tetap pakai fallback HTML lama kamu
                return $this->probeFromHtml($videoUrlOrId);
            }
            return null;
        }

        try {
            $data = $this->queryVideos($accessToken, [$id]);
            $video = $data['videos'][0] ?? null;
            if (!$video) {
                return null;
            }
            return [
                'views'    => (int) ($video['view_count'] ?? 0),
                'likes'    => (int) ($video['like_count'] ?? 0),
                'comments' => (int) ($video['comment_count'] ?? 0),
                'shares'   => (int) ($video['share_count'] ?? 0),
                'id'       => (string) ($video['id'] ?? $id),
                'create_time' => $video['create_time'] ?? null,
            ];
        } catch (\Throwable $e) {
            if (config('tiktok.enable_html_fallback') && method_exists($this, 'probeFromHtml')) {
                return $this->probeFromHtml($videoUrlOrId);
            }
            return null;
        }
    }

    private function throwWithContext($response): void
    {
        $msg   = data_get($response->json(), 'error.message') ?? 'TikTok API error';
        $code  = data_get($response->json(), 'error.code') ?? ('HTTP '.$response->status());
        $logId = $response->header('x-tt-logid');

        $context = [
            'status' => $response->status(),
            'code'   => $code,
            'log_id' => $logId,
            'url'    => (string) $response->effectiveUri() ?? '',
            'body'   => $response->json(),
        ];

        throw new RequestException(
            $response,
            new \Exception($msg . ($logId ? " (log_id: $logId)" : '')),
        );
    }
}
