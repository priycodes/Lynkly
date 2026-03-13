const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Url = require("./models/Url");

dotenv.config();

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

const MONGO_URL = process.env.MONGO_URL;

main()
.then(() => {
    console.log("connected to DB");
})
.catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}

app.get("/", (req,res)=>{
    res.render("index");
});

app.post("/shorten", async (req,res)=>{
    const {originalUrl} = req.body;
    const shortCode = Math.random().toString(36).substring(2,8);

    const newUrl = new Url({
        originalUrl,
        shortCode
    });

    await newUrl.save();

    const shortUrl = `http://localhost:8080/${shortCode}`;
    res.render("result",{shortUrl});
});

app.get("/:shortCode", async (req,res) => {
    const { shortCode } = req.params;
    const url = await Url.findOne({ shortCode });

    if(!url){
        return res.send("URL not found");
    }

    url.clicks++;
    await url.save();

    res.redirect(url.originalUrl);
});

app.get("/urls", async (req,res) => {
    const urls = await Url.find();
    res.send(urls);
});

app.listen(8080, () => {
    console.log("server is listening to port 8080");
});