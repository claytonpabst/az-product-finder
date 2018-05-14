update products
set looked_at = true
where manufacturer ilike $1 and investigating = false