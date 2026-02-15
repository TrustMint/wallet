
-- ==========================================
-- 1. CONFIGURATION & EXTENSIONS
-- ==========================================

create extension if not exists "uuid-ossp";

-- ==========================================
-- 2. TABLES DEFINITIONS
-- ==========================================

-- 2.1. PROFILES (Users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text not null,
  role text not null check (role in ('SENDER', 'COURIER', 'ADMIN')),
  status text default 'active' check (status in ('active', 'busy')),
  phone text unique,
  email text,
  city text default 'Москва',
  avatar_url text,
  rating numeric default 5.0,
  wallet_balance numeric default 0,
  commission_debt numeric default 0,
  location jsonb, -- { lat: number, lng: number, lastUpdated: number }
  push_token text,
  is_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- CRITICAL FOR TRACKING: Ensure full profile data (including new location) is sent on updates
alter table public.profiles replica identity full;

-- 2.2. ORDERS
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) not null,
  courier_id uuid references public.profiles(id),
  
  title text not null,
  description text,
  
  pickup_address text not null,
  delivery_address text not null,
  pickup_location jsonb, -- { lat: number, lng: number }
  delivery_location jsonb, -- { lat: number, lng: number }
  
  price numeric not null,
  weight text,
  
  status text not null default 'PENDING' check (status in ('PENDING', 'NEGOTIATING', 'ACCEPTED', 'PICKED_UP', 'DELIVERING', 'COMPLETED', 'CANCELLED')),
  payment_method text default 'card' check (payment_method in ('card', 'cash')),
  
  options text[] default '{}',
  counter_offers jsonb default '[]'::jsonb,
  
  is_reviewed boolean default false,
  cancellation_reason text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

-- CRITICAL FOR REALTIME: Ensure full row data is sent on updates/deletes
alter table public.orders replica identity full;

-- 2.3. REVIEWS
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) not null,
  author_id uuid references public.profiles(id) not null,
  target_id uuid references public.profiles(id) not null,
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2.4. SAVED ADDRESSES
create table if not exists public.saved_addresses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  address text not null,
  location jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2.5. TRANSACTIONS
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  order_id uuid references public.orders(id),
  amount numeric not null,
  type text not null check (type in ('income', 'commission_pay', 'withdrawal', 'penalty', 'refund')),
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2.6. MESSAGES (CHAT)
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  text text,
  image_url text,
  is_read boolean default false,
  metadata jsonb default '{}'::jsonb, -- Stores replyTo and other meta info
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Realtime for Messages
alter table public.messages replica identity full;

-- ==========================================
-- 3. INDEXES
-- ==========================================

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_sender_idx on public.orders (sender_id);
create index if not exists orders_courier_idx on public.orders (courier_id);
create index if not exists transactions_user_idx on public.transactions (user_id);
create index if not exists reviews_target_idx on public.reviews (target_id);
create index if not exists messages_order_idx on public.messages (order_id);

-- ==========================================
-- 4. RLS POLICIES
-- ==========================================

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;
alter table public.saved_addresses enable row level security;
alter table public.transactions enable row level security;
alter table public.messages enable row level security;

-- PROFILES
create policy "Public profiles are viewable by everyone" 
on public.profiles for select using ( true );

create policy "Users can insert their own profile" 
on public.profiles for insert with check ( auth.uid() = id );

create policy "Users can update their own profile" 
on public.profiles for update using ( auth.uid() = id );

-- ORDERS
create policy "Anyone can view available orders" 
on public.orders for select using ( true );

create policy "Authenticated users can create orders" 
on public.orders for insert with check ( auth.role() = 'authenticated' );

create policy "Participants can update orders" 
on public.orders for update using ( 
  auth.role() = 'authenticated' AND (
    auth.uid() = sender_id OR 
    auth.uid() = courier_id OR 
    courier_id is null
  )
);

-- REVIEWS
create policy "Reviews are viewable by everyone" 
on public.reviews for select using ( true );

create policy "Authenticated users can create reviews" 
on public.reviews for insert with check ( auth.role() = 'authenticated' );

-- OTHER
create policy "Users can manage own addresses" 
on public.saved_addresses for all using ( auth.uid() = user_id );

create policy "Users can view own transactions" 
on public.transactions for select using ( auth.uid() = user_id );

-- MESSAGES (CHAT SECURITY)
create policy "Участники заказа могут читать сообщения"
on public.messages for select
using (
  auth.uid() in (
    select sender_id from public.orders where id = order_id
    union
    select courier_id from public.orders where id = order_id
  )
);

create policy "Участники могут отправлять сообщения"
on public.messages for insert
with check (
  auth.uid() = sender_id 
  AND 
  auth.uid() in (
    select sender_id from public.orders where id = order_id
    union
    select courier_id from public.orders where id = order_id
  )
);

-- ==========================================
-- 5. REALTIME
-- ==========================================

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'reviews') then
    alter publication supabase_realtime add table public.reviews;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- ==========================================
-- 6. STORAGE (Avatars & Chat Images)
-- ==========================================

-- AVATARS
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
on storage.objects for select using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar"
on storage.objects for insert with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

create policy "Users can update their own avatar"
on storage.objects for update using ( bucket_id = 'avatars' and auth.uid() = owner );

-- CHAT IMAGES
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "Chat images are publicly accessible"
on storage.objects for select using ( bucket_id = 'chat-images' );

create policy "Authenticated users can upload chat images"
on storage.objects for insert with check ( bucket_id = 'chat-images' and auth.role() = 'authenticated' );

-- ==========================================
-- 7. TRIGGERS (AUTOMATION)
-- ==========================================

-- 7.1. Auto-update 'updated_at'
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- 7.2. Handle User Creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role, email, avatar_url, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Пользователь'),
    coalesce(new.raw_user_meta_data->>'role', 'SENDER'),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    coalesce(new.raw_user_meta_data->>'phone', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7.3. Handle Order Completion
create or replace function public.handle_order_completion()
returns trigger as $$
declare
  commission_amount numeric;
begin
  if new.status = 'COMPLETED' and old.status != 'COMPLETED' then
    if new.courier_id is null then
      return new;
    end if;

    commission_amount := floor(new.price * 0.10);

    update public.profiles
    set 
      wallet_balance = wallet_balance + new.price,
      commission_debt = commission_debt + commission_amount
    where id = new.courier_id;

    insert into public.transactions (user_id, order_id, amount, type, description)
    values (new.courier_id, new.id, new.price, 'income', 'Оплата за заказ ' || new.title);

  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_completed on public.orders;
create trigger on_order_completed
  after update on public.orders
  for each row execute procedure public.handle_order_completion();

-- 7.4. Systematic Bargain Cancellation
create or replace function public.handle_clear_offers_on_accept()
returns trigger as $$
begin
  if new.status in ('ACCEPTED', 'PICKED_UP', 'DELIVERING', 'COMPLETED', 'CANCELLED') then
    new.counter_offers := '[]'::jsonb;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_order_accept_clear_offers on public.orders;
create trigger on_order_accept_clear_offers
  before update on public.orders
  for each row
  execute procedure public.handle_clear_offers_on_accept();

notify pgrst, 'reload schema';
