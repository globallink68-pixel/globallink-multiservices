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
        RateLimiter::for('chat', fn (Request $request) => [
            Limit::perMinute(8)->by('chat-ip-minute:'.$request->ip()),
            Limit::perHour(40)->by('chat-ip-hour:'.$request->ip()),
            Limit::perMinute(6)->by('chat-session:'.hash('sha256', $request->session()->getId())),
        ]);
        RateLimiter::for('assistant-review', fn (Request $request) => [
            Limit::perMinute(10)->by('assistant-review-ip:'.$request->ip()),
            Limit::perHour(40)->by('assistant-review-hour:'.$request->ip()),
            Limit::perMinute(6)->by('assistant-review-session:'.hash('sha256', $request->session()->getId())),
        ]);
    }
}
