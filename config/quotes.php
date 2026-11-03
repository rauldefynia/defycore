<?php

return [
    // Datos de la empresa dueña del sistema: respaldo cuando la cotización no trae emisor completo.
    'brand' => [
        'name' => env('QUOTE_BRAND_NAME', 'Defynia'),
        'rfc' => env('QUOTE_BRAND_RFC', ''),
        'address' => env('QUOTE_BRAND_ADDRESS', ''),
        'zip' => env('QUOTE_BRAND_ZIP', ''),
        'city' => env('QUOTE_BRAND_CITY', ''),
        'state' => env('QUOTE_BRAND_STATE', ''),
        'country' => env('QUOTE_BRAND_COUNTRY', 'México'),
        'phone' => env('QUOTE_BRAND_PHONE', ''),
        'email' => env('QUOTE_BRAND_EMAIL', ''),
        'website' => env('QUOTE_BRAND_WEBSITE', ''),
    ],
];
