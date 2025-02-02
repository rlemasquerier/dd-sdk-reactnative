## Overview

Enable React Native Crash Reporting and Error Tracking to get comprehensive crash reports and error trends with Real User Monitoring. With this feature, you can access:

-   Aggregated React Native crash dashboards and attributes
-   Symbolicated React Native (JavaScript and native iOS or Android) crash reports
-   Trend analysis with React Native Error Tracking

In order to symbolicate your stack traces, manually upload your mapping files into Datadog.

Your crash reports appear in [**Error Tracking**][1].

## Setup

If you have not set up the RUM React Native SDK yet, follow the [in-app setup instructions][2] or see the [React Native RUM setup documentation][3].

### Add Crash Reporting

Update your initialization snippet to enable native JavaScript crash reporting:

```javascript
const config = new DdSdkReactNativeConfiguration(
    '<CLIENT_TOKEN>',
    '<ENVIRONMENT_NAME>',
    '<RUM_APPLICATION_ID>',
    true,
    true,
    true // enable javascript crash reporting
);
config.nativeCrashReportEnabled = true; // enable native crash reporting
```

## Limitations

<div class="alert alert-warning"><p>
Datadog can accept uploads up to 50MB.
</p></div>

To compute the size of your source maps and bundle, run this command:

```shell
npx react-native bundle \
  --dev false \
  --platform ios \
  --entry-file index.js \
  --bundle-output build/main.jsbundle \
  --sourcemap-output build/main.jsbundle.map

sourcemapsize=$(wc -c build/main.jsbundle.map | awk '{print $1}')
bundlesize=$(wc -c build/main.jsbundle | awk '{print $1}')
payloadsize=$(($sourcemapsize + $bundlesize))

echo "Size of source maps and bundle is $(($payloadsize / 1000000))MB"
```

## Symbolicate crash reports

In order to make your application's size smaller, its code is minified when it is built for release. To link errors to your actual code, you need to upload the following symbolication files:

-   JavaScript source map for your iOS JavaScript bundle
-   JavaScript source map for your Android JavaScript bundle
-   dSYMs for your iOS native code
-   Proguard mapping files if you have enabled code obfuscation for your Android native code

To set your project up to send the symbolication files automatically, run `npx datadog-react-native-wizard`.

See the wizard [official documentation][13] for options.

## Alternatives to `datadog-react-native-wizard`

If using `datadog-react-native-wizard` did not succeed or if you don't want to upload your symbolication files automatically on each release, follow the next steps to symbolicate crash reports.

### Upload JavaScript source maps on iOS builds

You need to install `@datadog/datadog-ci` as a dev dependency to your project:

```bash
yarn add -D @datadog/datadog-ci
# or
npm install --save-dev @datadog/datadog-ci
```

#### Automatically on each release build (React Native >= 0.69)

Manually uploading your source maps on every release build takes time and is prone to errors. Datadog recommends automatically sending your source maps every time you run a release build.

Create a script file named `datadog-sourcemaps.sh` at the root of your project containing the following:

```shell
#!/bin/sh
set -e

# If the build runs from XCode, we cannot use yarn.
# Check first which yarn executable is appropriate
package_manager_test_command="bin" # both `yarn bin` and `npm bin` are valid commands
test_and_set_package_manager_bin()
{
  $(echo $1 $package_manager_test_command) && export PACKAGE_MANAGER_BIN=$1
}

test_and_set_package_manager_bin "yarn" || # Replace yarn by npm if you use npm
test_and_set_package_manager_bin "/opt/homebrew/bin/node /opt/homebrew/bin/yarn" || # Replace yarn by npm if you use npm
echo "package manager not found"

REACT_NATIVE_XCODE="node_modules/react-native/scripts/react-native-xcode.sh"
DATADOG_XCODE="$(echo $PACKAGE_MANAGER_BIN) datadog-ci react-native xcode"

/bin/sh -c "$DATADOG_XCODE $REACT_NATIVE_XCODE"
```

This script finds the best way to run the `yarn datadog-ci react-native xcode` command:

-   `yarn` can be used if you use a tool like [fastlane][9] or a service like [Bitrise][10] or [AppCenter][11] to build your app
-   `/opt/homebrew/bin/node /opt/homebrew/bin/yarn` must be used on Mac if you run the release build from XCode directly

It runs this command that takes care of uploading the source maps with all the correct parameters. For more information, see the [datadog-ci documentation][12].

Open your `.xcworkspace` with XCode, then select your project > Build Phases > Bundle React Native code and images. Edit the script to look like the following:

```shell
set -e
WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
# Add these two lines
REACT_NATIVE_XCODE="./datadog-sourcemaps.sh"
export SOURCEMAP_FILE=./main.jsbundle.map

# Edit the next line
/bin/sh -c "$WITH_ENVIRONMENT $REACT_NATIVE_XCODE"
```

For the upload to work, you need to provide your Datadog API key. If you use a command-line tool or an external service, you can specify it as a `DATADOG_API_KEY` environment variable. If you run the build from XCode, create a `datadog-ci.json` file at the root of your project containing the API key:

