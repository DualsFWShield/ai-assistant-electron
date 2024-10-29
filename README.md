# AI Assistant Electron

## Features

1. #### Change assistant (GPT, Copilot, Mistral, more soon)
2. #### Custom CSS themes
3. #### Fixed the disconnection of the different AIs
4. #### Added functions: Next page, Previous page and Inspect
5. #### Removed Session and Streamer mode

| OS | Location of folder for CSS themes |
|---|---|
| Windows	| `C:\Users\{username}\AppData\Roaming\chatgpt-electron` |
| macOS	| `/Users/{username}/Library/Application Support/chatgpt-electron` |
| Linux	| `/home/{username}/.config/chatgpt-electron` |

## Requirements

- [NodeJS](https://nodejs.org) v20 or +

## Installation

### Generate package
```sh
npm i
npm run package
```
This will create a folder (ie: `out/chatgpt-electron-linux-x64`) which contains the executable file for your system.

You can directly run `out/chatgpt-electron-linux-x64/chatgpt-electron` or you may want to use it in a "widget":

### Use on Windows

1. Move the executable folder `out/chatgpt-electron-win32-x64` anywhere you like it

2. Run `chatgpt-electron.exe` and enjoy!

### Use on MacOS

1. Move the executable folder `out/chatgpt-electron-darwin-arm64` anywhere you like it

2. Run `chatgpt-electron.app` and enjoy!

### Use on Linux

1. Move the executable folder `out/chatgpt-electron-linux-x64` anywhere you like it

2. run `chatgpt-electron-linux-x64/chatgpt-electron` and enjoy!

## Credits

This was made by [Axel Andaroth (aka Pirate)](https://anda.ninja) and DualsFWShield.