const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron')
const { exec } = require('child_process'); //running python
const path = require('path') //path
const TrayWindow = require('electron-tray-window');
const fs = require('fs');
const logFilePath = path.join(__dirname, 'logs.txt');
let mainWindow;
let splash;
const { Notification } = require('electron');
app.setName('Focus Mind');
function showNotification(title, body) {
  const notification = new Notification({
    title: title,
    body: body,
    icon: "images/favicon.ico"
  });
  notification.show();
}
// Function to append logs to the log file
function appendToLog(data) {
  fs.appendFile(logFilePath, data + '\n', (err) => {
    if (err) {
      console.error('Error appending to log file:', err);
    }
  });
}
// Function to read the value of Tracking from settings.json
function checkTrackingValue() {
  const settingsFilePath = path.join(__dirname, 'database', 'settings.json');
  try {
    // Read the settings file
    const settingsData = fs.readFileSync(settingsFilePath, 'utf8');
    // Parse the JSON data
    const settings = JSON.parse(settingsData);
    // Get the value of Tracking
    const trackingValue = settings.Tracking;
    return trackingValue;
  } catch (error) {
    console.error('Error reading settings file:', error);
    return null;
  }
}

// Function to set the value of Tracking to true
function setTrackingValueToTrue() {
  const settingsFilePath = path.join(__dirname, 'database', 'settings.json');
  try {
    // Read the settings file
    let settingsData = fs.readFileSync(settingsFilePath, 'utf8');
    // Parse the JSON data
    let settings = JSON.parse(settingsData);
    // Update the value of Tracking
    settings.Tracking = true;
    // Write the updated settings back to the file
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error writing to settings file:', error);
  }
}

// Function to set the value of Tracking to false
function setTrackingValueToFalse() {
  const settingsFilePath = path.join(__dirname, 'database', 'settings.json');
  try {
    // Read the settings file
    let settingsData = fs.readFileSync(settingsFilePath, 'utf8');
    // Parse the JSON data
    let settings = JSON.parse(settingsData);
    // Update the value of Tracking
    settings.Tracking = false;
    // Write the updated settings back to the file
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error writing to settings file:', error);
  }
}

