<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('public-catalogue', fn (Request $request) => Limit::perMinute(90)->by($request->ip()));
        RateLimiter::for('enquiries', fn (Request $request) => [
            Limit::perMinute(5)->by('enquiry-minute:'.$request->ip()),
            Limit::perHour(20)->by('enquiry-hour:'.$request->ip()),
        ]);
    }
}
