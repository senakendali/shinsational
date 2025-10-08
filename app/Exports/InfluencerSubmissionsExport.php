<?php

namespace App\Exports;

use App\Models\InfluencerSubmission;
use App\Models\InfluencerRegistration;
use App\Models\InfluencerAccount;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Border;

class InfluencerSubmissionsExport implements
    FromQuery, WithMapping, WithHeadings, ShouldAutoSize, WithChunkReading, WithEvents
{
    /** Batasi jumlah slot konten di export */
    private const MAX_SLOTS = 2;

    private int $campaignId;
    private ?string $keyword;

    public function __construct(int $campaignId, ?string $keyword = null)
    {
        $this->campaignId = $campaignId;
        $this->keyword    = $keyword ? trim($keyword) : null;
    }

    public function query()
    {
        $ir = (new InfluencerRegistration())->getTable();
        $ia = (new InfluencerAccount())->getTable();
        $is = (new InfluencerSubmission())->getTable();

        // subquery helper: latest registration per (open_id,campaign)
        $subReg = fn(string $col) =>
            InfluencerRegistration::select($col)
                ->whereColumn("$ir.tiktok_user_id", "$is.tiktok_user_id")
                ->whereColumn("$ir.campaign_id",   "$is.campaign_id")
                ->latest()->limit(1);

        // subquery followers dari influencer_accounts (berdasar open_id saja)
        $subFollowers = InfluencerAccount::select('followers_count')
            ->whereColumn("$ia.tiktok_user_id", "$is.tiktok_user_id")
            ->orderByDesc("$ia.updated_at")
            ->orderByDesc("$ia.id")
            ->limit(1);

        $q = InfluencerSubmission::query()
            ->select("$is.*")
            ->addSelect([
                'full_name'        => $subReg('full_name'),
                'tiktok_username'  => $subReg('tiktok_username'),
                'profile_pic_url'  => $subReg('profile_pic_url'),
                'address'          => $subReg('address'),
                'followers_count'  => $subFollowers,
            ])
            ->with(['campaign:id,name'])
            ->where("$is.campaign_id", $this->campaignId)
            ->orderBy("$is.id");

        if ($this->keyword !== null && $this->keyword !== '') {
            $kw = '%'.mb_strtolower($this->keyword).'%';

            // Tetap support search lama (termasuk user_id), meski kolomnya tidak di-export
            $q->where(function (Builder $w) use ($kw, $is, $ir) {
                $fullNameSql = "LOWER(COALESCE((SELECT r.full_name
                                FROM $ir r
                                WHERE r.tiktok_user_id = $is.tiktok_user_id
                                  AND r.campaign_id    = $is.campaign_id
                                ORDER BY r.id DESC LIMIT 1),'')
                              )";
                $usernameSql = "LOWER(COALESCE((SELECT r.tiktok_username
                                FROM $ir r
                                WHERE r.tiktok_user_id = $is.tiktok_user_id
                                  AND r.campaign_id    = $is.campaign_id
                                ORDER BY r.id DESC LIMIT 1),'')
                              )";
                $addressSql = "LOWER(COALESCE((SELECT r.address
                                FROM $ir r
                                WHERE r.tiktok_user_id = $is.tiktok_user_id
                                  AND r.campaign_id    = $is.campaign_id
                                ORDER BY r.id DESC LIMIT 1),'')
                              )";

                $w->orWhereRaw("$fullNameSql LIKE ?", [$kw])
                  ->orWhereRaw("$usernameSql LIKE ?", [$kw])
                  ->orWhereRaw('LOWER('.$is.'.tiktok_user_id) LIKE ?', [$kw])
                  ->orWhereRaw('LOWER('.$is.'.link_1) LIKE ?', [$kw])
                  ->orWhereRaw('LOWER('.$is.'.link_2) LIKE ?', [$kw])
                  ->orWhereRaw("$addressSql LIKE ?", [$kw]);
            });
        }

        return $q;
    }

    public function headings(): array
    {
        // UPDATED: Hilangkan "TikTok User ID", tambah kolom baru setelah Address
        $cols = [
            'Campaign',
            'KOL Name',
            'Followers',
            'Address',
            'Purchase Platform',
            'Price',
            'Invoice',
            'Review',
        ];

        // Kolom per slot
        for ($i = 1; $i <= self::MAX_SLOTS; $i++) {
            $cols[] = "Link {$i}";
            $cols[] = "Post Date {$i}";
            $cols[] = "Views {$i}";
            $cols[] = "Likes {$i}";
            $cols[] = "Comments {$i}";
            $cols[] = "Shares {$i}";
            $cols[] = "Saves {$i}";
            $cols[] = "Total Engagement {$i}";
            $cols[] = "ER {$i}";
        }

        return $cols;
    }

    public function map($s): array
    {
        $camp   = $s->campaign->name ?? ('campaign_'.$s->campaign_id);
        $name   = $this->kolNameOf($s);
        $addr   = $this->addressOf($s);
        $folls  = $this->followersOf($s);

        // NEW: purchase fields + file links ke /files?p=...
        $purchasePlatform = (string) ($s->purchase_platform ?? '');
        $price            = $s->purchase_price ?? ''; // biarin raw agar bebas format di Excel
        $invoiceUrl       = $this->fileLink($s->invoice_file_path ?? null) ?? '';
        $reviewUrl        = $this->fileLink($s->review_proof_file_path ?? null) ?? '';

        // Nilai cell G/H diisi URL mentah (nanti dibikin hyperlink di AfterSheet)
        $row = [$camp, $name, $folls, $addr, $purchasePlatform, $price, $invoiceUrl, $reviewUrl];

        for ($slot = 1; $slot <= self::MAX_SLOTS; $slot++) {
            $link   = $s->{"link_{$slot}"} ?? '';
            $pdateR = $s->{"post_date_{$slot}"} ?? null;
            $pdate  = $pdateR ? Carbon::parse($pdateR)->format('d/m/Y') : '';

            $views    = $this->metric($s, $slot, 'views')    ?? $this->metric($s, $slot, 'view');
            $likes    = $this->metric($s, $slot, 'likes')    ?? $this->metric($s, $slot, 'like');
            $comments = $this->metric($s, $slot, 'comments') ?? $this->metric($s, $slot, 'comment');
            $shares   = $this->metric($s, $slot, 'shares')   ?? $this->metric($s, $slot, 'share');
            $saves    = $this->metric($s, $slot, 'saves')    ?? $this->metric($s, $slot, 'save');

            $likesN    = (int) ($likes ?? 0);
            $commentsN = (int) ($comments ?? 0);
            $sharesN   = (int) ($shares ?? 0);
            $savesN    = (int) ($saves ?? 0);
            $totalEng  = $likesN + $commentsN + $sharesN + $savesN;

            $viewsN  = (int) ($views ?? 0);
            $erRatio = $viewsN > 0 ? ($totalEng / $viewsN) : null;
            $erPct   = $erRatio === null ? '' : (string) (round($erRatio * 100)).'%';

            $row[] = $link ?: '';
            $row[] = $pdate ?: '';
            $row[] = $views ?? '';
            $row[] = $likes ?? '';
            $row[] = $comments ?? '';
            $row[] = $shares ?? '';
            $row[] = $saves ?? '';
            $row[] = $totalEng;
            $row[] = $erPct;
        }

        return $row;
    }

    public function chunkSize(): int
    {
        return 500;
    }

    /** Tambahkan border untuk seluruh tabel + PAKSA hyperlink G/H */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                // Border seluruh area + header bold
                $dimension = $event->sheet->calculateWorksheetDimension();
                $sheet->getStyle($dimension)->getBorders()->getAllBorders()
                    ->setBorderStyle(Border::BORDER_THIN);
                $event->sheet->getStyle('A1:' . $event->sheet->getHighestColumn() . '1')
                    ->getFont()->setBold(true);

                // Paksa hyperlink untuk kolom G (Invoice) & H (Review)
                $lastRow = $sheet->getHighestRow();
                if ($lastRow >= 2) {
                    for ($row = 2; $row <= $lastRow; $row++) {
                        foreach (['G', 'H'] as $col) {
                            $addr = "{$col}{$row}";
                            $cell = $sheet->getCell($addr);
                            // Ambil value dari cell (URL yang kita taruh di map)
                            $url = trim((string) $cell->getValue());

                            if ($url !== '') {
                                // Set hyperlink ke URL
                                $cell->getHyperlink()->setUrl($url);

                                // Opsional: kalau mau text-nya pendek saja, contoh "Open"
                                // $cell->setValue('Open');

                                // Style biru + underline biar kelihatan link
                                $sheet->getStyle($addr)->applyFromArray([
                                    'font' => [
                                        'underline' => true,
                                        'color' => ['rgb' => '0563C1'], // warna hyperlink default Excel
                                    ],
                                ]);
                            }
                        }
                    }
                }
            },
        ];
    }

    // ===== helpers =====
    private function fileLink($pathOrUrl): ?string
    {
        if (!$pathOrUrl) return null;

        // Kalau sudah http(s) biarin aja (bisa jadi sudah /files?p=...)
        $str = (string) $pathOrUrl;
        if (preg_match('~^https?://~i', $str)) return $str;

        // Normalisasi path yang tersimpan di DB
        $p = ltrim($str, '/');
        if (str_starts_with($p, 'public/'))  $p = substr($p, 7);
        if (str_starts_with($p, 'storage/')) $p = substr($p, 8);

        // Base URL dari APP_URL (fallback relative)
        $base = rtrim(config('app.url', ''), '/'); // contoh: http://127.0.0.1:8005

        $suffix = '/files?p=' . rawurlencode($p);
        return $base ? ($base . $suffix) : $suffix;
    }

    private function kolNameOf($s): string
    {
        $name =
            $s->full_name
            ?? ($s->tiktok_username ? '@'.$s->tiktok_username : null)
            ?? $s->tiktok_display_name
            ?? $s->display_name
            ?? $s->creator_name
            ?? $s->influencer_name
            ?? $s->user_name
            ?? '';
        return (string) $name;
    }

    private function followersOf($s): ?int
    {
        foreach ([
            'followers_count',   // from influencer_accounts (selected as alias)
            'tiktok_followers',
            'follower_count',
            'followers',
            'fans',
            'fans_count',
            'stats_followers',
        ] as $k) {
            if (isset($s->$k) && $s->$k !== null) return (int) $s->$k;
        }
        return null;
    }

    private function addressOf($s): string
    {
        $addr =
            $s->address
            ?? $s->full_address
            ?? $s->alamat
            ?? trim(implode(', ', array_filter([
                $s->address_line_1 ?? null,
                $s->address_line_2 ?? null,
                $s->city ?? null,
                $s->state ?? ($s->province ?? $s->provinsi ?? null),
                $s->postal_code ?? $s->zip ?? null,
            ])));
        return (string) ($addr ?? '');
    }

    private function metric($s, int $slot, string $base)
    {
        foreach ([
            "{$base}_{$slot}",
            "{$base}{$slot}",
            "{$base}_{$slot}_count",
            "{$base}{$slot}_count",
            $base,
            "{$base}_count",
        ] as $k) {
            if (isset($s->$k) && $s->$k !== null) return $s->$k;
        }
        return null;
    }
}
