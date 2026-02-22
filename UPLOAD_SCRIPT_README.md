# File Upload Script Deployment Guide

## Overview
The expense invoice upload functionality requires a PHP script to be hosted at `https://files.maroonsol.com/upload.php`.

## File Location
The PHP script is located at: `/upload.php` in the project root.

## Deployment Steps

1. **Upload the PHP script** to your server at `https://files.maroonsol.com/upload.php`

2. **Create the uploads directory** on the server:
   ```bash
   mkdir -p /path/to/files.maroonsol.com/uploads
   chmod 755 /path/to/files.maroonsol.com/uploads
   ```

3. **Configure PHP settings** (if needed):
   - Ensure `file_uploads` is enabled in `php.ini`
   - Set appropriate `upload_max_filesize` and `post_max_size` (default: 10MB)
   - Ensure `upload_tmp_dir` has write permissions

4. **Set proper permissions**:
   ```bash
   chmod 644 upload.php
   chmod 755 uploads/
   ```

5. **Test the upload endpoint**:
   ```bash
   curl -X POST -F "file=@test.pdf" https://files.maroonsol.com/upload.php
   ```

## Security Considerations

- The script validates file types (PDF only)
- File size is limited to 10MB
- Unique filenames are generated to prevent conflicts
- CORS headers are set for cross-origin requests
- Consider adding authentication/API key validation in production

## File Access

Uploaded files will be accessible at:
```
https://files.maroonsol.com/uploads/{filename}
```

## Configuration

You can modify these settings in `upload.php`:
- `$uploadDir`: Directory where files are stored
- `$maxFileSize`: Maximum file size (default: 10MB)
- `$allowedTypes`: Allowed MIME types (default: PDF only)
- `$baseUrl`: Base URL for file access

## Troubleshooting

- **403 Forbidden**: Check directory permissions
- **500 Internal Server Error**: Check PHP error logs
- **File not saving**: Verify `upload_tmp_dir` permissions
- **CORS errors**: Ensure CORS headers are properly set

