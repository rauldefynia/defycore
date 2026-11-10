<?php

return [

    /*
    | Proxies / gateways / balanceadores de confianza (los que reenvían la petición
    | y por eso aparecen como REMOTE_ADDR). Lista separada por comas de IPs o CIDR,
    | "*" para confiar en todos (sólo si el servidor NO es accesible directamente),
    | o vacío para no confiar en ninguno.
    | Ej.: TRUSTED_PROXIES=10.0.0.1,192.168.0.0/24
    */
    'trusted_proxies' => env('TRUSTED_PROXIES', '*'),

    /*
    | Cabeceras con la IP original del cliente, en orden de prioridad. Sólo se leen
    | cuando la petición llega desde un proxy de confianza.
    */
    'client_ip_headers' => [
        'CF-Connecting-IP',   // Cloudflare
        'True-Client-IP',     // Akamai / Cloudflare Enterprise
        'X-Real-IP',          // nginx
        'X-Forwarded-For',    // estándar de facto (cadena cliente, proxy1, proxy2...)
    ],

];