// Function to start tracking.py
function startTrackingPythonScript() {
  const pythonScriptPath = path.join(__dirname, 'python', 'tracking.py');
  exec(`python ${pythonScriptPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error('Error starting tracking.py:', error);
    }
    if (stderr) {
      console.error('Error output from tracking.py:', stderr);
    }
    console.log('Tracking script started.');
  });
}

// Call the functions when the app starts
function appStartupTasks() {
  // Set Tracking value to true
  setTrackingValueToTrue();
  // Start tracking.py
  startTrackingPythonScript();
}

// Call the function when the app closes
function appShutdownTasks() {
  // Set Tracking value to false
  setTrackingValueToFalse();
}

let tray = null; // Tray instance
let win = null; // BrowserWindow instance

let blackoutWin = null;

// Existing code for your app...

// Function to create the blackout window
function createBlackoutWindow() {
  blackoutWin = new BrowserWindow({
    fullscreen: true, // Set the window to full-screen
    frame: false, // Set frame to false to remove window frame
    resizable: false, //Disabled Resizing as a UI preference 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load index2.html into the new window
  blackoutWin.loadFile('src/Blackout.html');

  // Optional: Clear the reference when the window is closed
  blackoutWin.on('closed', () => {
    blackoutWin = null;
  });
}

//I disabled developer mode but to enable it press Ctrl+Shift+I
const createWindow = () => {
  // Create the splash window first
  splash = new BrowserWindow({
    width: 800, // Adjust the size as needed
    height: 600,
    transparent: true, // Set transparency if desired
    frame: false, // No window frame for splash screen
    alwaysOnTop: true // Ensure splash screen stays on top
  });
  splash.loadFile('./src/splash.html'); // Load your splash screen html

  // Then create the main window, but don't show it immediately
  const win = new BrowserWindow({
    width: 1000,
    height: 600,
    resizable: false, //Disabled Resizing as a UI preference 
    frame: false, // Set frame to false to remove window frame
    hardwareAcceleration: false, //disable hardware acceleration
    webPreferences: {
      devTools: true, //disable this when packing the application
      nodeIntegration: true, //needed for custom frame
      contextIsolation: false, //needed for IPCRenderer
      enableRemoteModule: true
    }
  });
  win.loadFile('index.html');
  win.setIcon('images/Focus_Mind_Logo.png');
  //win.webContents.openDevTools();

  // Only show the main window when it is ready to show
  win.once('ready-to-show', () => {
    splash.destroy(); // Close the splash screen
    win.show(); // Show the main window
  });

  // Create the Tray icon
  tray = new Tray(path.join(__dirname, 'images/focus-mind.png')); // Path to the tray icon
  tray.setToolTip('Focus Mind'); // Tooltip for the tray icon
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Focus Mode', type: 'normal', click: () => app.quit() },
    { label: 'Analytics', type: 'normal', click: () => app.quit() },
    { type: 'separator' }, // Adds a visual separator in the menu
    { label: 'Exit', type: 'normal', click: () => app.quit() } // Adds an exit button
  ]);
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    // Restore the window when the tray icon is clicked
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
    }
  });

  // Minimize the window to tray instead of closing
  win.on('minimize', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
      // Usage
      const NOTIFICATION_TITLE = 'Application Minimized';
      const NOTIFICATION_BODY = 'The application is now going to be running in the background.';

      showNotification(NOTIFICATION_TITLE, NOTIFICATION_BODY);
    }
  });
  // Event listener for the 'blackout' event

  ipcMain.on('close-blackout', (event, arg) => {
    const timestamp = new Date().toLocaleString(); // Get current timestamp
    console.log(timestamp + ' - Blackout window closed');
    appendToLog(timestamp + ' - Blackout window closed');
    blackoutWin.close();
  });

  ipcMain.on('minimize-window', () => {
    const timestamp = new Date().toLocaleString(); // Get current timestamp
    console.log(timestamp + ' - Minimizing window');
    appendToLog(timestamp + ' - Minimizing window');
    win.minimize();
  })

  ipcMain.on('close-window', () => {
    const timestamp = new Date().toLocaleString(); // Get current timestamp
    console.log(timestamp + ' - Closing window');
    appendToLog(timestamp + ' - Closing window');
    win.close();
  })

  ipcMain.on('focus', () => {

    exec('python python/start-focus.py', (error, stdout, stderr) => {
      const timestamp = new Date().toLocaleString(); // Get current timestamp
      const logMessage = `${timestamp} - Error: ${error}, Stderr: ${stderr}, Stdout: ${stdout}`;

      // Log to console
      console.log(logMessage);

      // Log to file
      appendToLog("Focus Said: " + logMessage);
    });
  })

  ipcMain.on('notif', () => {
    const timestamp = new Date().toLocaleString(); // Get current timestamp
    exec('python python/disable-notif.py', (error, stdout, stderr) => {
      const logMessage = `${timestamp} -Error: ${error}, Stderr: ${stderr}, Stdout: ${stdout}`;

      // Log to console
      console.log(logMessage);

      // Log to file
      appendToLog("Notification Blocker Said: " + logMessage);
    });
  })

  ipcMain.on('blackout', (event, arg) => {
    const timestamp = new Date().toLocaleString(); // Get current timestamp
    console.log(timestamp + ' - Creating blackout window');
    appendToLog(timestamp + ' - Creating blackout window');
    createBlackoutWindow();
  });

  ipcMain.on('show-notification', (event, args) => {
    showNotification(args.title, args.body);
  });
  

}

// Function to calculate time difference in hours between two timestamps
function getTimeDifferenceInHours(startTime, endTime) {
  const startTimestamp = new Date(startTime).getTime();
  const endTimestamp = new Date(endTime).getTime();
  const differenceInMilliseconds = Math.abs(endTimestamp - startTimestamp);
  return differenceInMilliseconds / (1000 * 60 * 60); // Convert milliseconds to hours
}

// Function to read focus session data from file
function readFocusSessionsFromFile() {
  const filePath = path.join(__dirname, 'database', 'focus_sessions.json');
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading focus sessions data:', error);
    return null;
  }
}

// Function to check the time since the last session and send a notification if necessary
function checkFocusTime() {
  const sessions = readFocusSessionsFromFile();
  if (sessions && sessions.length > 0) {
    const lastSession = sessions[sessions.length - 1];
    const lastStartTime = new Date(lastSession.start_time);
    const hoursSinceLastSession = getTimeDifferenceInHours(lastStartTime, new Date());
    if (hoursSinceLastSession >= 6) {
      // If 6 or more hours have passed since the last session, send a notification
      const notification = new Notification({
        title: 'Focus Reminder',
        body: 'It\'s been a while since your last focused session. Maybe it\'s time to focus again?',
        icon: 'path/to/icon.png' // Update with the path to your app's icon
      });
      notification.show();
    }
  }
}

// Call the function when the app is ready
app.whenReady().then(() => {
  appStartupTasks();
  // Call the function initially
  checkFocusTime();
  
  // Schedule the function to check every hour
  setInterval(checkFocusTime, 3600000); // 3600000 milliseconds = 1 hour
});

app.setName('FocusMind');
app.whenReady().then(() => {
  createWindow();
  app.on('before-quit', () => {
    app.isQuitting = true;
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      appShutdownTasks();
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

})

app.setUserTasks([
  {
    program: process.execPath,
    arguments: '--focus-mode',
    iconPath: 'images/focus-mind.png',
    iconIndex: 0,
    title: 'Start Focus',
    description: 'Enter Focus Mode'
  },
  {
    program: process.execPath,
    arguments: '--show-analytics',
    iconPath: process.execPath,
    iconIndex: 0,
    title: 'Analytics',
    description: 'View Analytics'
  }
]);
