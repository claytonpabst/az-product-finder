select * from products
where looked_at = false
and investigating = false
order by ranking asc
limit 20