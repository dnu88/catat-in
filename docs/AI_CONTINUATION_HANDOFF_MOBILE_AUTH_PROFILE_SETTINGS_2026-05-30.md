# AI Continuation Handoff — Mobile Auth and Profile Settings

Date: 2026-05-30
Repo: `/home/Danu88/catat-in`
Mobile app: `apps/mobile`
Live domain: `https://kaswise.com`

## Latest Relevant Commit

```text
d77985e feat(mobile): add account profile settings
```

Latest live PWA bundle after deploy:

```text
/_expo/static/js/web/entry-2f7f128a493717421e1da111bc56f192.js
```

## User Goal

User reported and requested three follow-up improvements:

1. Google login works in regular Google Chrome browser, but fails when Kaswise is launched from **Add to Home Screen / installed PWA**.
2. Add account settings for changing password from Settings.
3. Add **Foto Profil & Pilih Avatar** to Settings without changing the existing Kaswise design system.
   - Must support automatic Light/Dark themes.
   - Must use semantic colors from existing design system, not hardcoded colors.
   - Must keep the Kaswise clean, modern, premium fintech, rounded-card, soft-elevation, mobile-first style.

## Implemented Behavior

### 1. Google login fixed for installed PWA / Add to Home Screen

Primary files:

```text
apps/mobile/src/lib/auth-redirects.ts
apps/mobile/app/(auth)/login.tsx
```

Problem:

- Google OAuth worked in normal Chrome browser.
- When launched as installed PWA from home screen, OAuth popup/session flow could fail because standalone PWA context handles browser auth sessions differently.

Added helper:

```ts
isStandaloneWebApp()
```

It detects standalone web app mode via:

```text
window.matchMedia('(display-mode: standalone)')
window.navigator.standalone
```

Redirect helper behavior changed from Expo URL-only redirect to web-origin-aware redirect:

```ts
getAuthCallbackRedirectTo()
getPasswordResetRedirectTo()
```

For web/PWA, these now resolve to absolute same-origin URLs:

```text
https://kaswise.com/callback
https://kaswise.com/reset-password
```

For native/non-web contexts, they still fall back to:

```ts
Linking.createURL(...)
```

Login flow now branches:

```text
Regular browser / native-compatible flow → WebBrowser.openAuthSessionAsync(...)
Installed standalone PWA → full-page window.location.assign(data.url)
```

Relevant logic:

```ts
const shouldUseFullRedirect = Platform.OS === 'web' && isStandaloneWebApp()

signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo,
    skipBrowserRedirect: !shouldUseFullRedirect,
  },
})

if (shouldUseFullRedirect) {
  window.location.assign(data.url)
  return
}
```

Expected result:

```text
kaswise.com in Chrome browser → Google login still works
Kaswise installed PWA from Home Screen → Google login redirects and returns to app correctly
```

### 2. Account Security / Change Password in Settings

Primary file:

```text
apps/mobile/app/(tabs)/settings.tsx
```

Added Settings section:

```text
Akun & Keamanan
```

Added row/action:

```text
Ubah Password
```

Behavior:

- User taps `Ubah Password`.
- Inline form expands inside Settings, not a separate modal.
- User enters:

```text
Password baru
Konfirmasi password
```

Validation:

```text
Minimum password length: 8 characters
Confirmation must match
```

Save calls:

```ts
supabase.auth.updateUser({ password: newPassword })
```

Success copy:

```text
Password berhasil diganti.
```

Failure copy:

```text
Gagal mengganti password. Login ulang jika diminta.
```

Design notes:

- Uses existing section card, navigation row, IconBubble, input, and primary button styling.
- Uses semantic theme colors:

```text
theme.colors.surface
theme.colors.mutedSurface
theme.colors.borderSoft
theme.colors.textPrimary
theme.colors.textMuted
theme.colors.buttonPrimaryBg
theme.colors.buttonPrimaryText
theme.colors.danger
```

### 3. Profile card updated in Settings

Primary file:

```text
apps/mobile/app/(tabs)/settings.tsx
```

