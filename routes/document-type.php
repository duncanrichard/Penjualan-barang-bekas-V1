<?php

use App\Http\Controllers\MasterData\DocumentTypeController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->prefix('admin/master-data/document-types')
    ->name('admin.master-data.document-types.')
    ->controller(DocumentTypeController::class)
    ->group(function () {
        Route::get('/', 'index')
            ->name('index');

        Route::get('/options', 'options')
            ->name('options');

        Route::post('/', 'store')
            ->name('store');

        Route::get(
            '/{documentType}',
            'show'
        )
            ->whereUuid('documentType')
            ->name('show');

        Route::match(
            ['put', 'patch'],
            '/{documentType}',
            'update'
        )
            ->whereUuid('documentType')
            ->name('update');

        Route::patch(
            '/{documentType}/toggle',
            'toggle'
        )
            ->whereUuid('documentType')
            ->name('toggle');

        Route::delete(
            '/{documentType}',
            'destroy'
        )
            ->whereUuid('documentType')
            ->name('destroy');
    });
