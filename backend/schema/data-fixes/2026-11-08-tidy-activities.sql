-- Activity clean-up: hide 35 duplicates and non-activities (reasons: docs/activities-review.md).
-- Run in Hostinger phpMyAdmin -> your site database -> SQL. Nothing is deleted: every record stays in the admin panel
-- (Activities) and can be published again with one click. Run step 1 first to see exactly what will change.

-- Step 1 (preview, changes nothing): lists the 35 activities that will be hidden.
SELECT name, published FROM activities WHERE name IN (
  'Target Archery',
  'Fun Archery Games',
  'Archery for All Skill Levels',
  'Night Camping',
  'Outdoor Camping',
  'Tent Pitching',
  'Bonfire',
  'Campfire Games',
  'Morning Trek',
  'Group Games',
  'Interactive Team Games',
  'Icebreaker Activities',
  'Energizer Activities',
  'Team Sports',
  'Organised Tournaments',
  'Cricket Nets',
  'Clay Modelling',
  'Pottery Wheel',
  'Animal Figurines',
  'DIY Planters',
  'Lanterns and Tealight Holders',
  'Name Plates',
  'Traditional Designs',
  'Dairy Farming Experience',
  'Cow Feeding',
  'Animal Care',
  'Milking Experience',
  'Seed Ball Making',
  'Herb Garden Making',
  'Composting',
  'Vermicomposting',
  'Soil Exploration',
  'Swimming Pool',
  'Chess',
  'Carom'
) ORDER BY name;

-- Step 2 (apply): hides them from the website.
UPDATE activities SET published = 0, updated_at = UTC_TIMESTAMP() WHERE published = 1 AND name IN (
  'Target Archery',
  'Fun Archery Games',
  'Archery for All Skill Levels',
  'Night Camping',
  'Outdoor Camping',
  'Tent Pitching',
  'Bonfire',
  'Campfire Games',
  'Morning Trek',
  'Group Games',
  'Interactive Team Games',
  'Icebreaker Activities',
  'Energizer Activities',
  'Team Sports',
  'Organised Tournaments',
  'Cricket Nets',
  'Clay Modelling',
  'Pottery Wheel',
  'Animal Figurines',
  'DIY Planters',
  'Lanterns and Tealight Holders',
  'Name Plates',
  'Traditional Designs',
  'Dairy Farming Experience',
  'Cow Feeding',
  'Animal Care',
  'Milking Experience',
  'Seed Ball Making',
  'Herb Garden Making',
  'Composting',
  'Vermicomposting',
  'Soil Exploration',
  'Swimming Pool',
  'Chess',
  'Carom'
);

-- Undo (only if needed): publish them again.
-- UPDATE activities SET published = 1, updated_at = UTC_TIMESTAMP() WHERE name IN ( ...same list... );
