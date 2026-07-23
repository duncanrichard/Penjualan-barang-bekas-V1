<?php

use App\Http\Controllers\Admin\CompanyProfileController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->prefix('company-profile')
    ->name('company-profile.')
    ->controller(CompanyProfileController::class)
    ->group(function () {
        Route::get('/', 'show')
            ->name('show');

        Route::put('/', 'update')
            ->name('update');

        Route::post(
            '/fonnte/test-connection',
            'testFonnteConnection'
        )->name('fonnte.test-connection');

        Route::patch(
            '/fonnte/toggle',
            'toggleFonnte'
        )->name('fonnte.toggle');

        Route::delete(
            '/fonnte/token',
            'removeFonnteToken'
        )->name('fonnte.token.destroy');
    });
