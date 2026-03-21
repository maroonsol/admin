# internalfiles.maroonsol.com upload

1. Copy `internalfiles-index.php` to your host as `index.php` (or any URL you configure).
2. Create a writable `storage` directory next to `index.php` (or change `$BASE_DIR` in the script).
3. Map the web server so files under `storage/` are served (e.g. `https://internalfiles.maroonsol.com/storage/...`).
4. **Admin `.env`:** `INTERNAL_FILES_UPLOAD_URL=https://internalfiles.maroonsol.com/index.php`

There is **no shared secret** in the script. If the upload URL is reachable from the public internet, anyone could POST files — use **firewall / nginx allowlist** (e.g. only your admin server IP) or HTTPS + private network.

## Folder layout (created by PHP)

- Monthly / quarterly filing:  
  `storage/client/{businessId}/accounts/GST/filling/{FY}/{MM|Qx}/`  
  Example: March 2026 → FY `2025-26`, month folder `03`.
- Registration: `.../accounts/GST/registration/`
- Amendment: `.../accounts/GST/amendment/`

## Existing services without `serviceCode`

After deploying the schema, backfill once (MySQL):

```sql
UPDATE services SET serviceCode = 'DOM' WHERE serviceType = 'DOMAIN' AND (serviceCode = '' OR serviceCode IS NULL);
UPDATE services SET serviceCode = 'VPS' WHERE serviceType = 'VPS' AND (serviceCode = '' OR serviceCode IS NULL);
UPDATE services SET serviceCode = 'WEB_HOST' WHERE serviceType = 'WEB_HOSTING' AND (serviceCode = '' OR serviceCode IS NULL);
UPDATE services SET serviceCode = 'DOM_EMAIL' WHERE serviceType = 'DOMAIN_EMAIL' AND (serviceCode = '' OR serviceCode IS NULL);
```
