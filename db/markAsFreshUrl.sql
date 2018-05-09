update products
set looked_at = false,
needs_recheck = false,
investigating = false
where id = $1