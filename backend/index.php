<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function readJsonInput(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $payload = json_decode($raw, true);
    if (!is_array($payload)) {
        return [];
    }

    return $payload;
}

function jsonResponse(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}
