const express = require("express");
const fs = require("fs");
const app = express();
const port = 3000;
app.get("/video", async (req, res) => {
    const videoPath = "../videos/SampleVideo_1280x720_1mb.mp4";
    const stats = await fs.promises.stat(videoPath);
    res.writeHead(200, {
        "Content-Length": stats.size,
        "Content-Type": "video/mp4",
    });
    fs.createReadStream(videoPath).pipe(res);
});
app.listen(port);
