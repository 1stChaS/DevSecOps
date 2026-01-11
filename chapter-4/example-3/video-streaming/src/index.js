const express = require("express");
const http = require("http");
const mongodb = require("mongodb");

//
// Throws an error if the any required environment variables are missing.
//

if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}

if (!process.env.VIDEO_STORAGE_HOST) {
    throw new Error("Please specify the host name for the video storage microservice in variable VIDEO_STORAGE_HOST.");
}

if (!process.env.VIDEO_STORAGE_PORT) {
    throw new Error("Please specify the port number for the video storage microservice in variable VIDEO_STORAGE_PORT.");
}

if (!process.env.DBHOST) {
    throw new Error("Please specify the databse host using environment variable DBHOST.");
}

if (!process.env.DBNAME) {
    throw new Error("Please specify the name of the database using environment variable DBNAME");
}

//
// Extracts environment variables to globals for convenience.
//

const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;

console.log(`Forwarding video requests to ${VIDEO_STORAGE_HOST}:${VIDEO_STORAGE_PORT}.`);

async function main() {
    const client = await mongodb.MongoClient.connect(DBHOST); // Connects to the database.
    const db = client.db(DBNAME);
    const videosCollection = db.collection("videos");
    
    const app = express();
        
    // app.get("/video", async (req, res) => {
    //     const videoId = new mongodb.ObjectId(req.query.id);
    //     const videoRecord = await videosCollection.findOne({ _id: videoId });
    //     if (!videoRecord) {
    //         // The video was not found.
    //         res.sendStatus(404);
    //         return;
    //     }

    //     console.log(`Translated id ${videoId} to path ${videoRecord.videoPath}.`);

    //     const forwardRequest = http.request( // Forward the request to the video storage microservice.
    //         {
    //             host: VIDEO_STORAGE_HOST,
    //             port: VIDEO_STORAGE_PORT,
    //             path:`/video?path=${videoRecord.videoPath}`, // Video path now retrieved from the database.
    //             method: 'GET',
    //             headers: req.headers
    //         }, 
    //         forwardResponse => {
    //             res.writeHeader(forwardResponse.statusCode, forwardResponse.headers);
    //             forwardResponse.pipe(res);
    //         }
    //     );
        
    //     req.pipe(forwardRequest);
    // });

    app.get("/video", async (req, res) => {
    try {
        // 1️⃣ Validate query parameter
        if (!req.query.id) {
            return res.status(400).send("Missing video id");
        }

        if (!mongodb.ObjectId.isValid(req.query.id)) {
            return res.status(400).send("Invalid video id");
        }

        // 2️⃣ Convert to ObjectId
        const videoId = new mongodb.ObjectId(req.query.id);

        // 3️⃣ Look up video in MongoDB
        const videoRecord = await videosCollection.findOne({ _id: videoId });

        if (!videoRecord) {
            return res.sendStatus(404);
        }

        console.log(`Translated id ${videoId} to path ${videoRecord.videoPath}.`);

        // 4️⃣ Forward request to video storage service
        const forwardRequest = http.request(
            {
                host: VIDEO_STORAGE_HOST,
                port: VIDEO_STORAGE_PORT,
                path: `/video?path=${encodeURIComponent(videoRecord.videoPath)}`,
                method: "GET",
                headers: req.headers,
            },
            forwardResponse => {
                res.writeHead(forwardResponse.statusCode, forwardResponse.headers);
                forwardResponse.pipe(res);
            }
        );

        // 5️⃣ Error handling for forward request
        forwardRequest.on("error", err => {
            console.error("Error forwarding request:", err.message);
            res.sendStatus(502); // Bad Gateway
        });

        req.pipe(forwardRequest);

    } catch (err) {
        console.error("Unexpected error:", err);
        res.sendStatus(500);
    }
});


    //
    // Starts the HTTP server.
    //
    app.listen(PORT, () => {
        console.log(`Microservice listening, please load the data file db-fixture/videos.json into your database before testing this microservice.`);
    });
}

main()
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });