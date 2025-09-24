# Twitch Chat Summarizer & Discord TTS Bot - V1.0.1

### Newest Update:
Added in better explanation to readme.md for AI Prompt.

## Description
This project captures Twitch chat messages, summarizes them using AI, generates a text-to-speech (TTS) audio file, and plays it in a Discord voice channel. It also provides a web overlay to display the summary.

## Features

- **Twitch Chat Integration**: Connects to a specified Twitch channel and reads chat messages.
- **AI Summarization**: Batches chat messages and sends them to a Python backend, which uses Google's Generative AI to create a concise, strategic summary.
- **Text-to-Speech**: The summary is converted to speech using Google Cloud Text-to-Speech.
- **Discord Bot**: A Discord bot joins a specified voice channel and plays the TTS audio.
- **Web Overlay**: An Express server hosts a simple webpage to display the latest summary, which can be used as a browser source in OBS or other streaming software.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16.9.0 or higher)
- [Python](https://www.python.org/) (v3.8 or higher)
- A **Google Cloud Platform (GCP)** account with:
  - A project created.
  - The **Vertex AI API** and **Text-to-Speech API** enabled.
  - A service account with appropriate permissions (e.g., Vertex AI User, Cloud Text-to-Speech User) and a JSON credentials file.
- A **Discord Bot Token** and the IDs for your Guild (Server) and Voice Channel.
- A **Twitch Account** for the bot and an OAuth token.

## Usage

You are allowed to Edit, Modify & Adjust my code. I ask upon using it, any large things you change can be fed back so I can update if I feel its a larger want/need. If possible, creditation is always appreciated!

## Setup

1.  **Clone the Repository**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-folder>
    ```

2.  **Install Node.js Dependencies**
    Navigate to the project root and run:
    ```bash
    npm install
    ```

3.  **Install Python Dependencies**
    It is recommended to use a virtual environment for the Python dependencies.
    ```bash
    # Create a virtual environment
    python -m venv venv

    # Activate the virtual environment
    # On Windows:
    .\venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate

    # Install the required packages
    pip install -r requirements.txt
    ```

4.  **Set Up Environment Variables**
    Create a file named `.env` in the root of the project and fill it with your credentials. Use the template below.

## Environment Variables Template (`.env`)

Copy the following content into your `.env` file and replace the placeholder values with your actual credentials.

```env
# ================= DISCORD =================
DISCORD_TOKEN= # Discord bot Token
GUILD_ID= # Discord guild (server) ID
VOICE_CHANNEL_ID= # Discord voice channel ID

# ================= TWITCH =================
TWITCH_TOKEN= # Twitch OAuth token (get from https://twitchapps.com/tmi/)
TWITCH_CHANNEL= # Twitch channel to join/watch messages from
TWITCH_BOT_USERNAME= # Twitch bot username (usually same as the channel you setup the token from)
TWITCH_CLIENT_ID= # Twitch application client ID (get from https://dev.twitch.tv/console/apps , simply create an app)

# ================= GOOGLE =================
GOOGLE_APPLICATION_CREDENTIALS= # File path to your .json Google API credentials (get from https://console.cloud.google.com/apis/credentials)
GOOGLE_PROJECT_ID= # The name of your Google Cloud project (get from https://console.cloud.google.com/home/dashboard)

# ================= MISC =================
OBS_BROWSER_DOMAIN= # URL for Summariser to **send** summaries to - USED FOR OBS PREVIEW
USE_OBS_BROWSER_SOURCE= # Set to True to use the OBS Browser Source feature, else False
```

5. **Change the prompt**

## AI Prompt

The current setup found in `summarizer.py` is setup for "Deadlock". I have kept this prompt in to show you the level of detail you need to get an adequate response. Even the current one is not perfect.

Your prompt should have this following section in:
```txt
Chat messages:
{messages}
```
This is where the code automatically places in the twitch messages in the `make_prompt` function.

I highly reccomend spending a lot of time testing, and tweaking your prompt to get the best results possible.

## Running the Application

You need to run two processes in separate terminals.

1.  **Start the Python Summarizer Backend**
    In your first terminal, make sure your Python virtual environment is activated, then run:
    ```bash
    python summarizer.py
    ```
    You should see a message indicating the server is running on port 1919.

2.  **Start the Node.js Bot and Server**
    In your second terminal, run:
    ```bash
    node index.js
    ```
    You should see logs indicating the Discord bot has logged in, connected to the voice channel, and the overlay server is running on port 3000.

## How It Works

1.  The **Node.js app (`index.js`)** connects to Twitch chat and collects messages in a buffer.
2.  Every 15 seconds, the buffered messages are sent to the **Python backend (`summarizer.py`)** via an HTTP POST request.
3.  The Python backend uses Google's Generative AI to summarize the chat messages into a single, actionable sentence.
4.  The summary is then converted into a `.wav` audio file using Google Cloud Text-to-Speech and saved in the `public` directory.
5.  The Node.js app receives the summary text and the URL to the audio file.
6.  The summary text is pushed to the TTS queue and broadcast to the web overlay via WebSockets.
7.  The Discord bot plays the audio from the queue in the designated voice channel.
8.  The web overlay, accessible at `http://localhost:3000`, displays the summary in real-time.

If you want a nicer preview, you can use the example flask blueprint located in `/Extra` to get a cleaner, nicer OBS preview.
