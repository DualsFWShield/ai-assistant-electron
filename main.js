const { Menu, app, BrowserWindow, session } = require('electron');
const prompt = require('electron-prompt');

const fs = require('fs');
const path = require('path');

let win;
let userSettings;

const isMac = process.platform === "darwin";
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');
const sessionFile = path.join(userDataPath, 'sessions.json');

const availableAIs = [
  { label: "ChatGPT", url: 'https://chat.openai.com' },
  { label: "Copilot", url: 'https://copilot.microsoft.com/' },
  { label: "MistralAI", url: 'https://chat.mistral.ai/chat' },
  { label: "Claude", url: 'https://claude.ai/new' },
  { label: "Gemini", url: 'https://gemini.google.com/app?hl=fr' },
];

const defaultSettings = {
  theme: "default.css",
  streamer: false,
  assistant: "ChatGPT",
};

// Charger les préférences utilisateur ou les valeurs par défaut
function loadUserPreferences() {
  if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, 'utf-8');
    userSettings = JSON.parse(configFile);
    return userSettings;
  } else {
    fs.writeFileSync(configPath, JSON.stringify(defaultSettings));
    return defaultSettings;
  }
}

// Charger les cookies de session pour chaque assistant sauvegardé
function loadSession(name, session) {
  const existingSessions = getSessions();
  const cookies = existingSessions[name]?.cookies || [];
  session.clearStorageData();
  cookies.forEach((cookie) => {
    const url = `https://${cookie.domain.replace(/^\./, '')}`;
    session.cookies.set({
      url,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      expirationDate: cookie.expirationDate
    }).catch((error) => {
      console.error('Erreur lors du chargement du cookie :', error);
    });
  });
}

// Sauvegarder la session (cookies) pour chaque assistant utilisé
function storeSession(name, session) {
  session.cookies.get({}).then((cookies) => {
    const sessions = getSessions();
    sessions[name] = { cookies };
    fs.writeFileSync(sessionFile, JSON.stringify(sessions), 'utf-8');
  }).catch(console.error);
}

// Obtenir toutes les sessions sauvegardées
function getSessions() {
  if (fs.existsSync(sessionFile)) {
    const sessions = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    return sessions || {};
  } else {
    fs.writeFileSync(sessionFile, '{}', 'utf-8');
    return {};
  }
}

// Changer d'assistant et charger l'URL correspondante sans effacer les cookies
function changeAssistant(label, url, save = false, killCookies = true) {
  if (killCookies) {
    win.webContents.session.clearStorageData({ storages: ['cookies'] });
  }
  win.loadURL(url);
  if (save) {
    userSettings = { ...userSettings, assistant: label };
    fs.writeFileSync(configPath, JSON.stringify(userSettings), 'utf-8');
  }
}

// Générer le menu pour naviguer entre assistants et gérer les sessions
function generateMenu() {
  const sessionMenuTemplate = [
    ...(isMac ? [{ label: app.name, submenu: [{ role: 'quit' }] }] : []),
    ...(isMac ? [{ label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] }] : []),
    {
      label: "Changer d'assistant",
      submenu: availableAIs.map(({ label, url }) => ({
        label,
        type: "checkbox",
        checked: (userSettings.assistant || defaultSettings.assistant) === label,
        click() {
          changeAssistant(label, url, true);
        }
      })),
    },
    {
      label: 'Sessions',
      submenu: [
        ...Object.keys(getSessions()).map((name) => ({
          label: name,
          click() {
            loadSession(name, session.defaultSession);
          }
        })),
        { type: "separator" },
        {
          label: "Enregistrer la session actuelle",
          click: () => {
            prompt({
              title: 'Enregistrer la session actuelle',
              label: 'Nom de la session :',
              inputAttrs: { type: 'text' },
              type: 'input'
            }).then((text) => {
              if (text) {
                storeSession(text, session.defaultSession);
                loadSession(text, session.defaultSession);
              }
            }).catch(console.error);
          }
        },
        {
          label: "Supprimer une session",
          click: () => {
            prompt({
              title: 'Supprimer une session',
              label: 'Nom de la session à supprimer :',
              inputAttrs: { type: 'text' },
              type: 'input'
            }).then((text) => {
              if (text) {
                const sessions = getSessions();
                delete sessions[text];
                fs.writeFileSync(sessionFile, JSON.stringify(sessions));
                win.reload();
              }
            }).catch(console.error);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(sessionMenuTemplate);
  Menu.setApplicationMenu(menu);
}

// Créer la fenêtre principale et charger l'assistant choisi
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      session: session.defaultSession
    }
  });

  loadUserPreferences();
  generateMenu();

  const label = userSettings.assistant || defaultSettings.assistant;
  const assistant = availableAIs.find(ai => ai.label === label);
  if (assistant) {
    loadSession(label, session.defaultSession);
    changeAssistant(label, assistant.url, false, false);
  }

  win.on('closed', () => { win = null });
}

app.whenReady().then(createWindow);
app.on('activate', () => { if (win === null) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
