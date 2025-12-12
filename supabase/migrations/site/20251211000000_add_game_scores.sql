-- Create a generic game scores table for multiple games
-- This table allows storing scores for different games by using a game_id text identifier
-- It also includes a metadata column for game-specific extra data

create table if not exists public.game_scores (
    id uuid not null default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    game_id text not null, -- e.g. '404_fishing', 'snake', etc.
    score integer not null,
    metadata jsonb default '{}'::jsonb, -- Store extra game stats like 'fish_caught', 'level', etc.
    created_at timestamptz default now(),
    
    constraint game_scores_pkey primary key (id)
);

-- Index for efficient leaderboard lookups per game
create index if not exists game_scores_game_id_score_idx on public.game_scores (game_id, score desc);
create index if not exists game_scores_user_id_idx on public.game_scores (user_id);

-- Enable RLS
alter table public.game_scores enable row level security;

-- Policies

-- Everyone can view scores (public leaderboards)
create policy "Game scores are viewable by everyone"
    on public.game_scores for select
    using (true);

-- Authenticated users can insert their own scores
create policy "Users can insert their own scores"
    on public.game_scores for insert
    with check (auth.uid() = user_id);

-- Optional: Prevent users from updating past scores (immutable history) or allow if correcting metadata
-- For high scores usually we just insert new records. Let's allow insert only for now.
