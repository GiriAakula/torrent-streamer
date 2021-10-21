var Seedr = require("seedr");
var seedr = new Seedr();
const Downloader = require('nodejs-file-downloader');
const express = require("express");
const app = express();
const fs = require("fs");
const path = require('path');
let sendStatus;
let movieName = '';

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.get("/sendMagnet", function(req, res){
    console.log(req.query)
    if(req.query.magnet){
        sendStatus(`${req.query.magnet} has been received`)
        main(req.query.magnet)
        res.sendStatus(200)
    }else {
        res.send({error: "Magnet link is required"})
        sendStatus(`A proper magnet link is required.`)
    }
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
        sendStatus("Logging into your seedr account...")
        var contents = [];
        const videos = await seedr.getVideos();
        if(videos?.flat()[0]?.fid){
            await seedr.deleteFolder(videos.flat()[0].fid);
            sendStatus("Deleting old videos in your seedr account...")
        }
        async function addMagnet(){
            await seedr.addMagnet(magnet);
            contents = await seedr.getVideos()
            if(contents.length > 0){
                sendStatus(`Adding magnet link...`)
                getDownloadUrl()
            }else {
                addMagnet()
            }
        };
        addMagnet();
        async function getDownloadUrl(){
            let url = await seedr.getFile(contents.flat()[0].id);
            console.log(url.url, "from here")
            sendStatus(`Done|||${url.url}`)
        }
    } catch (error) {
        console.log(error, 'error')
    }
}