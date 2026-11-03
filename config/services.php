<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    /*
    | Microsoft 365 (Entra ID): inicio de sesión (SSO) y envío de correo con Microsoft Graph.
    | Registra la app en https://entra.microsoft.com (Registros de aplicaciones) y define
    | MICROSOFT_REDIRECT_URI = {APP_URL}/auth/microsoft/callback.
    */
    'microsoft' => [
        'client_id' => env('MICROSOFT_CLIENT_ID'),
        'client_secret' => env('MICROSOFT_CLIENT_SECRET'),
        // ID (GUID) o dominio de TU organización. Evita 'common': permite cuentas de cualquier tenant.
        'tenant' => env('MICROSOFT_TENANT_ID', 'common'),
        'redirect' => env('MICROSOFT_REDIRECT_URI'),
        // Opcional: dominios de correo permitidos, separados por coma (ej. "heimtech.mx,defynia.mx").
        'allowed_domains' => array_filter(array_map('trim', explode(',', (string) env('MICROSOFT_ALLOWED_DOMAINS', '')))),
        'scopes' => ['openid', 'profile', 'email', 'offline_access', 'User.Read', 'Mail.Send'],
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
