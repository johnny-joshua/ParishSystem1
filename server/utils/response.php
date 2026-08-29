<?php

function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function successResponse($data = null, string $message = 'Success', int $status = 200): void
{
    jsonResponse([
        'success' => true,
        'message' => $message,
        'data' => $data,
    ], $status);
}

function errorResponse(string $message, int $status = 400, $errors = null): void
{
    jsonResponse([
        'success' => false,
        'message' => $message,
        'errors' => $errors,
    ], $status);
}