```json
{
    "apiKey": "<YOUR_DATADOG_API_KEY>"
}
```

You can also specify the Datadog site (such as `datadoghq.eu`) as a `DATADOG_SITE` environment variable, or as a `datadogSite` key in your `datadog-ci.json` file.

#### Automatically on each release build (React Native < 0.69)

Open your `.xcworkspace` with XCode, then select your project > Build Phases > Bundle React Native code and images. Edit the script to look like the following:

```shell
set -e

export NODE_BINARY=node
# If the build runs from XCode, we cannot use ${this.packageManager}.
# Therefore we need to check first which ${this.packageManager} command is appropriate
package_manager_test_command="bin" # both `yarn bin` and `npm bin` are valid commands
test_and_set_package_manager_bin()
{
  $(echo $1 $package_manager_test_command) && export PACKAGE_MANAGER_BIN=$1
}

test_and_set_package_manager_bin "yarn" || # Replace yarn by npm if you use npm
test_and_set_package_manager_bin "/opt/homebrew/bin/node /opt/homebrew/bin/yarn" || # Replace yarn by npm if you use npm
echo "package manager not found"

export SOURCEMAP_FILE=./build/main.jsbundle.map
$(echo $PACKAGE_MANAGER_BIN datadog-ci react-native xcode)
```

This script finds the best way to run the `yarn datadog-ci react-native xcode` command:

-   `yarn` can be used if you use a tool like [fastlane][9] or a service like [Bitrise][10] or [AppCenter][11] to build your app
-   `/opt/homebrew/bin/node /opt/homebrew/bin/yarn` must be used on Mac if you run the release build from XCode directly

It runs this command that takes care of uploading the source maps with all the correct parameters. For more information, see the [datadog-ci documentation][12].

For the upload to work, you need to provide your Datadog API key. If you use a command-line tool or an external service, you can specify it as a `DATADOG_API_KEY` environment variable. If you run the build from XCode, create a `datadog-ci.json` file at the root of your project containing the API key:

```json
{
    "apiKey": "<YOUR_DATADOG_API_KEY>"
}
```

You can also specify the Datadog site (such as `datadoghq.eu`) as a `DATADOG_SITE` environment variable, or as a `datadogSite` key in your `datadog-ci.json` file.

#### Manually on each build (without Hermes)

To output a source map, you need to edit the XCode build phase "Bundle React Native Code and Images".

1. Open the `ios/YourAppName.xcworkspace` file in XCode.
2. In the left panel, select the "File" icon and click on your project.
3. In the central panel, select "Build Phases" from the top bar.

Change the script by adding this after the `set -e` line:

```bash
set -e
export SOURCEMAP_FILE=./build/main.jsbundle.map # <- add this line to output sourcemaps
# leave the rest of the script unchanged
```

Moving forward, you can find the source maps for your bundle on every iOS build.

To find the path to your bundle file from XCode, display the Report Navigator on XCode and filter by `BUNDLE_FILE` for its location.

The usual location is `~/Library/Developer/Xcode/DerivedData/YourAppName-verylonghash/Build/Intermediates.noindex/ArchiveIntermediates/YourAppName/BuildProductsPath/Release-iphoneos/main.jsbundle`, where `YourAppName` is the name of your app, and `verylonghash` is a 28 letter hash.

To upload the source maps, run this from your React Native project:

```bash
export DATADOG_API_KEY= # fill with your API key
export SERVICE=com.myapp # replace by your service name
export VERSION=1.0.0 # replace by the version of your app in XCode
export BUILD=100 # replace by the build of your app in XCode
export BUNDLE_PATH= # fill with your bundle path

yarn datadog-ci react-native upload --platform ios --service $SERVICE --bundle $BUNDLE_PATH --sourcemap ./build/main.jsbundle.map --release-version $VERSION --build-version $BUILD
```

#### Manually on each build (with Hermes)

There is currently a bug in React Native that generates an incorrect source map when using Hermes.

To resolve this, you need to add more lines **at the very end** of the build phase to generate a correct source map file.

Edit your build phase like so:

```bash
set -e
export SOURCEMAP_FILE=./build/main.jsbundle.map # <- add this line to output sourcemaps

# keep the rest of the script unchanged

# add these lines to compose the packager and compiler sourcemaps into one file
REACT_NATIVE_DIR=../node_modules/react-native
source "$REACT_NATIVE_DIR/scripts/find-node.sh"
source "$REACT_NATIVE_DIR/scripts/node-binary.sh"
"$NODE_BINARY" "$REACT_NATIVE_DIR/scripts/compose-source-maps.js" "$CONFIGURATION_BUILD_DIR/main.jsbundle.map" "$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/main.jsbundle.map" -o "../$SOURCEMAP_FILE"
```

To upload the source map, run this from your React Native project root:

```bash
export DATADOG_API_KEY= # fill with your API key
export SERVICE=com.myapp # replace by your service name
export VERSION=1.0.0 # replace by the version of your app in XCode
export BUILD=100 # replace by the build of your app in XCode
export BUNDLE_PATH= # fill with your bundle path

yarn datadog-ci react-native upload --platform ios --service $SERVICE --bundle $BUNDLE_PATH --sourcemap ./build/main.jsbundle.map --release-version $VERSION --build-version $BUILD
```

