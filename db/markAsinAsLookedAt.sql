update products
set looked_at = true,
investigating = false
where id = $1
