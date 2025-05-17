# HoloMat V3 with JARVIS Voice Assistant

HoloMat V3 is a futuristic holographic interface with integrated voice assistant capabilities powered by OpenAI's real-time API.

## Project Structure

The project is a React application that directly interfaces with OpenAI's real-time voice API:
- React Frontend: The holographic user interface with voice integration
- Settings Panel: Configure voice model, voice type, and system prompt
- Local Storage: Your API key is stored in browser's localStorage for security

## Setup Instructions

### Frontend Setup

1. Install the required npm packages:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. The application will be available at `http://localhost:3000`

> To enable the new Model Creator app (text-to-3D), set a Hugging Face API token in your environment:
> ```bash
> export HUGGINGFACE_TOKEN=<your_token_here>
> # (Optional) override default model ID:
> # edit hf-config.json or use Settings UI to set modelID to "Tencent/Hunyuan3D-2"
> ```

### API Key Configuration

1. Open the application and click the settings button
2. Enter your OpenAI API key in the API KEY section
3. Click "SAVE API KEY" to store it locally

> **Note:** You need an OpenAI API key with access to real-time voice API models.

## Using the Voice Assistant

1. Click the large microphone button above the app carousel to activate the voice assistant.
2. When active, the interface will show a blue outline and the button will display "LISTENING".
3. Speak to the assistant (Jarvis) and it will respond through your speakers.
4. Click the microphone button again to deactivate the voice assistant.

## Configuration Options

You can configure the voice assistant's behavior through the settings panel in the application:

- `OPENAI_MODEL`: The OpenAI model to use (default: gpt-4o-mini-realtime-preview-2024-12-17)
- `VOICE`: The voice to use for audio responses (options: alloy, ash, ballad, coral, echo, fable, onyx, nova, shimmer)
- `INITIAL_PROMPT`: The system prompt that defines the assistant's behavior
- `INCLUDE_DATE` and `INCLUDE_TIME`: Whether to include the current date and time in messages

## Troubleshooting

- **Microphone not working**: Ensure your browser has permission to access your microphone
- **No audio output**: Check that your default audio output device is properly configured
- **Connection errors**: Verify that the frontend server is running

## Credits

- HoloMat V3 Interface: Concept Bytes
- Voice Assistant Technology: Based on OpenAI's real-time API