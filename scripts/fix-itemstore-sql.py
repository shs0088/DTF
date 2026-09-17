from pathlib import Path
import hashlib
import subprocess
import sys

path = Path("workers/item-store.ts")

expected_blob = "bb4f656ad486a8fd2cd21d64e112127f65e0bab6"

actual_blob = subprocess.check_output(["git", "hash-object", str(path)], text=True).strip()

print("PREIMAGE_BLOB:", actual_blob)

if actual_blob != expected_blob:
    raise SystemExit(f"Protected ItemStore preimage mismatch: {actual_blob}")

data = path.read_bytes()

old = (
    b"      INSERT OR IGNORE INTO admin_group_permissions "
    b"(group_id,resource,permission) SELECT "
    b"'group-main-admin',resource,permission FROM "
    b"(SELECT 'admin.dashboard' AS resource "
    b"UNION SELECT 'admin.orders' "
    b"UNION SELECT 'admin.production' "
    b"UNION SELECT 'admin.products.printify' "
    b"UNION SELECT 'admin.users' "
    b"UNION SELECT 'admin.user_groups' "
    b"UNION SELECT 'admin.settings') "
    b"CROSS JOIN "
    b"(SELECT 'access' AS permission UNION SELECT 'modify');"
)

new = (
    b"      INSERT OR IGNORE INTO admin_group_permissions "
    b"(group_id,resource,permission) VALUES "
    b"('group-main-admin','admin.dashboard','access'),"
    b"('group-main-admin','admin.dashboard','modify'),"
    b"('group-main-admin','admin.orders','access'),"
    b"('group-main-admin','admin.orders','modify'),"
    b"('group-main-admin','admin.production','access'),"
    b"('group-main-admin','admin.production','modify'),"
    b"('group-main-admin','admin.products.printify','access'),"
    b"('group-main-admin','admin.products.printify','modify'),"
    b"('group-main-admin','admin.users','access'),"
    b"('group-main-admin','admin.users','modify'),"
    b"('group-main-admin','admin.user_groups','access'),"
    b"('group-main-admin','admin.user_groups','modify'),"
    b"('group-main-admin','admin.settings','access'),"
    b"('group-main-admin','admin.settings','modify');"
)

count = data.count(old)

print("OLD_SQL_MATCH_COUNT:", count)

if count != 1:
    raise SystemExit(f"Expected exact failing SQL once; found {count}")

fixed = data.replace(old, new, 1)

if fixed.count(old) != 0:
    raise SystemExit("Old compound SQL still exists after patch")

if fixed.count(new) != 1:
    raise SystemExit("Replacement SQL verification failed")

path.write_bytes(fixed)

new_blob = subprocess.check_output(["git", "hash-object", str(path)], text=True).strip()

sha256 = hashlib.sha256(fixed).hexdigest()

print("NEW_ITEMSTORE_BLOB:", new_blob)
print("NEW_ITEMSTORE_SHA256:", sha256)
print("OLD_BYTES:", len(data))
print("NEW_BYTES:", len(fixed))
print("ITEMSTORE_SQL_PATCH: PASS")
