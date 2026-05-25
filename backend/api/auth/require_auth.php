<?php

declare(strict_types=1);

require_once __DIR__ . '/../../index.php';
require_once __DIR__ . '/../../database.php';
require_once __DIR__ . '/session.php';

function requireAuthUser(): array
{
    // 1. Safely extract the Authorization header across different server environments
    $header = $_SERVER['HTTP_AUTHORIZATION'] 
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] 
        ?? (function_exists('apache_request_headers') ? (apache_request_headers()['Authorization'] ?? '') : '');

    // 2. \S+ ensures we capture at least one non-whitespace character, removing the need for a secondary empty check
    if (!preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
        jsonResponse(401, [
            'success' => false,
            'message' => 'Missing or malformed token.',
        ]);
        exit;
    }

    $token = $matches[1];
    $db = getDatabaseConnection();
    $user = validateSessionToken($db, $token);

    if (!$user) {
        jsonResponse(401, [
            'success' => false,
            'message' => 'Invalid or expired token.',
        ]);
        exit;
    }

    return [$db, $user];
}