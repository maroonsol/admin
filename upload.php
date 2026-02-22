<?php
/**
 * File Upload Handler for Expense Invoices
 * 
 * This script should be hosted at: https://files.maroonsol.com/upload.php
 * 
 * Features:
 * - Accepts only PDF files
 * - Validates file type and size
 * - Generates unique filenames
 * - Saves files securely
 * - Returns file URL for viewing/downloading
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Configuration
$uploadDir = __DIR__ . '/uploads/';
$maxFileSize = 10 * 1024 * 1024; // 10MB
$allowedTypes = ['application/pdf'];

// Create upload directory if it doesn't exist
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Check if file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded or upload error']);
    exit();
}

$file = $_FILES['file'];

// Validate file size
if ($file['size'] > $maxFileSize) {
    http_response_code(400);
    echo json_encode(['error' => 'File size exceeds maximum allowed size (10MB)']);
    exit();
}

// Validate file type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Only PDF files are allowed.']);
    exit();
}

// Additional validation: Check file extension
$fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if ($fileExtension !== 'pdf') {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file extension. Only PDF files are allowed.']);
    exit();
}

// Generate unique filename
$uniqueId = uniqid() . '_' . time();
$filename = $uniqueId . '.' . $fileExtension;
$filepath = $uploadDir . $filename;

// Move uploaded file to destination
if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
    exit();
}

// Generate file URL
$baseUrl = 'https://files.maroonsol.com';
$fileUrl = $baseUrl . '/uploads/' . $filename;

// Return success response
echo json_encode([
    'success' => true,
    'url' => $fileUrl,
    'fileUrl' => $fileUrl, // Alias for compatibility
    'filename' => $filename,
    'originalName' => $file['name'],
    'size' => $file['size'],
    'mimeType' => $mimeType
]);
?>

