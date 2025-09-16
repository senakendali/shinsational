<?php
// app/Console/Commands/TikTokRefreshTokens.php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\InfluencerAccount;
use App\Services\TikTokService;

class TikTokRefreshTokens extends Command
{
    protected $signature = 'tiktok:refresh 
        {--id= : Refresh 1 account by id} 
        {--all : Refresh semua akun aktif}
        {--expiring=30 : Refresh yang kadaluarsa ≤ N menit (default 30)}';

    protected $description = 'Refresh TikTok access tokens from influencer_account';

    public function handle()
    {
        $q = InfluencerAccount::query()
            ->whereNull('revoked_at')
            ->whereNotNull('refresh_token');

        if ($id = $this->option('id')) {
            $q->where('id', $id);
        } elseif (!$this->option('all')) {
            $minutes = (int) $this->option('expiring');
            $q->whereNotNull('expires_at')
              ->where('expires_at', '<=', now()->addMinutes($minutes));
        }

        $count = 0;
        $q->orderBy('expires_at')->chunkById(100, function($rows) use (&$count) {
            foreach ($rows as $acc) {
                try {
                    app(TikTokService::class)->refreshAccessToken($acc);
                    $count++;
                    usleep(200 * 1000); // 200ms throttle → kurangi 429
                } catch (\Throwable $e) {
                    report($e);
                }
            }
        });

        $this->info("Refreshed tokens: {$count}");
        return self::SUCCESS;
    }
}
