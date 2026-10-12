-- Reference data the app can't run without, so it ships with the schema rather than the demo seed.
INSERT INTO causes (slug, label, sort_order) VALUES
  ('animals', 'Animals', 1),
  ('climate', 'Climate', 2),
  ('food-security', 'Food security', 3),
  ('refugees', 'Refugees', 4),
  ('youth', 'Youth', 5),
  ('health', 'Health', 6),
  ('arts', 'Arts', 7)
ON CONFLICT (slug) DO NOTHING;
