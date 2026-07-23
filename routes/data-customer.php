<?php

use App\Http\Controllers\MasterData\DataCustomerController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Data Customer Routes
|--------------------------------------------------------------------------
|
| CRUD master data customer.
|
*/

Route::middleware(['auth'])->group(function () {
    Route::get('/data-customer', [DataCustomerController::class, 'index'])
        ->name('data-customer.index');

    Route::post('/data-customer', [DataCustomerController::class, 'store'])
        ->name('data-customer.store');

    Route::get('/data-customer/{dataCustomer}', [DataCustomerController::class, 'show'])
        ->name('data-customer.show');

    Route::put('/data-customer/{dataCustomer}', [DataCustomerController::class, 'update'])
        ->name('data-customer.update');

    Route::patch('/data-customer/{dataCustomer}', [DataCustomerController::class, 'update'])
        ->name('data-customer.patch');

    Route::delete('/data-customer/{dataCustomer}', [DataCustomerController::class, 'destroy'])
        ->name('data-customer.destroy');
});
