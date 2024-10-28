// main.js
// ChatGPT Electron
// by Andaroth
// https://github.com/Andaroth/ai-assistant-electron

const availableAIs = [
  {
    label: "ChatGPT",
    url: 'https://chat.openai.com'
  },
  {
    label: "Copilot",
    url: 'https://copilot.microsoft.com/'
  },
  {
    label: "MistralAI",
    url: 'https://chat.mistral.ai/chat'
  },
  {
    label: "Claude",
    url: 'https://claude.ai/new'
  },
  {
    label: "Gemini",
    url: 'https://gemini.google.com/app?hl=fr'
  },
];

const { Menu, app, BrowserWindow, session } = require('electron');
const prompt = require('electron-prompt');

const fs = require('fs');
const path = require('path');

let win;
let userSettings;

const isMac = process.platform === "darwin";

const defaultSettings = {
  theme: "default.css",
  streamer: false,
  assistant: "ChatGPT",
  activeSession: 'default',
};

const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');
const sessionFile = path.join(userDataPath, 'sessions.json');

function changeAssistant(label, url, save = true, killCookies = false) {
  if (killCookies) {
    win.webContents.session.clearStorageData({ storages: ['cookies'] });
  }
  win.loadURL(url);
  if (save) {
    let currentSettings = Object.assign({}, userSettings || loadUserPreferences());
    const mutateConfig = Object.assign(currentSettings, { assistant: label });
    userSettings = mutateConfig;
    fs.writeFileSync(configPath, JSON.stringify(userSettings), 'utf-8');
  }
}

function loadUserPreferences() {
  if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, 'utf-8');
    userSettings = JSON.parse(configFile);
    return userSettings;
  } else {
    fs.writeFileSync(configPath, JSON.stringify(defaultSettings));
    return loadUserPreferences();
  }
}

function changeUserTheme(name, reload = false) {
  let currentSettings = Object.assign({}, userSettings || loadUserPreferences());
  const mutateConfig = Object.assign(currentSettings, { theme: name });
  userSettings = mutateConfig;
  fs.writeFileSync(configPath, JSON.stringify(userSettings), 'utf-8');
  const cssFile = path.join(userDataPath, name);
  if (fs.existsSync(cssFile)) {
    const cssContent = fs.readFileSync(cssFile, 'utf8');
    win.webContents.insertCSS(cssContent);
  } else {
    fs.writeFileSync(cssFile, "");
    win.reload();
  }
  if (reload) win.reload();
}

function toggleStreamer() {
  let currentSettings = Object.assign({}, userSettings || loadUserPreferences());
  const mutateConfig = Object.assign(currentSettings, { streamer: !currentSettings.streamer });
  userSettings = mutateConfig;
  fs.writeFileSync(configPath, JSON.stringify(userSettings), 'utf-8');
  win.reload();
}

function fetchThemes() {
  const cssFiles = fs.readdirSync(userDataPath)
    .filter(file => path.extname(file) === '.css')
    .map(label => label);
  return cssFiles || ["default.css"];
}

function getSessions() {
  if (fs.existsSync(sessionFile)) {
    const sessions = JSON.parse(fs.readFileSync(sessionFile));
    return sessions || {};
  } else {
    fs.writeFileSync(sessionFile, '{}', 'utf-8');
    return getSessions();
  }
}

function getSessionsNames() {
  return Object.keys(getSessions() || {}) || [];
}

function removeSession(name) {
  const mutableSession = getSessions() || {};
  if (mutableSession[name]) {
    delete mutableSession[name];
    fs.writeFileSync(sessionFile, JSON.stringify(mutableSession), 'utf-8');
    setTimeout(() => win.reload(), 1000);
  }
}

function storeSession(name, session) {
  if (Object.keys(session).length) {
    const mutableSession = getSessions() || {};
    session.cookies.get({}).then((cookies) => {
      mutableSession[name] = { cookies };
      fs.writeFileSync(sessionFile, JSON.stringify(mutableSession), 'utf-8');
    });
  }
}

