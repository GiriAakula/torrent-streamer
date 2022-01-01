var Seedr = require("seedr");
var seedr = new Seedr();
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const JsonDB = require('node-json-db').JsonDB;
const Config = require('node-json-db/dist/lib/JsonDBConfig').Config;
var db = new JsonDB(new Config("user_database", true, false, '/'));

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});


app.post("/newUser", function (req, res) {
    if (req.body.username && req.body.password && req.body.magnet) {
        res.sendStatus(200)
        main(req.body.magnet, req.body.username, req.body.password)
    }
});

app.get("/videoUrl", function (req, res) {
    let username;
    if (req.query.username === "me") {
        username = "giriakula3@gmail.com";
    } else {
        username = req.query.username;
    }
    console.log('getting video url')
    if (username) {
        try {
            let timestamp = db.getData(`/users/${username}/timestamp`);
            let timeDiff = Math.abs(new Date().getTime() - timestamp) / 1000;
            console.log(timeDiff)
            if(timeDiff > 30){
                res.json({timeout:true})
                return;
            }
            let users = db.getData(`/users/${username}/videoUrl`);
            if (users) {
                res.send(users)
            } else {
                res.sendStatus(204)
            }
        } catch (error) {
            res.sendStatus(204)
        }
    }
})
app.listen(process.env.PORT || 8000, function () {
    console.log("Listening on port 8000!");
});

async function main(magnet, usrname, pasword) {
    try {
        let username = "";
        let password = "";
        if (usrname === "me" && pasword === "me") {
            username = "giriakula3@gmail.com";
            password = "9701732638"
        } else {
            username = usrname;
            password = pasword;
        }
        db.push(`/users/${username}`, { timestamp: Date.now() }, false);
        try {
            if(db.getData(`/users/${username}/videoUrl`)){
                db.delete(`/users/${username}/videoUrl`);
            }
        } catch (error) {
           console.log("New user. No videoUrl found")
        }
        console.log(username, password)
        await seedr.login(username, password);
        console.log('logged in')
        var contents = [];
        const videos = await seedr.getVideos();
        if (videos?.flat()[0]?.fid) {
            await seedr.deleteFolder(videos.flat()[0].fid);
        }
        async function addMagnet() {
            console.log('adding magnet')
            await seedr.addMagnet(magnet);
            contents = await seedr.getVideos()
            if (contents.length > 0) {
                getDownloadUrl()
            } else {
                addMagnet()
            }
        };
        addMagnet();
        async function getDownloadUrl() {
            let url = await seedr.getFile(contents.flat()[0].id);
            console.log(url, 'url')
            db.push(`/users/${username}`, { videoUrl: url }, false);
        }
    } catch (error) {
        console.log(error, 'error')
    }
}