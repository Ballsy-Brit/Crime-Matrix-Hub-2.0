Place the attached image as the project background

To make the login page use the exact image you attached, save that image to the public folder using this path and filename:

client/public/crime-bg.jpg

Options to add the file:

1) Manually (recommended):
   - Download the attached image from the chat.
   - Save it as `crime-bg.jpg` inside the project `client/public` folder.

2) PowerShell (if you have a direct URL to the image):
   Invoke-WebRequest -Uri "<IMAGE_URL>" -OutFile "client/public/crime-bg.jpg"

3) If you can provide the image file here (upload) or paste a base64 string, I can write it into `client/public/crime-bg.jpg` for you.

After placing the file, run the client:

```powershell
cd client
npm install
npm start
```

The CSS already references `/crime-bg.jpg` so the background will show automatically.
