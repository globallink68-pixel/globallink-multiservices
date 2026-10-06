<?php

use App\Http\Controllers\PublicCatalogueController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:public-catalogue')->group(function (): void {
    Route::get('/site', [PublicCatalogueController::class, 'site'])->name('catalogue.site');
    Route::get('/services', [PublicCatalogueController::class, 'index'])->name('catalogue.index');
    Route::get('/services/{slug}', [PublicCatalogueController::class, 'show'])->where('slug', '[a-z0-9-]+')->name('catalogue.show');
});
