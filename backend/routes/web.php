<?php

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\CmsController;
use App\Http\Controllers\Admin\EnquiryController as AdminEnquiryController;
use App\Http\Controllers\Admin\MediaController;
use App\Http\Controllers\EnquiryController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json(['name' => 'Global Link Multiservice API', 'phase' => 3]));
Route::get('/api/enquiries/session', [EnquiryController::class, 'session'])->middleware('throttle:30,1');
Route::post('/api/enquiries', [EnquiryController::class, 'store'])->middleware('throttle:enquiries');
Route::prefix('api/admin')->group(function (): void {
    Route::get('/session', [AuthController::class, 'session'])->middleware('throttle:60,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,1');
    Route::middleware(['admin', 'throttle:120,1'])->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/dashboard', [CmsController::class, 'dashboard']);
        Route::get('/enquiries', [AdminEnquiryController::class, 'index']);
        Route::get('/enquiries/{reference}', [AdminEnquiryController::class, 'show'])->where('reference', 'GL-[0-9A-HJKMNP-TV-Z]{26}');
        Route::patch('/enquiries/{reference}/status', [AdminEnquiryController::class, 'status'])->where('reference', 'GL-[0-9A-HJKMNP-TV-Z]{26}');
        Route::post('/enquiries/{reference}/notes', [AdminEnquiryController::class, 'note'])->where('reference', 'GL-[0-9A-HJKMNP-TV-Z]{26}');
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