Profile card now displays:

```text
avatar/foto bulat 68px di kiri
nama user
email user
text button: Ubah Foto Profil
```

Avatar priority:

```text
1. Uploaded profile photo from user_metadata.avatar_url
2. Selected default avatar from user_metadata.avatar_key
3. Initials placeholder from user name/email
```

Metadata read helper:

```ts
readProfileVisualMetadata(metadata)
```

Reads:

```text
avatar_url
picture
avatar_key
avatar_path
```

The `picture` fallback keeps compatibility with Google profile photos if Supabase/Google metadata provides it.

### 4. Profile photo bottom sheet

Primary file:

```text
apps/mobile/app/(tabs)/settings.tsx
```

When user taps:

```text
Ubah Foto Profil
```

Kaswise opens a bottom sheet with:

```text
Header:
- Ubah Foto Profil
- close button right side

Actions:
- Ambil Foto
- Galeri
- Hapus Foto

Section:
- Pilih Avatar

Tabs:
- Semua
- Pria
- Wanita
- Lainnya

Grid:
- 3 columns
- circular avatars
- approx. 88px

Footer:
- sticky full-width Simpan button
```

Bottom sheet design:

- Slide-up modal from bottom.
- Large rounded top corners.
- Soft elevation.
- Uses theme surface and border colors.
- No hardcoded brand colors in UI styling.
- Accent color comes from semantic Kaswise theme primary action color.

Action buttons use circular outline icon treatment with semantic accent:

```text
Ambil Foto → camera icon
Galeri → image icon
Hapus Foto → trash icon
```

### 5. Camera and gallery upload

Primary files:

```text
apps/mobile/app/(tabs)/settings.tsx
apps/mobile/package.json
pnpm-lock.yaml
```

Added dependency:

```text
expo-image-picker ~17.0.11
```

Supported actions:

```text
Ambil Foto → ImagePicker.launchCameraAsync(...)
Galeri → ImagePicker.launchImageLibraryAsync(...)
Hapus Foto → clears avatar_url and avatar_key
```

Image picker settings:

```ts
allowsEditing: true
aspect: [1, 1]
quality: 0.72
```

Upload behavior:

- Selected local image is converted to blob.
- Uploaded to Supabase Storage bucket:

```text
avatars
```

Path format:

```text
{user.id}/avatar-{timestamp}.{extension}
```

After upload, Settings updates user metadata:

```ts
supabase.auth.updateUser({
  data: {
    ...currentMetadata,
    avatar_url: nextPhotoUrl || null,
    avatar_path: nextAvatarPath || null,
    avatar_key: nextAvatarKey || null,
  },
})
```

If replacing/removing an old uploaded photo, old `avatar_path` is removed asynchronously from storage.

### 6. Default avatar picker

Primary file:

```text
apps/mobile/app/(tabs)/settings.tsx
```

Added preset avatar list:

```ts
PROFILE_AVATARS
```

Avatar categories:

```text
men
women
other
```

Tab filters:

```text
Semua
Pria
Wanita
Lainnya
```

Avatar variations include:

```text
casual
professional
glasses
hijab
cap
varied semantic backgrounds
```

The avatars are generated as inline SVG illustrations via:

```ts
ProfileAvatarIllustration
```

Visual direction:

```text
3D-ish clay style
semi-realistic but simple
modern
playful
clean
fintech-friendly
```

Selected state:

```text
accent border
a small check indicator at bottom-right
subtle elevation
```

Saving an avatar updates user metadata:

```text
avatar_key = selected avatar id
avatar_url = null
```

The profile card updates immediately after save.

### 7. New icon support

Primary file:

```text
apps/mobile/src/components/icons/kaswise-icons.tsx
```

Added icon names:

```text
camera
image
trash
check
close
```

These are used by the profile bottom sheet and selected-avatar indicator.

### 8. Avatar storage migration

New migration:

```text
supabase/migrations/202605300001_profile_avatars_storage.sql
```

Creates public Supabase Storage bucket:

