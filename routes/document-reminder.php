<?php

use App\Http\Controllers\Admin\DocumentReminderController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->prefix('admin/document-reminders')
    ->name('admin.document-reminders.')
    ->controller(DocumentReminderController::class)
    ->group(function (): void {
        /*
        |--------------------------------------------------------------------------
        | Pilihan master jenis dokumen
        |--------------------------------------------------------------------------
        |
        | Harus berada sebelum /{documentReminder} agar kata
        | "document-types" tidak dianggap sebagai UUID reminder.
        |
        */

        Route::get(
            '/options/document-types',
            'documentTypeOptions'
        )->name('options.document-types');

        /*
        |--------------------------------------------------------------------------
        | Daftar dan tambah reminder
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/',
            'index'
        )->name('index');

        Route::post(
            '/',
            'store'
        )->name('store');

        /*
        |--------------------------------------------------------------------------
        | Proses reminder otomatis
        |--------------------------------------------------------------------------
        |
        | Route ini harus ditempatkan sebelum /{documentReminder}.
        |
        */

        Route::post(
            '/process-due',
            'processDueReminders'
        )->name('process-due');

        /*
        |--------------------------------------------------------------------------
        | Detail reminder
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/{documentReminder}',
            'show'
        )
            ->whereUuid('documentReminder')
            ->name('show');

        /*
        |--------------------------------------------------------------------------
        | Update reminder
        |--------------------------------------------------------------------------
        */

        Route::match(
            [
                'put',
                'patch',
            ],
            '/{documentReminder}',
            'update'
        )
            ->whereUuid('documentReminder')
            ->name('update');

        /*
        |--------------------------------------------------------------------------
        | Membuat siklus baru secara manual
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/{documentReminder}/renew',
            'renew'
        )
            ->whereUuid('documentReminder')
            ->name('renew');

        /*
        |--------------------------------------------------------------------------
        | Kirim WhatsApp manual
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/{documentReminder}/send-whatsapp',
            'sendWhatsapp'
        )
            ->whereUuid('documentReminder')
            ->name('send-whatsapp');

        /*
        |--------------------------------------------------------------------------
        | Hapus reminder
        |--------------------------------------------------------------------------
        */

        Route::delete(
            '/{documentReminder}',
            'destroy'
        )
            ->whereUuid('documentReminder')
            ->name('destroy');
    });
