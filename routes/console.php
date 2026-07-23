<?php

use App\Http\Controllers\Admin\DocumentReminderController;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Inspire Command
|--------------------------------------------------------------------------
*/

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Perintah Manual Proses Reminder
|--------------------------------------------------------------------------
|
| Dapat dijalankan dengan:
|
| php artisan document-reminders:process
|
*/

Artisan::command('document-reminders:process', function () {
    $this->info('Memulai proses reminder dokumen...');

    try {
        $controller = app(
            DocumentReminderController::class
        );

        $response = $controller->processDueReminders();

        $responseData = $response->getData(true);

        $summary = $responseData['data'] ?? [];

        $this->newLine();
        $this->info(
            $responseData['message']
                ?? 'Proses reminder selesai.'
        );

        $this->table(
            [
                'Keterangan',
                'Jumlah',
            ],
            [
                [
                    'Data diperiksa',
                    $summary['checked'] ?? 0,
                ],
                [
                    'WhatsApp terkirim',
                    $summary['sent'] ?? 0,
                ],
                [
                    'WhatsApp gagal',
                    $summary['failed'] ?? 0,
                ],
                [
                    'Siklus baru dibuat',
                    $summary['new_cycles'] ?? 0,
                ],
                [
                    'Ditutup tanpa pengulangan',
                    $summary[
                        'closed_without_repeat'
                    ] ?? 0,
                ],
            ]
        );

        Log::info(
            'Perintah manual reminder dokumen selesai.',
            $summary
        );

        return self::SUCCESS;
    } catch (\Throwable $exception) {
        report($exception);

        Log::error(
            'Perintah manual reminder dokumen gagal.',
            [
                'error' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]
        );

        $this->error(
            'Proses reminder gagal: '
                . $exception->getMessage()
        );

        return self::FAILURE;
    }
})->purpose(
    'Memproses dan mengirim reminder dokumen yang jatuh tempo'
);

/*
|--------------------------------------------------------------------------
| Scheduler Reminder Otomatis
|--------------------------------------------------------------------------
|
| Scheduler dijalankan setiap menit, tetapi pesan hanya akan dikirim
| ketika next_reminder_at sudah jatuh tempo.
|
*/

Schedule::call(function () {
    try {
        $controller = app(
            DocumentReminderController::class
        );

        $response = $controller->processDueReminders();

        $responseData = $response->getData(true);

        Log::info(
            'Scheduler reminder dokumen selesai.',
            $responseData['data'] ?? []
        );
    } catch (\Throwable $exception) {
        report($exception);

        Log::error(
            'Scheduler reminder dokumen gagal.',
            [
                'error' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]
        );
    }
})
    ->name('document-reminders-process')
    ->everyMinute()
    ->withoutOverlapping(10)
    ->onOneServer();
