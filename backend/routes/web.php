<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['name' => 'Global Link Multiservice API', 'phase' => 1]);
});
