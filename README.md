# SnapshotAI by SourceU

**SnapshotAI** is a Chrome extension that allows you to easily capture snapshots of your screen, crop the image, and interact with OpenAI's API to analyze the content of the image. It leverages the power of AI to help you gain insights from any screenshot.

## Features

- **Capture Screenshots**: Quickly take snapshots of the current screen.
- **Crop Images**: Crop the image to focus on a specific area before sending it for analysis.
- **AI Analysis**: Send the image to OpenAI's API for analysis, and receive a description of the contents of the image.

## Installation

Follow these steps to install **SnapshotAI**:

1. **Clone or Download the Repository**: 
   - Clone the repository or download the extension files.

2. **Load the Extension in Chrome**:
   - Open Google Chrome.
   - Navigate to `chrome://extensions/`.
   - Enable **Developer mode** (toggle at the top right).
   - Click **Load unpacked** and select the folder where you downloaded or cloned the extension files.

3. **Test the Extension**:
   - Once installed, you'll see the **SnapshotAI** icon in the Chrome toolbar.
   - Click the icon to open the extension and start using it.

## Usage

1. **Take a Snapshot**:
   - Click the extension icon in the Chrome toolbar.
   - Click the **"Take Snapshot"** button to capture a screenshot of your current browser tab.

2. **Crop the Image**:
   - Use the cropping tool to select the area of the image you want to send for analysis.
   - After selecting the area, click **"Crop"**.

3. **Retrieve AI Response**:
   - Click the **"Retrieve Response"** button to send the image to OpenAI's API.
   - The AI will process the image and provide a description of the contents.
   - The result will appear below the **"Retrieve Response"** button in the extension’s interface.

## Permissions

The extension requests the following permissions:

- **`activeTab`**: To capture screenshots of the currently active tab.
- **`storage`**: To store temporary data like captured images and settings.
- **`scripting`**: To inject scripts into pages for capturing screenshots.
- **`host_permissions`**: To allow communication with the backend API and OpenAI's API.

## Technologies Used

- **HTML, CSS, JavaScript**: For the extension’s frontend.
- **OpenAI API**: For image analysis using AI.
- **Chrome Extensions API**: For creating and managing the extension.

## Troubleshooting

- If you encounter any issues with the extension, ensure that **CORS** permissions are configured properly in your API and that the backend is running.
- Make sure the **OpenAI API key** is correctly set and the extension can communicate with OpenAI for image analysis.

## Contributing

If you want to contribute to the development of this extension, feel free to fork the repository, make changes, and create a pull request.

### Steps to Contribute:
1. Fork the repository.
2. Create a feature branch (`git checkout -b new-feature`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to the branch (`git push origin new-feature`).
6. Open a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

### Contact Information:
- **SourceU Team**: [sourceu.ai](https://sourceu.ai)
