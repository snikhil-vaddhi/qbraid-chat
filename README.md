qBraid Chat VS Code Extension
qBraid Chat is a Visual Studio Code extension that allows users to interact with qBraid's services directly from the editor. This extension provides an intuitive interface for managing quantum jobs, devices, and API keys.
Features

Start a qBraid Chat session.
Manage quantum jobs (list, cancel, delete).
Interact with quantum devices and models.
Securely store and clear your qBraid API key.

Installation

Run the following commands to package and install the extension:

npm install
npm run vsce:package
code --install-extension "qbraid-chat-0.1.0.vsix"

Usage

Open the Command Palette in VS Code (Ctrl+Shift+P or Cmd+Shift+P on macOS).
Search for and run the following commands:

Start qBraid Chat: qbraid-chat.start
Clear API Key: qbraid-chat.clearApiKey

Development

To build and test the extension locally:
Install dependencies:

npm install

Compile the code:

npm run compile

Launch the extension in a VS Code development environment:

npm run watch

License
This project is licensed under the MIT License. This README.md provides a quick overview of your extension, its features, installation steps, and usage instructions. You can expand it further if needed!
