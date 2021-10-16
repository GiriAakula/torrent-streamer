var Seedr = require("seedr");
var seedr = new Seedr();
const Downloader = require('nodejs-file-downloader');
const express = require("express");
const app = express();
const fs = require("fs");
const path = require('path');
let sendStatus, sendMagnetStatus;
let movieName = '';

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.get("/sendMagnet", function(req, res){
    console.log(req.query)
    if(req.query.magnet){
        main(req.query.magnet)
        sendStatus(`${req.query.magnet} has been received`)
    }else {
        res.send({error: "Magnet link is required"})
        sendStatus(`A proper magnet link is required.`)
    }
    sendMagnetStatus = function(){
        res.sendStatus(200)
    }
});

app.get("/video", function (req, res) {
    // Ensure there is a range given for the video
    const range = req.headers.range;
    if (!range) {
      res.status(400).send("Requires Range header");
    }

    // fs.readdirSync(`${__dirname}/downloads`, (err, files) => {
    //     console.log(files, 'files')
    //     movieName = files[0];
    //     console.log(movieName)
    // });

    movieName = fs.readdirSync(`${__dirname}/downloads`)[0]
    // get video stats (about 61MB)
    console.log(movieName, "moviename")
    const videoPath = `${__dirname}/downloads/${movieName}`;
    const videoSize = fs.statSync(`${__dirname}/downloads/${movieName}`).size;

    // Parse Range
    // Example: "bytes=32324-"
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    // Create headers
    const contentLength = end - start + 1;
    const headers = {
      "Content-Range": `bytes ${start}-${end}/${videoSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": contentLength,
      "Content-Type": "video/mp4",
    };

    // HTTP Status 206 for Partial Content
    res.writeHead(206, headers);

    // create video read stream for this particular chunk
    const videoStream = fs.createReadStream(videoPath, { start, end });

    // Stream the video chunk to the client
    videoStream.pipe(res);
});

app.get('/status', function(req, res){
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    })
    sendStatus = function(data){
        res.write("data: " + data + "\n\n")
    }
})
app.listen(process.env.PORT || 8000, function () {
    console.log("Listening on port 8000!");
});

async function main(magnet) {
    try {
        await seedr.login("giriakula3@gmail.com", "9701732638");
        var contents = [];
        const videos = await seedr.getVideos();
        if(videos.flat()[0].fid){
            await seedr.deleteFolder(videos.flat()[0].fid);
        }
        fs.readdir(`${__dirname}/downloads`, (err, files) => {
            if (err) throw err;
            for (const file of files) {
              fs.unlink(path.join(`${__dirname}/downloads`, file), err => {
                if (err) throw err;
              });
            }
        });
        async function addMagnet(){
            await seedr.addMagnet(magnet);
            contents = await seedr.getVideos()
            if(contents.length > 0){
                sendStatus(`Magnet link has been added.`)
                getDownloadUrl()
            }else {
                addMagnet()
            }
        };
        addMagnet();
        async function getDownloadUrl(){
            let url = await seedr.getFile(contents.flat()[0].id);
            console.log(url.url)
            sendStatus(`Downloading video into the server`)
            const downloader = new Downloader({
                url: url.url,
                directory: "./downloads",
                onProgress:function(percentage){
                    console.log('% ',percentage)
                    sendStatus(`${percentage}% has been downloaded`)
                }
              })
            await downloader.download();
            sendStatus(`Done`)
            sendMagnetStatus()
        }
    } catch (error) {
        console.log(error, 'error')
    }
}