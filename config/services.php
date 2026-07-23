<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | File ini digunakan untuk menyimpan konfigurasi layanan pihak ketiga
    | seperti Postmark, Resend, AWS SES, Slack, Fonnte, OpenWA, dan lainnya.
    | Nilai credential utama sebaiknya tetap disimpan di file .env.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Fonnte WhatsApp Gateway
    |--------------------------------------------------------------------------
    |
    | Digunakan jika sistem memakai Fonnte.
    |
    */

    'fonnte' => [
        'token' => env('FONNTE_TOKEN'),
        'url' => env('FONNTE_URL', 'https://api.fonnte.com/send'),
    ],

    /*
    |--------------------------------------------------------------------------
    | OpenWA / WA Blast Gateway
    |--------------------------------------------------------------------------
    |
    | Digunakan untuk Reminder Dokumen.
    | Contoh API URL:
    | https://wa.blast.dsicorp.id/api
    |
    | Contoh endpoint kirim pesan:
    | https://wa.blast.dsicorp.id/api/sendText
    |
    */

'openwa' => [
    'api_url' => env('OPENWA_API_URL', 'https://wa.blast.dsicorp.id'),
    'api_key' => env('OPENWA_API_KEY'),
    'session' => env('OPENWA_SESSION', 'rekruitment'),
    'verify_ssl' => env('OPENWA_VERIFY_SSL', false),
    'send_text_path' => env('OPENWA_SEND_TEXT_PATH', '/api/sendText'),
],
];
