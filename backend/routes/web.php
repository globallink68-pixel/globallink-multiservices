<?php

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\CmsController;
use App\Http\Controllers\Admin\MediaController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json(['name' => 'Global Link Multiservice API', 'phase' => 2]));
Route::prefix('api/admin')->group(function (): void {
    Route::get('/session', [AuthController::class, 'session'])->middleware('throttle:60,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,1');
    Route::middleware(['admin', 'throttle:120,1'])->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/dashboard', [CmsController::class, 'dashboard']);
        Route::get('/services', [CmsController::class, 'services']);
        Route::get('/services/{id}', [CmsController::class, 'service'])->whereNumber('id');
        Route::post('/services', [CmsController::class, 'saveService']);
        Route::put('/services/{id}', [CmsController::class, 'saveService'])->whereNumber('id');
        Route::patch('/services/{id}/publication', [CmsController::class, 'publication'])->whereNumber('id');
        foreach (['categories' => 'Category', 'providers' => 'Provider', 'faqs' => 'Faq'] as $path => $type) {
            Route::get('/'.$path, [CmsController::class, $path]);
            Route::post('/'.$path, [CmsController::class, 'save'.$type]);
            Route::put('/'.$path.'/{id}', [CmsController::class, 'save'.$type])->whereNumber('id');
        }
        Route::get('/settings', [CmsController::class, 'settings']);
        Route::put('/settings', [CmsController::class, 'saveSettings']);
        Route::get('/audit-logs', [CmsController::class, 'audit']);
        Route::post('/media', [MediaController::class, 'upload']);
        Route::get('/media/{uuid}', [MediaController::class, 'show'])->whereUuid('uuid')->name('admin.media.show');
    });
});
