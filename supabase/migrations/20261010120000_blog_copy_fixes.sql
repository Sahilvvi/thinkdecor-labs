-- Blog copy fixes from the 7 Oct 2026 audit (TD-15, TD-39). Safe to re-run.
--
-- 1. Brand: "ThinkDecor" -> "Think Decor" in author, title, excerpt and body
--    (case-sensitive, so lowercase URLs/slugs such as /blog/thinkdecor-vs-... are untouched).
-- 2. Measuring: the two scan-to-plan posts read as if a working product exists, while the
--    homepage FAQ says "Not yet". Add an explicit status note and soften the "works today" claim.
--
-- Run:  npx supabase db query --linked -f supabase/migrations/20261010120000_blog_copy_fixes.sql

begin;

-- 1. Brand name ---------------------------------------------------------------
alter table public.blog_posts alter column author_name set default 'Think Decor';

update public.blog_posts
set author_name = 'Think Decor'
where author_name = 'ThinkDecor';

update public.blog_posts
set title   = replace(title,   'ThinkDecor', 'Think Decor'),
    excerpt = replace(excerpt, 'ThinkDecor', 'Think Decor'),
    content = replace(content, 'ThinkDecor', 'Think Decor')
where title ilike '%ThinkDecor%' or excerpt ilike '%ThinkDecor%' or content like '%ThinkDecor%';

-- 2. Scan-to-plan posts: one consistent status ----------------------------------
-- Soften the one sentence that says the pipeline "broadly works today".
update public.blog_posts
set content = replace(
  content,
  'even though the walkthrough-to-reconstruction pipeline broadly works today',
  'even though the walkthrough-to-reconstruction pipeline is still being built and tested'
)
where slug = 'four-minutes-scan-to-plan';

-- Prepend a status note to both posts (skipped if already present).
update public.blog_posts
set content = E'> **In development.** Room scanning and floor plans are not available in Think Decor yet. This article describes how we are designing it to work, and what we are still testing.\n\n' || content
where slug in ('four-minutes-scan-to-plan', 'floor-plans-from-a-phone-walkthrough')
  and content not like '> **In development.**%';

commit;

-- Check (run separately; only the last statement's rows print):
-- select slug, author_name, left(content, 60) as start from public.blog_posts
--   where slug in ('four-minutes-scan-to-plan','floor-plans-from-a-phone-walkthrough');
-- select count(*) as still_old_brand from public.blog_posts where author_name = 'ThinkDecor' or content like '%ThinkDecor%';
