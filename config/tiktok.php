<?php

return [
    'base_url'       => env('TIKTOK_BASE_URL', 'https://open.tiktokapis.com/v2'),
    // fields *valid* untuk video. Jangan pakai video_id/author_open_id/statistics.
    'default_fields' => explode(',', env('TIKTOK_DEFAULT_FIELDS', 'id,create_time,view_count,like_count,comment_count,share_count')),
    // kalau kamu masih mau fallback scraping HTML lama kamu (nggak direkomendasikan), set true
    'enable_html_fallback' => filter_var(env('TIKTOK_ENABLE_HTML_FALLBACK', false), FILTER_VALIDATE_BOOLEAN),
];
