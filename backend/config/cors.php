<?php

// The website and API share one origin. Cross-origin access is deliberately disabled.
return [
    'paths' => ['api/*'],
    'allowed_methods' => [],
    'allowed_origins' => [],
    'allowed_origins_patterns' => [],
    'allowed_headers' => [],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
