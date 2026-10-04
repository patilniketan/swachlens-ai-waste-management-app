# Connecting to the backend

The API address is set in one place: `API_HOST_OVERRIDE` in [`src/constants/config.ts`](src/constants/config.ts).

| Where the app runs | What to set |
| --- | --- |
| Android emulator | leave `null` (uses `http://10.0.2.2:5000`) |
| iOS simulator | leave `null` (uses `http://localhost:5000`) |
| Physical phone | `'http://<your-computer-LAN-IP>:5000'` |

For a physical phone (the usual setup for a live demo):

1. Put the phone and the computer running the backend on the same Wi-Fi network.
2. Find the computer's LAN IP: run `ipconfig` on Windows and read the "IPv4 Address" (for example `192.168.1.42`), or run `ipconfig getifaddr en0` on macOS.
3. Set `const API_HOST_OVERRIDE: string | null = 'http://192.168.1.42:5000';` and reload the app.
4. Check that the phone can reach the backend by opening `http://192.168.1.42:5000/api/health` in the phone's browser. If it doesn't load, allow Node.js through the Windows firewall on Private networks.

**Demoing away from the seeded area?** Set `DEMO_LOCATION_OVERRIDE` in the same file (e.g. `{ latitude: 28.5689, longitude: 77.239 }`, Central Market) so reports land next to the seeded data. The report screen then shows "Demo location in use". Leave it `null` for real use. See [DEMO.md](../DEMO.md).

Debug builds allow plain HTTP. Release builds on Android also need `android:usesCleartextTraffic="true"` on `<application>` (see `android-manifest-additions.xml`).

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Android: regenerating the `android/` folder

`android/` is not in this repository. Generate a fresh one with the same React Native version and the same app name, then copy it in. Don't hand-write the native project.

1. From the repository root, generate a throwaway project. The name must be `MobileApp` (it matches `app.json`, which the native code registers):

   ```sh
   npx @react-native-community/cli@20.2.0 init MobileApp --version 0.87.0 --directory rn-template-tmp --skip-install --skip-git-init
   ```

2. Copy its `android/` folder into this app, then delete the temp project:

   ```sh
   cp -r rn-template-tmp/android MobileApp/android
   ```

   ```sh
   rm -rf rn-template-tmp
   ```

   In PowerShell: `Copy-Item -Recurse rn-template-tmp\android MobileApp\android`, then `Remove-Item -Recurse -Force rn-template-tmp`.

3. Edit `MobileApp/android/app/src/main/AndroidManifest.xml` using [`android-manifest-additions.xml`](android-manifest-additions.xml):
   - Add the `INTERNET`, `CAMERA`, `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` permissions above `<application>`.
   - Add `<uses-feature android:name="android.hardware.camera" android:required="false" />`.
   - **Required for the Nearby map:** add a Google Maps API key `<meta-data>` inside `<application>`. `react-native-maps` uses Google Maps on Android and the app crashes when that screen opens without a key.

4. From `MobileApp/`, install and run:

   ```sh
   npm install
   ```

   ```sh
   npm run android
   ```

The template's package id is `com.mobileapp`. To use another one, add `--package-name com.your.id` to the `init` command.

## Plain HTTP to a LAN backend

The demo backend is plain `http://<LAN-IP>:5000`. Android blocks cleartext HTTP by default:

- **Debug builds** (`npm run android`) already allow it; the React Native template enables cleartext for the debug variant.
- **Release builds** need it enabled explicitly: add `android:usesCleartextTraffic="true"` to `<application>`, or, more narrowly, a `network_security_config` that allows cleartext only for your backend's IP.
- With a USB-connected phone you can skip the LAN IP: run `adb reverse tcp:5000 tcp:5000` and set `API_HOST_OVERRIDE` to `'http://localhost:5000'`.

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
