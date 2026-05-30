# AI Continuation Handoff — Mobile Profile Visuals, Dashboard Avatar, and Preferences

Date: 2026-05-30
Repo: `/home/Danu88/catat-in`
Mobile app: `apps/mobile`
Live domain: `https://kaswise.com`

## Latest Relevant Commits

```text
6f992a3 fix(mobile): auto hide profile photo success
74f1c88 fix(mobile): persist profile visual preference
46bd4ff fix(mobile): show saved profile visual on dashboard
633845b fix(mobile): persist app preferences and improve avatar contrast
```

Latest live PWA bundle after deploy:

```text
/_expo/static/js/web/entry-017cde22f805335d7280abca0f0facb3.js
```

## User Goal

User requested final polish around Settings and Dashboard profile behavior:

1. After changing profile photo/avatar, the success text should appear only temporarily and disappear automatically.
2. When user changes profile photo/avatar, logs out, then logs in again, the app should keep the latest selected visual and not fall back to the default/provider picture.
3. Dashboard avatar above the hero card should use the same profile photo/avatar as Settings instead of showing initials like `DB`.
4. Dashboard avatar background/frame should be more contrasty so the avatar/photo remains visible.
5. Selected app language and theme should persist after the app is closed and reopened.

## Implemented Behavior

### 1. Temporary profile photo success message

Primary file:

```text
apps/mobile/app/(tabs)/settings.tsx
```

Success copy:

```text
Foto profil tersimpan.
Profile photo saved.
```

Now auto-hides after:

```ts
const PROFILE_MESSAGE_AUTO_HIDE_MS = 3000;
```

Added timer ref and helpers:

```ts
profileMessageTimerRef
clearProfileMessageTimer()
showTemporaryProfileSuccess(message)
```

Behavior notes:

- Timer clears if user opens the profile sheet again.
- Timer clears before saving another profile visual.
- Timer is cleaned up on unmount.
- Auto-hide only clears the same success message, so it should not accidentally clear newer/error messages.

### 2. Persist latest profile visual across logout/login

Primary file:

```text
apps/mobile/app/(tabs)/settings.tsx
```

Profile visual metadata now stores explicit user preference:

```text
avatar_url
avatar_path
avatar_key
profile_visual_mode: photo | avatar | none
profile_visual_updated_at
```

Important behavior:

- If user chooses uploaded photo:
  ```text
  profile_visual_mode = photo
  avatar_url = uploaded public URL
  avatar_key = null
  ```
- If user chooses preset avatar:
  ```text
  profile_visual_mode = avatar
  avatar_key = selected preset id
  avatar_url = null
  ```
- If user removes profile visual:
  ```text
  profile_visual_mode = none
  avatar_url = null
  avatar_key = null
  ```

This prevents Supabase/Google provider metadata such as `picture` from overriding the user’s latest selected avatar on the next login.

### 3. Shared profile avatar component/helpers

New shared file:

```text
apps/mobile/src/components/profile/ProfileAvatar.tsx
```

Moved/shared profile avatar logic so Settings and Dashboard use the same source:

```ts
PROFILE_AVATARS
AVATAR_FILTERS
ProfileAvatarIllustration
readProfileVisualMetadata(...)
colorWithAlpha(...)
```

This avoids Settings and Dashboard drifting in avatar rendering or metadata interpretation.

### 4. Dashboard avatar now matches Settings

Primary file:

```text
apps/mobile/app/(tabs)/index.tsx
```

Dashboard now reads Supabase auth metadata via:

```ts
readProfileVisualMetadata(metadata)
```

Avatar priority on Dashboard:

```text
1. Uploaded profile photo (`avatar_url`) when `profile_visual_mode = photo`
2. Selected preset avatar (`avatar_key`) when `profile_visual_mode = avatar`
3. Initials fallback from name/email
```

Added states:

```ts
profilePhotoUrl
profileAvatarKey
```

Added dashboard rendering:

```tsx
<Image testID="home-avatar-image" source={{ uri: profilePhotoUrl }} />
<ProfileAvatarIllustration preset={selectedProfileAvatar} />
```

Important test IDs:

```text
home-avatar
home-avatar-image
```

### 5. Dashboard avatar contrast improved

Primary file:

```text
apps/mobile/app/(tabs)/index.tsx
```