### Upload JavaScript source maps on Android builds

#### Automatically on each release build

In your `android/app/build.gradle` file, add the following after the `apply from: "../../node_modules/react-native/react.gradle"` line:

```groovy
apply from: "../../node_modules/@datadog/mobile-react-native/datadog-sourcemaps.gradle"
```

For the upload to work, you need to provide your Datadog API key. You can specify it as a `DATADOG_API_KEY` environment variable, or create a `datadog-ci.json` file at the root of your project containing the API key:

```json
{
    "apiKey": "<YOUR_DATADOG_API_KEY>"
}
```

You can also specify the Datadog site (such as `datadoghq.eu`) as a `DATADOG_SITE` environment variable, or as a `datadogSite` key in your `datadog-ci.json` file.

#### Manually on each build

On Android, the bundle file is located at `android/app/build/generated/assets/react/release/index.android.bundle` and the source map file is located at `android/app/build/generated/sourcemaps/react/release/index.android.bundle.map`. If your application has more comprehensive variants, replace `release` by your variant's name in the paths.

After running your build, upload your source map by running this from your React Native project root:

```bash
export DATADOG_API_KEY= # fill with your API key
export SERVICE=com.myapp # replace by your service name
export VERSION=1.0.0 # replace by the versionName from android/app/build.gradle
export BUILD=100 # replace by the versionCode from android/app/build.gradle
export BUNDLE_PATH=android/app/build/generated/assets/react/release/index.android.bundle
export SOURCEMAP_PATH=android/app/build/generated/sourcemaps/react/release/index.android.bundle.map

yarn datadog-ci react-native upload --platform android --service $SERVICE --bundle $BUNDLE_PATH --sourcemap $SOURCEMAP_PATH --release-version $VERSION --build-version $BUILD
```

### Upload iOS dSYM files

#### Manually on each build

For more information, see the [iOS Crash Reporting and Error Tracking documentation][4].

### Upload Android Proguard mapping files

First, ensure that Proguard minification is enabled on your project. By default, this is not enabled on React Native projects.

For more information, see [the React Native Proguard documentation][5].

If you are still unsure, you can see if running `(cd android && ./gradlew tasks --all) | grep minifyReleaseWithR8` returns anything. If so, minification is enabled.

#### Manually on each build

In your `android/app/build.gradle` file, add the plugin and configure it **at the very top of the file**:

```groovy
plugins {
    id("com.datadoghq.dd-sdk-android-gradle-plugin") version "1.5.0"
}

datadog {
    checkProjectDependencies = "none" // this is needed in any case for React Native projects
}
```

For the upload to work, you need to provide your Datadog API key. You can specify it as a `DATADOG_API_KEY` environment variable, or create a `datadog-ci.json` file at the root of your project containing the API key:

```json
{
    "apiKey": "<YOUR_DATADOG_API_KEY>"
}
```

You can also specify the Datadog site (such as `datadoghq.eu`) as a `DATADOG_SITE` environment variable, or as a `datadogSite` key in your `datadog-ci.json` file.
For more information, see the [Datadog Android SDK Gradle Plugin][6].

To run the plugin after a build run `(cd android && ./gradlew app:uploadMappingRelease)`.

#### Automate the upload on each build

Install the plugin like in the previous step.

Find the loop on `applicationVariants` in the `android/app/build.gradle` file. It should look like `applicationVariants.all { variant ->`.

Inside the loop, add the following snippet:

```groovy
        if (project.tasks.findByName("minify${variant.name.capitalize()}WithR8")) {
            tasks["minify${variant.name.capitalize()}WithR8"].finalizedBy { tasks["uploadMapping${variant.name.capitalize()}"] }
        }
```

### Verify crash reports

To verify your React Native Crash Reporting and Error Tracking configuration, you can install a package like the [`react-native-crash-tester`][7] to crash your app from the native or JavaScript side.

## Further reading

{{< partial name="whats-next/whats-next.html" >}}

[1]: https://app.datadoghq.com/rum/error-tracking
[2]: https://app.datadoghq.com/rum/application/create
[3]: https://docs.datadoghq.com/real_user_monitoring/reactnative/
[4]: https://docs.datadoghq.com/real_user_monitoring/ios/crash_reporting/?tabs=cocoapods#symbolicate-crash-reports
[5]: https://reactnative.dev/docs/signed-apk-android#enabling-proguard-to-reduce-the-size-of-the-apk-optional
[6]: https://github.com/datadog/dd-sdk-android-gradle-plugin
[7]: https://github.com/cwhenderson20/react-native-crash-tester
[9]: https://fastlane.tools/
[10]: https://appcenter.ms/
[11]: https://www.bitrise.io/
[12]: https://github.com/DataDog/datadog-ci/tree/master/src/commands/react-native#xcode
[13]: https://github.com/DataDog/datadog-react-native-wizard
