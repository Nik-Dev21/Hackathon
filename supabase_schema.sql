-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- News Topics Table
create table if not exists news_topics (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  topic text not null,
  headline text not null,
  ai_summary text,
  thumbnail_url text,
  published_date timestamp with time zone,
  source_count_left integer default 0,
  source_count_centre integer default 0,
  source_count_right integer default 0,
  left_emphasis text[] default '{}',
  right_emphasis text[] default '{}',
  common_ground text[] default '{}',
  key_points text[] default '{}',
  tags text[] default '{}',
  is_featured boolean default false
);

-- News Articles Table
create table if not exists news_articles (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  topic text,
  title text not null,
  url text not null,
  source text,
  source_bias text,
  published_date timestamp with time zone,
  thumbnail_url text,
  summary text
);

-- Saved Articles Table
create table if not exists saved_articles (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_email text not null,
  article_id uuid references news_articles(id) on delete cascade,
  unique(user_email, article_id)
);

-- Enable Row Level Security (RLS)
alter table news_topics enable row level security;
alter table news_articles enable row level security;
alter table saved_articles enable row level security;

-- Create policies (simplified for now, allow public read)
create policy "Public news topics are viewable by everyone"
  on news_topics for select
  using ( true );

create policy "Public news articles are viewable by everyone"
  on news_articles for select
  using ( true );

create policy "Users can view their own saved articles"
  on saved_articles for select
  using ( auth.uid()::text = user_email ); -- Note: simplified, usually map auth.uid() to a user table or use email directly if auth.email() is available

-- Allow authenticated users to insert saved articles
create policy "Users can insert their own saved articles"
  on saved_articles for insert
  with check ( auth.jwt() ->> 'email' = user_email );

create policy "Users can delete their own saved articles"
  on saved_articles for delete
  using ( auth.jwt() ->> 'email' = user_email );

-- MPs Table
create table if not exists mps (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  riding text,
  party text,
  province text,
  photo_url text,
  email text,
  phone text,
  openparliament_id text,
  openparliament_url text
);

-- Enable RLS for MPs
alter table mps enable row level security;

-- Allow public read access for MPs
create policy "Public MPs are viewable by everyone"
  on mps for select
  using ( true );

-- Bills Table
create table if not exists bills (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  bill_number text not null,
  title text not null,
  summary text,
  why_it_matters text,
  status text,
  introduced_date timestamp with time zone,
  historical_context text,
  party_positions jsonb default '{}'::jsonb,
  openparliament_url text,
  vote_summary jsonb default '{}'::jsonb
);

-- Enable RLS for Bills
alter table bills enable row level security;

-- Allow public read access for Bills
create policy "Public bills are viewable by everyone"
  on bills for select
  using ( true );

-- Tracked Bills Table
create table if not exists tracked_bills (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_email text not null,
  bill_id uuid references bills(id) on delete cascade,
  unique(user_email, bill_id)
);

alter table tracked_bills enable row level security;

create policy "Users can view their own tracked bills"
  on tracked_bills for select
  using ( auth.jwt() ->> 'email' = user_email );

create policy "Users can insert their own tracked bills"
  on tracked_bills for insert
  with check ( auth.jwt() ->> 'email' = user_email );

create policy "Users can delete their own tracked bills"
  on tracked_bills for delete
  using ( auth.jwt() ->> 'email' = user_email );
