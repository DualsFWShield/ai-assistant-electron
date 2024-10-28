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
const fs = require('fs');
const path = require('path');

let win;
let userSettings;

// Chemin du répertoire de données de l'utilisateur
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');

// Paramètres par défaut de l'application
const defaultSettings = {
  theme: "default.css",
  assistant: "ChatGPT",
};

// Fonction pour changer d'assistant
function changeAssistant(label, url) {
  win.loadURL(url); // Charge l'URL de l'assistant sélectionné
  let currentSettings = Object.assign({}, userSettings || loadUserPreferences());
  currentSettings.assistant = label; // Met à jour l'assistant
  userSettings = currentSettings;
  fs.writeFileSync(configPath, JSON.stringify(userSettings), 'utf-8'); // Sauvegarde les paramètres
}

// Charge les préférences utilisateur à partir du fichier de configuration
function loadUserPreferences() {
  if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, 'utf-8');
    userSettings = JSON.parse(configFile);
    return userSettings;
  } else {
    fs.writeFileSync(configPath, JSON.stringify(defaultSettings)); // Crée le fichier s'il n'existe pas
    return loadUserPreferences();
  }
}

// Change le thème de l'application
function changeUserTheme(name) {
  let currentSettings = Object.assign({}, userSettings || loadUserPreferences());
  currentSettings.theme = name; // Met à jour le thème
  userSettings = currentSettings;
  fs.writeFileSync(configPath, JSON.stringify(userSettings, null, 2), 'utf-8'); // Sauvegarde les paramètres
  const cssFile = path.join(userDataPath, name);
  
  // Charge le fichier CSS correspondant au thème
  if (fs.existsSync(cssFile)) {
    const cssContent = fs.readFileSync(cssFile, 'utf8');
    win.webContents.insertCSS(cssContent); // Applique le CSS
  }
}

// Génére le menu de l'application
function generateMenu() {
  const menuTemplate = [
    {
      label: "Change AI",
      submenu: availableAIs.map(({ label, url }) => ({
        label,
        type: "radio",
        checked: (userSettings.assistant || defaultSettings.assistant) === label,
        click() {
          changeAssistant(label, url);
        }
      })),
    },
    {
      label: 'Theme',
      submenu: fetchThemes().map(str => ({
        label: str,
        click() {
          changeUserTheme(str);
        }
      })),
    },
    // Ajout des options de navigation
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Page Précédente',
          click() {
            win.webContents.goBack(); // Retourne à la page précédente
          }
        },
        {
          label: 'Page Suivante',
          click() {
            win.webContents.goForward(); // Avance à la page suivante
          }
        },
        {
          label: 'Inspecter',
          click() {
            win.webContents.openDevTools(); // Ouvre les outils de développement
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// Charge les thèmes disponibles
function fetchThemes() {
  const cssFiles = fs.readdirSync(userDataPath)
    .filter(file => path.extname(file) === '.css') // Filtre les fichiers CSS
    .map(label => label);
  return cssFiles || ["default.css"]; // Retourne la liste des thèmes
}

// Fonction pour créer la fenêtre de l'application
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
      session: session.defaultSession // Utilise la session par défaut
    }
  });

  loadUserPreferences(); // Charge les préférences utilisateur
  generateMenu(); // Génère le menu de l'application

  // Charge l'assistant par défaut
  const label = userSettings.assistant || defaultSettings.assistant;
  const url = availableAIs.find(ai => ai.label === label).url;
  win.loadURL(url); // Charge l'URL de l'assistant

  // Lors du chargement du contenu
  win.webContents.on('did-finish-load', () => {
    const hideCssRules = [
      "body div#app",
      "body div.threads div.main-content",
      "body div.text-xs > div",
    ];
    
    // Applique des règles CSS pour masquer certains éléments
    hideCssRules.forEach((rule) => {
      win.webContents.insertCSS(`${rule} { display: none !important; }`);
    });
    
    // Charge le thème utilisateur
    changeUserTheme(userSettings.theme || defaultSettings.theme);
  });

  // Événement lorsque la fenêtre est fermée
  win.on('closed', () => {
    win = null;
  });
}

// Événements de l'application
app.on('ready', createWindow);
app.on('window-all-closed', () => {
  app.quit(); // Quitte l'application lorsque toutes les fenêtres sont fermées
});
app.on('activate', () => {
  if (win === null) createWindow(); // Crée une nouvelle fenêtre si l'application est activée
});
