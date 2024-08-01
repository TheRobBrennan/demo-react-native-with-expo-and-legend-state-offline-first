# Welcome

This project was initially cloned off the [repo](https://github.com/CallumHemsley/Offline-First-Expo-Demo-with-Legend-State) associated with the blog post from [How to build an offline-first app using Expo & Legend State](https://expo.dev/blog/offline-first-apps-with-expo-and-legend-state) - originally published on February 27th, 2024.

## Getting Started

Once you have cloned the repo to your development machine, all you need to do is install the dependencies and start Expo:

```sh
# Install dependencies
% npm install

# Start Expo
% npm start
> demo-react-native-with-expo-offline-first@0.0.0 start
> expo start

Starting project at /Users/xxxx/repos/demo-react-native-with-expo-and-legend-state-offline-first
Starting Metro Bundler
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █ ██▀▀█▀▄██ ▄▄▄▄▄ █
█ █   █ █  ▀█ ▀█▄▄█ █   █ █
█ █▄▄▄█ █▀  █▄▀▀▄██ █▄▄▄█ █
█▄▄▄▄▄▄▄█▄█ ▀▄█▄█▄█▄▄▄▄▄▄▄█
█▄▄██ ▄▄▀██▄█▄▀▄ ███ ▀▄▄ ▄█
█▀██   ▄██ ▄█▀██  ▀ █▄  ▀██
█  ▀ ▀▀▄▀ █▀▄▀█▄▀▄▀▄▀▀▄ ▀██
████▄█▀▄ █▄▀ ▄██▄▄▄█▄▀ ▀███
█▄▄▄█▄█▄▄  ▄█▄▀▄▄ ▄▄▄ ▀ ▄▄█
█ ▄▄▄▄▄ █▀▀ █▀█▀▀ █▄█ ▀▀▀▀█
█ █   █ █▄▄▀▄▀▄ █▄▄ ▄▄▀   █
█ █▄▄▄█ █▀▄▀ ▄ ▄▄██▄▀█▀▀ ██
█▄▄▄▄▄▄▄█▄█▄█▄▄█████▄▄▄▄▄▄█

› Metro waiting on exp://192.168.0.8:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Using Expo Go
› Press s │ switch to development build

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press j │ open debugger
› Press r │ reload app
› Press m │ toggle menu
› Press o │ open project code in your editor

› Press ? │ show all commands

Logs for your project will appear below. Press Ctrl+C to exit.
```

### OPTIONAL: Remote synchronization with Firebase Realtime Database

This demo showcases a very naïve implementation to demonstrate how a simple sync with the [Firebase Realtime Database](https://firebase.google.com/docs/database) might be implemented.

In practice, you SHOULD NOT SYNC using this method unless you want all the devices to be able to update and tweak data at will.

![IMAGE: Allow any device to update and sync expenses](https://cdn.sanity.io/images/siias52v/production/dd5324f5dbfe598ac815cb53e8ae8ef6276f0c6c-1095x961.png?w=1600&fit=max&auto=format)

> In a simple setup, when client A logs a new expense, it should automatically update for client B and C. Additionally, clients B and C need the ability to record expenses while offline, with these records syncing across all devices once they're back online.

#### Firebase configuration

Take a look at the example environment variables we need to declare in [.env.sample](./.env.example). Create a copy of this file as `.env` so we can update our environment variables without worrying about accidentally committing them to the repo.

```sh
# Copy the example environment variables file to one we will use with our app
% cp .env.example .env
```

Let's go to the Firebase console at [https://console.firebase.google.com](https://console.firebase.google.com) and create a new project.

I'm going to create a new Firebase project with the project name `legend-state-expo-rn-demo`.

As part of the project setup, we'll add Google Analytics because...well, why not? It's free and perhaps there might be some more we can explore with that later on.

Once you've clicked `Register app` you will be presented with most of the details you will need for your `.env` file.

Once you've created the project, you'll want to create the Firebase Realtime Database that you will define in your `.env` file for `EXPO_PUBLIC_FIREBASE_DATABASE_URL`.

For this demo and naïve implementation, let's allow anyone with access to the application to read and write to the expenses collection:

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "expenses": {
      "$expenseId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```
