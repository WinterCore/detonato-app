#!/usr/bin/env bash
#
# The landing page's direct downloads, since the app isn't on either store:
# a release APK, signed with the key android/keystore.properties names, and
# an unsigned IPA, which AltStore, SideStore or Sideloadly re-sign with the
# installer's own Apple ID. Writes landing/public/downloads/.
#
#   pnpm downloads
set -euo pipefail

app="$(cd "$(dirname "$0")/.." && pwd)"
out="$app/../landing/public/downloads"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

if [ ! -f "$app/android/keystore.properties" ]; then
  echo "android/keystore.properties is missing, so the APK would come out unsigned. See AGENTS.md › Native shells." >&2
  exit 1
fi

cd "$app"
pnpm build
pnpm exec cap sync

# Android: Gradle needs JDK 21; the system's is too new, so Android Studio's own.
(cd android && JAVA_HOME="${JDK21_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}" ./gradlew assembleRelease -q)

# iOS: a Release build for devices, unsigned, packed as an IPA (an app bundle in Payload/, zipped).
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphoneos \
  -destination 'generic/platform=iOS' -derivedDataPath "$work/ios" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" -quiet build
mkdir -p "$work/ipa/Payload"
cp -R "$work/ios/Build/Products/Release-iphoneos/App.app" "$work/ipa/Payload/"
(cd "$work/ipa" && zip -qry "$work/detonato.ipa" Payload)

mkdir -p "$out"
cp android/app/build/outputs/apk/release/app-release.apk "$out/detonato.apk"
cp "$work/detonato.ipa" "$out/detonato.ipa"
ls -la "$out"
