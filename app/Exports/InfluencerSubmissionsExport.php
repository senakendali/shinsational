<?php

namespace App\Exports;

use App\Models\InfluencerSubmission;
use App\Models\InfluencerRegistration;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class InfluencerSubmissionsExport implements
    FromQuery, WithMapping, WithHeadings, ShouldAutoSize, WithChunkReading
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
        $q = InfluencerSubmission::query()
            ->select('influencer_submissions.*')
            ->addSelect([
                // identitas dari registration terakhir (per campaign + open_id)
                'full_name' => InfluencerRegistration::select('full_name')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),
                'tiktok_username' => InfluencerRegistration::select('tiktok_username')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),
                'profile_pic_url' => InfluencerRegistration::select('profile_pic_url')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),
                'address' => InfluencerRegistration::select('address')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),
            ])
            ->with(['campaign:id,name'])
            ->where('campaign_id', $this->campaignId)
            ->orderBy('id');

        if ($this->keyword !== null && $this->keyword !== '') {
            $kw = '%'.mb_strtolower($this->keyword).'%';
            $q->where(function (Builder $w) use ($kw) {
                $w->orWhereRaw('LOWER(full_name) LIKE ?', [$kw])
                  ->orWhereRaw('LOWER(tiktok_username) LIKE ?', [$kw])
                  ->orWhereRaw('LOWER(tiktok_user_id) LIKE ?', [$kw])
                  ->orWhereRaw('LOWER(link_1) LIKE ?', [$kw])
                  ->orWhereRaw('LOWER(link_2) LIKE ?', [$kw])
                  ->orWhereRaw('LOWER(address) LIKE ?', [$kw]);
            });
        }

        return $q;
    }

    public function headings(): array
    {
        $cols = [
            'Campaign',
            'KOL Name',
            'Avatar URL',
            'TikTok User ID',
            'Address',
            'Invoice URL',
            'Review URL',
        ];

        for ($i = 1; $i <= self::MAX_SLOTS; $i++) {
            $cols[] = "Link {$i}";
            $cols[] = "Post Date {$i}";
            $cols[] = "Screenshot URL {$i}";
            $cols[] = "Views {$i}";
            $cols[] = "Likes {$i}";
            $cols[] = "Comments {$i}";
            $cols[] = "Shares {$i}";
        }

        $cols[] = 'Total Contents';
        $cols[] = 'Total Views';
        $cols[] = 'Total Likes';
        $cols[] = 'Total Comments';
        $cols[] = 'Total Shares';

        return $cols;
    }

    public function map($s): array
    {
        $camp   = $s->campaign->name ?? ('campaign_'.$s->campaign_id);
        $name   = $this->kolNameOf($s);
        $avatar = $this->kolAvatarOf($s);
        $openId = (string) ($s->tiktok_user_id ?? '');
        $addr   = $this->addressOf($s);

        $invoice = $this->publicUrl($s->invoice_file_url ?? $s->invoice_file_path ?? null);
        $review  = $this->publicUrl($s->review_proof_file_url ?? $s->review_proof_file_path ?? null);

        $row = [$camp, $name, $avatar ?? '', $openId, $addr, $invoice ?? '', $review ?? ''];

        $totalContents = 0;
        $totV = 0; $totL = 0; $totC = 0; $totS = 0;

        for ($slot = 1; $slot <= self::MAX_SLOTS; $slot++) {
            $link   = $s->{"link_{$slot}"} ?? '';
            $pdateR = $s->{"post_date_{$slot}"} ?? null;
            $pdate  = $pdateR ? Carbon::parse($pdateR)->format('d/m/Y') : '';

            $scRaw = $s->{"screenshot_{$slot}_url"} ?? $s->{"screenshot_{$slot}_path"} ?? null;
            $scUrl = $this->publicUrl($scRaw);

            $views    = $this->metric($s, $slot, 'views')    ?? $this->metric($s, $slot, 'view');
            $likes    = $this->metric($s, $slot, 'likes')    ?? $this->metric($s, $slot, 'like');
            $comments = $this->metric($s, $slot, 'comments') ?? $this->metric($s, $slot, 'comment');
            $shares   = $this->metric($s, $slot, 'shares')   ?? $this->metric($s, $slot, 'share');

            if (trim((string) $link) !== '' || $pdate || $scUrl) $totalContents++;

            $totV += (int) ($views ?? 0);
            $totL += (int) ($likes ?? 0);
            $totC += (int) ($comments ?? 0);
            $totS += (int) ($shares ?? 0);

            $row[] = $link ?: '';
            $row[] = $pdate ?: '';
            $row[] = $scUrl ?: '';
            $row[] = $views ?? '';
            $row[] = $likes ?? '';
            $row[] = $comments ?? '';
            $row[] = $shares ?? '';
        }

        $row[] = $totalContents;
        $row[] = $totV;
        $row[] = $totL;
        $row[] = $totC;
        $row[] = $totS;

        return $row;
    }

    public function chunkSize(): int
    {
        return 500;
    }

    // ===== helpers =====
    private function publicUrl($pathOrUrl): ?string
    {
        if (!$pathOrUrl) return null;
        $str = (string) $pathOrUrl;
        if (preg_match('~^https?://~i', $str)) return $str;
        $str = ltrim($str, '/');
        if (str_starts_with($str, 'storage/')) $str = substr($str, 8);
        return Storage::disk('public')->url($str);
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

    private function kolAvatarOf($s): ?string
    {
        $raw = $s->profile_pic_url ?? $s->avatar_url ?? null;
        return $raw ? (string) $raw : null;
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