```text
avatars
```

Bucket config:

```text
public: true
file_size_limit: 2MB
allowed_mime_types: image/jpeg, image/png, image/webp
```

Policies:

```text
avatars_select_public
avatars_insert_own
avatars_update_own
avatars_delete_own
```

Write/delete policies require the first folder segment to match authenticated user id:

```sql
auth.uid()::text = (storage.foldername(name))[1]
```

Migration was applied to linked live Supabase database with:

```bash
supabase db query --linked --file supabase/migrations/202605300001_profile_avatars_storage.sql
```

Live verification:

```text
id      public  file_size_limit
avatars true    2.097152e+06
```

## Important Files Changed

```text
apps/mobile/app/(auth)/login.tsx
apps/mobile/app/(tabs)/settings.tsx
apps/mobile/src/lib/auth-redirects.ts
apps/mobile/src/components/icons/kaswise-icons.tsx
apps/mobile/package.json
pnpm-lock.yaml
supabase/migrations/202605300001_profile_avatars_storage.sql
```

Tests updated:

```text
apps/mobile/__tests__/settings-screen.test.tsx
```

## Validation Run

Type check:

```bash
corepack pnpm --filter mobile type-check
```

Result:

```text
✅ passed
```

Targeted tests:

```bash
corepack pnpm --filter mobile test -- --runTestsByPath \
  __tests__/settings-screen.test.tsx \
  __tests__/brand-logo-screens.test.tsx \
  src/lib/__tests__/supabase.test.ts
```

Result:

```text
✅ 3 suites passed
✅ 13 tests passed
```

Full mobile test suite:

```bash
corepack pnpm --filter mobile test
```

Result:

```text
✅ 36 suites passed
✅ 239 tests passed
```

PWA export:

```bash
corepack pnpm --filter mobile export:pwa
```

Result:

```text
✅ Exported: dist
```

PWA deploy:

```bash
corepack pnpm --filter mobile deploy:pwa
```

Result:

```text
✅ Deployed mobile PWA dist to /home/Danu88/nginx-proxy-manager/placeholder
```

## Live Deployment State

Live bundle referenced by deployed `index.html`:

```text
entry-2f7f128a493717421e1da111bc56f192.js
```

Deploy target:

```text
/home/Danu88/nginx-proxy-manager/placeholder
```

Live domain:

```text
https://kaswise.com
```

## Manual QA Checklist

Recommended checks after deployment:

1. Open `https://kaswise.com` in regular Chrome and test Google login.
2. Open installed PWA from Home Screen and test Google login.
3. Go to Settings and verify profile card shows:

```text
avatar/foto
name
email
Ubah Foto Profil
```

4. Tap `Ubah Foto Profil`, verify bottom sheet opens.
5. Test avatar filter tabs:

```text
Semua / Pria / Wanita / Lainnya
```

6. Select an avatar, tap `Simpan`, verify profile card updates immediately.
7. Test `Hapus Foto`, verify profile card falls back to initials.
8. Test `Galeri` and/or `Ambil Foto` on a real device, verify uploaded photo appears.
9. Test Settings password update with mismatch and success cases.
10. Switch Light/Dark/System theme and verify profile UI adapts automatically.

## Known Notes / Follow-up

1. Installed PWA can cache old bundles. If Google login still uses old behavior, close the installed PWA fully and reopen it. If needed, uninstall and Add to Home Screen again.
2. Uploaded profile photos use public Supabase Storage URLs in the `avatars` bucket.
3. The avatar picker uses inline SVG default avatars. No external image assets are required.
4. Password changes rely on `supabase.auth.updateUser({ password })`. If Supabase requires recent login for a provider/session, user may need to sign in again.
5. For Google-only users, password update can still be attempted from Settings, but Supabase account policy/provider setup may affect behavior.
6. Future improvement: reuse the selected avatar/photo on Dashboard header (`home-avatar`) so Settings and Home profile visuals match.

## Git State

Committed and pushed:

```text
d77985e feat(mobile): add account profile settings
```
