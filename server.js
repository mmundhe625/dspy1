// 🎵 Mood-Based Music Recommender Server with Spotify Integration (Authorization Code Flow)
require('dotenv').config();
const express = require("express");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const querystring = require('querystring'); 

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Spotify credentials
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
// The Redirect URI must match the one in the Spotify Developer Dashboard
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:5000/callback'; 

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Login route: Redirect to Spotify auth (Requests an Authorization Code)
app.get("/login", (req, res) => {
  const scopes = "streaming user-read-playback-state user-read-email user-read-private"; 
  const authUrl = 
    'https://accounts.spotify.com/authorize?' + // CORRECT Spotify Authorization URL
    querystring.stringify({
      response_type: 'code', // Authorization Code Flow
      client_id: CLIENT_ID,
      scope: scopes,
      redirect_uri: REDIRECT_URI
    });
  
  res.redirect(authUrl);
});

// Callback route: Exchanges the Authorization Code for Access Token
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  if (code === null) {
    // Handle error redirect from Spotify
    return res.redirect(`http://127.0.0.1:5000/?error=${req.query.error || 'auth_failed'}`);
  }

  try {
    // Request to exchange the code for the token
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token', // CORRECT Spotify Token URL
      method: 'post',
      data: querystring.stringify({
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }),
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
    
    const response = await axios(authOptions);

    // Success: Spotify returns the token
    const { access_token, refresh_token } = response.data;

    // Redirect client to the main page, passing the access token in the query
    res.redirect(`http://127.0.0.1:5000/?access_token=${access_token}&refresh_token=${refresh_token}`);

  } catch (error) {
    console.error("Token exchange error:", error.response?.data || error.message);
    res.redirect('http://127.0.0.1:5000/?error=token_exchange_failed');
  }
});

// Create standard HTTP server
app.listen(PORT, '127.0.0.1', () => { // Explicitly bind to 127.0.0.1
  console.log(`🚀 HTTP Server running at http://127.0.0.1:${PORT}`);
  console.log("🎧 Open your browser and enjoy the Mood-Based Music Recommender!");
});