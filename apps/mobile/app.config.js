module.exports = {
  name: 'commuter',
  slug: 'commuter',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'commuter',
  userInterfaceStyle: 'dark',
  backgroundColor: '#161412',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: 'com.commuter.app',
    infoPlist: {
      UIBackgroundModes: ['location', 'remote-notification', 'fetch'],
      NSCameraUsageDescription:
        'Allow Commuter to use the camera to scan QR codes for configuration import.',
      NSPhotoLibraryUsageDescription:
        'Allow Commuter to access your photos to attach images in Hermes chat.',
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
      },
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    softwareKeyboardLayoutMode: 'resize',
    package: 'com.commuter.app',
    googleServicesFile: './google-services.json',
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY,
      },
    },
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
      'android.permission.READ_CALENDAR',
      'android.permission.WRITE_CALENDAR',
      'android.permission.CAMERA',
      'android.permission.READ_MEDIA_IMAGES',
    ],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'expo-build-properties',
      {
        android: { usesCleartextTraffic: true },
        ios: { deploymentTarget: '16.4' },
      },
    ],
    'expo-router',
    'expo-updates',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      },
    ],
    [
      'expo-notifications',
      {
        color: '#208AEF',
        defaultChannel: 'default',
        enableBackgroundRemoteNotifications: true,
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow Commuter to track your location to notify you when you are near your stop.',
        locationAlwaysPermission:
          'Allow Commuter to track your location in the background to notify you near stops.',
        locationWhenInUsePermission:
          'Allow Commuter to access your location to show nearby stops.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    'expo-secure-store',
    'expo-sqlite',
    [
      'expo-maps',
      {
        requestLocationPermission: true,
      },
    ],
    'expo-camera',
    'expo-sharing',
    'expo-web-browser',
    'expo-font',
    'expo-image',
    [
      'expo-calendar',
      {
        calendarPermission:
          'Allow Commuter to access your calendar to add commute reminders and events.',
        remindersPermission:
          'Allow Commuter to access your reminders for commute alerts.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Commuter to access your photos to attach images in Hermes chat.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: 'c7514c8e-5f95-4018-bedb-1b8c7369c249',
    },
  },
  owner: 'radityaharya',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/c7514c8e-5f95-4018-bedb-1b8c7369c249',
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    requestHeaders: {
      'expo-channel-name': process.env.EAS_BUILD_PROFILE ?? 'production',
    },
  },
};
