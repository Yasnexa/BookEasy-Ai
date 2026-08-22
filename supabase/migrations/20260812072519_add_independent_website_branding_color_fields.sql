/*
# Add independent public-website branding color fields

1. New Columns (all on public.businesses, all text, all NOT NULL with sensible defaults)
- heading_color        — color for business name, section headings, service names, main titles
- body_color            — color for normal paragraph text, business description, service descriptions
- muted_color           — color for small descriptions, secondary information, metadata
- button_text_color     — color for normal button text
- button_hover_bg_color — button background color on hover
- button_hover_text_color — button text color on hover
- nav_text_color        — color for public website navigation links (About / Services / Team / Contact)
- card_text_color       — color for text inside service, team, and information cards

2. Backward compatibility
- Existing businesses that only have primary_color / secondary_color / accent_color
  receive accessible defaults for the new columns via the DEFAULT clause, so the
  public website renders correctly without any owner action.
- primary_color, secondary_color, accent_color remain unchanged and are still
  used for CTAs, secondary UI, and decorative accents respectively.

3. Security
- No RLS or policy changes. Existing owner and public SELECT policies cover the
  new columns automatically because they are column-agnostic.
- No writes are permitted by anonymous visitors.

4. Important Notes
- This migration is purely additive. No existing columns are dropped, renamed,
  or retyped, so existing branding values and all booking/auth logic are
  preserved.
- The defaults below are chosen to work for salons, barbers, beauty businesses,
  clinics, and other appointment businesses on a light background.
*/

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS heading_color text NOT NULL DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS body_color text NOT NULL DEFAULT '#334155',
  ADD COLUMN IF NOT EXISTS muted_color text NOT NULL DEFAULT '#64748b',
  ADD COLUMN IF NOT EXISTS button_text_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS button_hover_bg_color text NOT NULL DEFAULT '#0d9488',
  ADD COLUMN IF NOT EXISTS button_hover_text_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS nav_text_color text NOT NULL DEFAULT '#475569',
  ADD COLUMN IF NOT EXISTS card_text_color text NOT NULL DEFAULT '#1e293b';