function loadSession(name, session) {
  const existingSessions = getSessions();
  const cookies = existingSessions[name]?.cookies || [];
  session.clearStorageData();
  cookies.forEach((cookie) => {
    const url = `https://${cookie.domain.replace(/^\./, '')}`;
    if (cookie.name.startsWith('__Secure-')) cookie.secure = true;
    if (cookie.name.startsWith('__Host-')) {
      cookie.secure = true;
      cookie.path = '/';
      delete cookie.domain;
      delete cookie.sameSite;
    }
    session.cookies.set({
      url,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      expirationDate: cookie.expirationDate
    }).catch(console.error);
  });
  win.reload();
}

function initializeDefaultSession() {
  const sessions = getSessions();
  if (!sessions.default) {
    storeSession('default', session.defaultSession);
  }
  loadSession('default', session.defaultSession);
}

function generateMenu() {
  const sessionMenuTemplate = [
    ...(isMac ? [{
      label: app.name,
      submenu: [{ role: 'quit' }]
    }] : []),
    ...(isMac ? [{
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    }] : []),
    {
      label: "Change AI",
      submenu: availableAIs.map(({ label, url }) => ({
        label,
        type: "radio",
        checked: (userSettings.assistant || defaultSettings.assistant) === label,
        click() {
          changeAssistant(label, url, true);
        }
      })),
    },
    {
      label: `Sessions${userSettings.streamer ? '' : ' (Active: ' + (userSettings.activeSession || 'default') + ')'}`,
      submenu: [
        ...getSessionsNames().map((name) => ({
          label: name,
          type: "radio",
          checked: userSettings.activeSession === name,
          click() {
            userSettings.activeSession = name;
            fs.writeFileSync(configPath, JSON.stringify(userSettings), 'utf-8');
            loadSession(name, session.defaultSession);
          }
        })),
        { type: "separator" },
        {
          label: "Save Current Session",
          click: async () => {
            const ask = () => {
              prompt({
                title: 'Saving Current Session',
                label: 'Please choose a name:',
                inputAttrs: { type: 'text' },
                type: 'input'
              }).then((text) => {
                if (text) {
                  storeSession(text, session.defaultSession);
                  userSettings.activeSession = text;
                  fs.writeFileSync(configPath, JSON.stringify(userSettings), 'utf-8');
                } else ask();
              }).catch(console.error);
            };
            ask();
          }
        },
        {
          label: "Delete A Session",
          click: async () => {
            const ask = () => {
              prompt({
                title: 'Delete A Session',
                label: 'Enter the EXACT NAME to remove:',
                inputAttrs: { type: 'text' },
                type: 'input'
              }).then((text) => {
                if (text) removeSession(text);
                else ask();
              }).catch(console.error);
            };
            ask();
          }
        }
      ]
    },
    {
      label: 'Theme',
      submenu: fetchThemes().map(str => ({
        label: str,
        click() {
          changeUserTheme(str, true);
        }
      })),
    },
    {
      label: 'Options',
      submenu: [
        {
          label: "Streamer mode",
          type: "checkbox",
          checked: loadUserPreferences().streamer,
          click() {
            toggleStreamer();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(sessionMenuTemplate);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: false,
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      webviewTag: true,
      session: session.defaultSession
    }
  });

  loadUserPreferences();
  initializeDefaultSession();
  generateMenu();

  const label = userSettings.assistant || defaultSettings.assistant;
  const { url } = availableAIs.find(ai => ai.label === label);
  changeAssistant(label, url, false);

  win.webContents.on('did-finish-load', () => {
    generateMenu();
    changeUserTheme(userSettings.theme);

    if (userSettings.streamer) {
      const hideCssRules = [
        "body div.composer-parent div.draggable",
        "body div.threads div.main-content",
        "body div.text-xs > div",
      ];
      win.webContents.insertCSS(`${hideCssRules.join(", ")} { display: none !important; }`);
    }
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
