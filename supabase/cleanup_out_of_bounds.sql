-- Remove restaurants whose geocoded coordinates fall outside Barcelona.
--
-- Bounding box covers the city of Barcelona with a small margin
-- (lat 41.30–41.48, lon 2.03–2.25). Rows outside this box are almost
-- certainly geocoding mistakes (e.g. Nominatim matching a similarly
-- named street in another city/country).
--
-- Run the SELECT first to review what would be removed, then run the
-- DELETE once you're happy with the list. Deleting a restaurant cascades
-- to its menus and favorites (see schema.sql).

-- 1. Preview
select id, name, neighborhood, address, latitude, longitude
from public.restaurants
where latitude  not between 41.30 and 41.48
   or longitude not between 2.03  and 2.25
order by name;

-- 2. Delete (uncomment once the preview above looks correct)
-- delete from public.restaurants
-- where latitude  not between 41.30 and 41.48
--    or longitude not between 2.03  and 2.25;
