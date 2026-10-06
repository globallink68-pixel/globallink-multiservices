<?php

return [
    // Only operator-verified proxy IPs/CIDRs; never a wildcard or REMOTE_ADDR.
    'proxies' => array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', ''))), fn (string $address): bool => (bool) filter_var(explode('/', $address)[0], FILTER_VALIDATE_IP))),
];
