<?php

namespace App\Exports;

use App\Models\InfluencerSubmission;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Carbon\Carbon;

class KolDataExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(
        protected int $campaignId,
        protected ?string $keyword = null,
        protected ?string $gender = null // Male | Female | Other | Unknown | null
    ) {}

    public function headings(): array
    {
        return [
            'Campaign',
            'KOL Name',
            'TikTok Username',
            'TikTok User ID',
            'Phone',
            'Email',
            'Address',
            'Gender',
            'Age',
        ];
    }

    public function collection()
    {
        // Ambil submissions kampanye ini + field identitas dari registrations
        $rows = InfluencerSubmission::query()
            ->select([
                'influencer_submissions.*',

                // identitas dasar
                'full_name' => \App\Models\InfluencerRegistration::select('full_name')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                'tiktok_username' => \App\Models\InfluencerRegistration::select('tiktok_username')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                'phone' => \App\Models\InfluencerRegistration::select('phone')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                'email' => \App\Models\InfluencerRegistration::select('email')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                'address' => \App\Models\InfluencerRegistration::select('address')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                // gender & birth_date dari registrations terbaru
                'gender' => \App\Models\InfluencerRegistration::select('gender')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),

                'birth_date' => \App\Models\InfluencerRegistration::select('birth_date')
                    ->whereColumn('influencer_registrations.tiktok_user_id', 'influencer_submissions.tiktok_user_id')
                    ->whereColumn('influencer_registrations.campaign_id', 'influencer_submissions.campaign_id')
                    ->latest()->limit(1),
            ])
            ->with(['campaign:id,name'])
            ->where('influencer_submissions.campaign_id', $this->campaignId)
            ->orderByDesc('influencer_submissions.updated_at')
            ->get();

        // Unik per KOL (tiktok_user_id). Karena di-order desc, yang pertama = paling baru.
        $rows = $rows->unique('tiktok_user_id')->values();

        // Filter keyword (name/username/phone/email/address/open_id)
        $kw = trim(mb_strtolower((string) $this->keyword));
        if ($kw !== '') {
            $rows = $rows->filter(function ($s) use ($kw) {
                $name   = $this->kolNameOf($s);
                $uname  = $s->tiktok_username ? '@'.$s->tiktok_username : '';
                $phone  = (string) ($s->phone ?? '');
                $email  = (string) ($s->email ?? '');
                $addr   = (string) ($s->address ?? '');
                $openId = (string) ($s->tiktok_user_id ?? '');
                $hay = mb_strtolower("$name $uname $phone $email $addr $openId");
                return str_contains($hay, $kw);
            })->values();
        }

        // Filter gender (optional) -> normalisasi dulu
        $g = $this->normalizeGender($this->gender);
        if ($g) {
            $rows = $rows->filter(function ($s) use ($g) {
                return $this->normalizeGender($s->gender) === $g;
            })->values();
        }

        return $rows;
    }

    public function map($s): array
    {
        $campaign = $s->campaign->name ?? '';
        $name     = $this->kolNameOf($s);
        $uname    = $s->tiktok_username ? '@'.$s->tiktok_username : '';
        $openId   = (string) ($s->tiktok_user_id ?? '');
        $phone    = (string) ($s->phone ?? '');
        $email    = (string) ($s->email ?? '');
        $addr     = (string) ($s->address ?? '');
        $gender   = $this->normalizeGender($s->gender) ?? 'Unknown';
        $age      = $this->ageFrom($s->birth_date);

        return [
            $campaign,
            $name,
            $uname,
            $openId,
            $phone,
            $email,
            $addr,
            $gender,
            $age === null ? '' : $age,
        ];
    }

    // ===== Helpers =====
    protected function kolNameOf($s): string
    {
        return $s->full_name
            ?? ($s->tiktok_username ? '@'.$s->tiktok_username : null)
            ?? $s->display_name
            ?? $s->tiktok_display_name
            ?? $s->name
            ?? $s->creator_name
            ?? $s->influencer_name
            ?? $s->user_name
            ?? '—';
    }

    protected function normalizeGender($raw): ?string
    {
        if ($raw === null) return null;
        $val = trim(mb_strtolower((string)$raw));
        if ($val === '') return 'Unknown';
        if (in_array($val, ['male','m','pria','laki-laki','l'])) return 'Male';
        if (in_array($val, ['female','f','wanita','perempuan','p'])) return 'Female';
        return 'Other';
    }

    protected function ageFrom($date): ?int
    {
        if (!$date) return null;
        try {
            $dt = Carbon::parse($date);
        } catch (\Throwable $e) {
            return null;
        }
        $age = $dt->age; // umur berdasarkan hari ini
        return ($age >= 0 && $age < 150) ? $age : null;
    }
}
