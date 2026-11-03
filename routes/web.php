<?php

use App\Http\Controllers\ClientController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OpportunityController;
use App\Http\Controllers\QuoteCatalogController;
use App\Http\Controllers\QuoteController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::prefix('oportunidades')->name('opportunities.')->group(function () {
        Route::get('/', [OpportunityController::class, 'index'])->name('index');
        Route::post('/', [OpportunityController::class, 'store'])->name('store');
        Route::get('{opportunity}', [OpportunityController::class, 'show'])->name('show');
        Route::put('{opportunity}', [OpportunityController::class, 'update'])->name('update');
        Route::delete('{opportunity}', [OpportunityController::class, 'destroy'])->name('destroy');
        Route::patch('{opportunity}/mover', [OpportunityController::class, 'move'])->name('move');
        Route::post('{opportunity}/cotizaciones', [OpportunityController::class, 'attachQuote'])->name('quotes.attach');
        Route::delete('{opportunity}/cotizaciones/{quote}', [OpportunityController::class, 'detachQuote'])->name('quotes.detach');
        Route::post('{opportunity}/cotizaciones/{quote}/vigente', [OpportunityController::class, 'activateQuote'])->name('quotes.activate');
    });

    Route::prefix('clientes')->name('clients.')->group(function () {
        Route::get('/', [ClientController::class, 'index'])->name('index');
        Route::get('nuevo', [ClientController::class, 'create'])->name('create');
        Route::post('/', [ClientController::class, 'store'])->name('store');
        Route::get('{client}/editar', [ClientController::class, 'edit'])->name('edit');
        Route::put('{client}', [ClientController::class, 'update'])->name('update');
        Route::delete('{client}', [ClientController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('cotizaciones')->name('quotes.')->group(function () {
        Route::get('/', [QuoteController::class, 'index'])->name('index');
        Route::get('nueva', [QuoteController::class, 'create'])->name('create');
        Route::post('/', [QuoteController::class, 'store'])->name('store');
        Route::post('calcular', [QuoteController::class, 'calculate'])->name('calculate');
        Route::post('clientes', [QuoteCatalogController::class, 'storeClient'])->name('clients.store');
        Route::post('emisores', [QuoteCatalogController::class, 'storeIssuer'])->name('issuers.store');
        Route::put('emisores/{issuer}', [QuoteCatalogController::class, 'updateIssuer'])->name('issuers.update');
        Route::delete('emisores/{issuer}', [QuoteCatalogController::class, 'destroyIssuer'])->name('issuers.destroy');
        Route::get('{quote}/editar', [QuoteController::class, 'edit'])->name('edit');
        Route::put('{quote}', [QuoteController::class, 'update'])->name('update');
        Route::delete('{quote}', [QuoteController::class, 'destroy'])->name('destroy');
        Route::post('{quote}/oportunidad', [OpportunityController::class, 'fromQuote'])->name('to-opportunity');
        Route::post('{quote}/duplicar', [QuoteController::class, 'duplicate'])->name('duplicate');
        Route::get('{quote}/pdf', [QuoteController::class, 'pdf'])->name('pdf');
    });
});

require __DIR__.'/settings.php';
