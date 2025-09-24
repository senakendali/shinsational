<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /** @var int[] */
    private array $slots = [1,2,3,4,5];

    public function up(): void
    {
        Schema::table('influencer_submissions', function (Blueprint $table) {
            foreach ($this->slots as $i) {
                // views_i
                $v = "views_{$i}";
                if (!Schema::hasColumn('influencer_submissions', $v)) {
                    if (Schema::hasColumn('influencer_submissions', "link_{$i}")) {
                        $table->unsignedBigInteger($v)->nullable()->default(0)->after("link_{$i}");
                    } else {
                        $table->unsignedBigInteger($v)->nullable()->default(0);
                    }
                }

                // likes_i
                $l = "likes_{$i}";
                if (!Schema::hasColumn('influencer_submissions', $l)) {
                    // taruh setelah views_i (kalau belum ada, barusan kita tambahkan)
                    if (Schema::hasColumn('influencer_submissions', $v)) {
                        $table->unsignedBigInteger($l)->nullable()->default(0)->after($v);
                    } else {
                        $table->unsignedBigInteger($l)->nullable()->default(0);
                    }
                }

                // comments_i
                $c = "comments_{$i}";
                if (!Schema::hasColumn('influencer_submissions', $c)) {
                    if (Schema::hasColumn('influencer_submissions', $l)) {
                        $table->unsignedBigInteger($c)->nullable()->default(0)->after($l);
                    } else {
                        $table->unsignedBigInteger($c)->nullable()->default(0);
                    }
                }

                // shares_i
                $s = "shares_{$i}";
                if (!Schema::hasColumn('influencer_submissions', $s)) {
                    if (Schema::hasColumn('influencer_submissions', $c)) {
                        $table->unsignedBigInteger($s)->nullable()->default(0)->after($c);
                    } else {
                        $table->unsignedBigInteger($s)->nullable()->default(0);
                    }
                }

                // saves_i (bonus: sekalian pastikan ada & letakkan setelah shares_i)
                $sv = "saves_{$i}";
                if (!Schema::hasColumn('influencer_submissions', $sv)) {
                    if (Schema::hasColumn('influencer_submissions', $s)) {
                        $table->unsignedBigInteger($sv)->nullable()->default(0)->after($s);
                    } else {
                        // jika shares_i belum ada (kasus edge), tetap tambahkan tanpa after
                        $table->unsignedBigInteger($sv)->nullable()->default(0);
                    }
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('influencer_submissions', function (Blueprint $table) {
            foreach ($this->slots as $i) {
                foreach (["saves_{$i}", "shares_{$i}", "comments_{$i}", "likes_{$i}", "views_{$i}"] as $col) {
                    if (Schema::hasColumn('influencer_submissions', $col)) {
                        $table->dropColumn($col);
                    }
                }
            }
        });
    }
};