Avatar frame changed from a small brand-color circle to a stronger, higher-contrast frame:

```text
width/height: 36 → 40
borderRadius: 18 → 20
backgroundColor: theme.colors.surfaceElevated
borderWidth: 2
borderColor: semantic contrast by theme mode
```

Photo/avatar content now renders at 34px inside the 40px frame.

Design intent:

- Keep premium rounded-card / soft-elevation feel.
- Avoid neon/brand background washing out illustrated avatars.
- Use semantic theme colors, not fixed visual styling.

### 6. Language preference persistence

Primary file:

```text
apps/mobile/src/i18n/i18n-context.tsx
```

Language is now persisted in AsyncStorage:

```text
kaswise:language-preference
```

Added validation helper:

```ts
isLanguage(value)
```

Behavior:

- Default remains Indonesian (`id`) if no stored value exists.
- On provider mount, app loads stored language.
- On `setLanguage(...)`, app updates React state and writes AsyncStorage.

### 7. Theme preference persistence verified

Primary file:

```text
apps/mobile/src/theme/theme-context.tsx
```

Theme persistence already existed via:

```text
kaswise:theme-preference
```

This round added test coverage to confirm selected theme is restored after app reopen.

Behavior:

- Supports:
  ```text
  system
  light
  dark
  ```
- Stored preference is loaded from AsyncStorage on provider mount.
- Invalid stored values are ignored.

## Tests Updated

Primary test files:

```text
apps/mobile/__tests__/settings-screen.test.tsx
apps/mobile/__tests__/tabs-index.test.tsx
```

Added/updated coverage:

1. Profile photo success message auto-hides after 3 seconds.
2. Last selected avatar stays after logout/login even if provider `picture` exists.
3. Dashboard uses saved Settings preset avatar instead of initials.
4. Dashboard uses saved Settings uploaded photo via `home-avatar-image`.
5. Dashboard avatar contrast/frame style is verified.
6. Language and theme preferences are written to AsyncStorage and restored after remount/app reopen.

## Validation Performed

Latest validation after the final preference/avatar polish:

```bash
corepack pnpm --filter mobile type-check
corepack pnpm --filter mobile test -- --runTestsByPath __tests__/settings-screen.test.tsx __tests__/tabs-index.test.tsx
corepack pnpm --filter mobile test
corepack pnpm --filter mobile export:pwa
corepack pnpm --filter mobile deploy:pwa
```

Results:

```text
type-check ✅
settings + dashboard tests ✅ 15 passed
full Jest ✅ 36 suites, 244 tests
export:pwa ✅
deploy:pwa ✅
```

Latest live bundle:

```text
entry-017cde22f805335d7280abca0f0facb3.js
```

## Manual QA Checklist

Recommended quick manual checks on `https://kaswise.com` and installed PWA:

1. Settings → change profile photo from gallery/camera.
2. Confirm success message appears, then disappears automatically after ~3 seconds.
3. Logout and login again.
4. Confirm Settings still shows latest selected profile visual.
5. Confirm Dashboard top-right avatar matches Settings.
6. Switch Settings language to English, close/reopen app, confirm English persists.
7. Switch theme to Dark/Light, close/reopen app, confirm theme persists.
8. Confirm dashboard avatar frame remains visible in Light and Dark modes.

## Important Files

```text
apps/mobile/app/(tabs)/settings.tsx
apps/mobile/app/(tabs)/index.tsx
apps/mobile/src/components/profile/ProfileAvatar.tsx
apps/mobile/src/i18n/i18n-context.tsx
apps/mobile/src/theme/theme-context.tsx
apps/mobile/__tests__/settings-screen.test.tsx
apps/mobile/__tests__/tabs-index.test.tsx
```

## Notes for Future AI Continuation

- Settings and Dashboard now share profile avatar definitions via `src/components/profile/ProfileAvatar.tsx`; avoid duplicating avatar metadata logic back into screen files.
- `profile_visual_mode` is important. Without it, Google/provider `picture` can override the user-selected avatar during future login sessions.
- Theme persistence was already implemented; current changes mainly added language persistence and tests proving both preferences survive remount/reopen.
- Keep profile and preference UI using semantic theme tokens.
- If adding profile avatar to more surfaces later, reuse `readProfileVisualMetadata(...)` and `ProfileAvatarIllustration` from the shared file.
