// Web framework for handling HTTP requests
const express = require("express");

// File system module for reading video files
const fs = require("fs");

// RabbitMQ client library
const amqp = require("amqplib");


// Environment variable validation
// These checks ensure the service fails fast if misconfigured.
 
if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}

if (!process.env.RABBIT) {
    throw new Error("Please specify the name of the RabbitMQ host using environment variable RABBIT");
}

// Read configuration from environment variables
const PORT = process.env.PORT;
const RABBIT = process.env.RABBIT;

/*
 * Application entry point
 */
async function main() {

    // Connect to RabbitMQ
    console.log(`Connecting to RabbitMQ server at ${RABBIT}.`);
    const messagingConnection = await amqp.connect(RABBIT);
    console.log("Connected to RabbitMQ.");

    // Create a channel for publishing messages
    const messageChannel = await messagingConnection.createChannel();

    // Ensure the "viewed" exchange exists (fanout = broadcast)
    await messageChannel.assertExchange("viewed", "fanout");

    function broadcastViewedMessage(videoId) {
        console.log(`Publishing viewed-${videoId} message`);

        const msg = {
            videoId: videoId,
            event: `viewed-${videoId}`
        };

        // Publish message to RabbitMQ exchange
        messageChannel.publish(
            "viewed",
            "",
            Buffer.from(JSON.stringify(msg))
        );
    }

    // Create Express application
    const app = express();

    app.get("/video", async (req, res) => {

        const id = req.query.id;

        // Validate video ID
        if (id !== "1" && id !== "2") {
            return res.status(400).send("Invalid video id");
        }

        // avoids ENOENT errors caused by missing files inside the container filesystem.
        const videoPath = "./videos/SampleVideo_1280x720_1mb.mp4";

        // Read video file statistics (size, etc.)
        const stats = await fs.promises.stat(videoPath);

        // Send HTTP headers for video streaming
        res.writeHead(200, {
            "Content-Length": stats.size,
            "Content-Type": "video/mp4",
        });

        // Stream the video to the client
        fs.createReadStream(videoPath).pipe(res);

        // Notify other microservices that this video was viewed.
        broadcastViewedMessage(Number(id));
    });

    // Start HTTP server
    app.listen(PORT, () => {
        console.log("Microservice online.");
    });
}

// Start the application and handle startup errors
main().catch(err => {
    console.error("Microservice failed to start.");
    console.error(err && err.stack || err);
});
