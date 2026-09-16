insert into departments (name, abbreviation) values
  ('Computer Science', 'CS'),
  ('Biology', 'BIO'),
  ('Psychology', 'PSY'),
  ('Chemistry', 'CHEM'),
  ('Physics', 'PHY'),
  ('Mathematics', 'MATH')
on conflict (name) do nothing;
