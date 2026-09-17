# Dependencies to install

Run this from inside your existing `MobileApp/` React Native CLI project root
(this does NOT create a new project — it adds the packages this frontend needs
to your existing `package.json`):

```bash
npm install \
  @react-navigation/native \
  @react-navigation/native-stack \
  @react-navigation/bottom-tabs \
  react-native-screens \
  react-native-safe-area-context \
  @react-native-async-storage/async-storage \
  react-native-image-picker \
  @react-native-community/geolocation \
  react-native-permissions
```

Then, for iOS only (skip if you're targeting Android only for the hackathon demo):

```bash
cd ios && pod install && cd ..
```

## Why each package is here

| Package | Used for |
|---|---|
| `@react-navigation/native`, `native-stack`, `bottom-tabs` | App navigation — auth flow, bottom tabs, per-tab stacks |
| `react-native-screens`, `react-native-safe-area-context` | Required peer dependencies for React Navigation |
| `@react-native-async-storage/async-storage` | Persisting the JWT and cached user across app restarts |
| `react-native-image-picker` | "Take Photo" and "Choose from Gallery" on the Report Waste screen |
| `@react-native-community/geolocation` | Reading device GPS coordinates |
| `react-native-permissions` | Requesting/checking camera and location permissions at runtime |

No state-management library (Redux, MobX, etc.) was added — screen-level
`useState`/`useCallback` plus a small `AuthContext` are enough for this app's
scope, and it keeps dependencies minimal as requested.

## Android-specific setup for react-native-permissions

`react-native-permissions` requires enabling the permissions you use in
`android/app/build.gradle` under the `react` block (RN 0.71+ autolinks this
automatically in most cases; if you hit a build error referencing a missing
permission module, add):

```gradle
project.ext.react = [
  enableHermes: true
]
```

No extra gradle changes are needed for `ACCESS_FINE_LOCATION` / `CAMERA` —
those are handled by the manifest entries in `android-manifest-additions.xml`
plus the runtime `request()` calls already wired up in `src/utils/location.ts`
and `react-native-image-picker`'s own runtime camera permission prompt.
