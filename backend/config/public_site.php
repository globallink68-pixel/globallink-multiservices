<?php

return [
    'url' => env('APP_ENV') === 'production' ? env('APP_URL') : env('FRONTEND_URL', env('APP_URL', 'http://localhost')),
    'build_path' => base_path('../frontend/dist'),
];
