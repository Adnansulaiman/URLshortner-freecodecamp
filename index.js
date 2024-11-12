require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser')
const dns = require('dns')
const mongoose = require('mongoose')


// Basic Configuration
const port = process.env.PORT || 3000;


app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

//Mongoose configuration 
mongoose.connect(process.env.MONGO_URL,{
  useNewUrlParser:true,
  useUnifiedTopology:true
})

const urlShortnerSchema = new mongoose.Schema({
  original_url:{type:String,required:true},
  short_url:{type:Number,required:true,unique:true}

});

const UrlShortner = mongoose.model('UrlShortner',urlShortnerSchema);

function isValidUrl(url) {
  const urlPattern = /^(http:\/\/|https:\/\/)[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?$/;
  return urlPattern.test(url);
}

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', async (req, res) => {
  const { url } = req.body;
  if (!isValidUrl(url)) {
    return res.status(400).json({ error: "Invalid URL" });
  }
  try {
    // Parse and extract the hostname from the URL
    const hostname = new URL(url).hostname;

    // Check if the hostname is valid
    dns.lookup(hostname, async (err, address) => {
      if (err) {
        console.error(err);
        return res.status(400).json({ error: "Invalid Hostname" });
      } else {
        // Check if the URL already exists in the database
        const getUrl = await UrlShortner.findOne({ original_url: url });
        
        if (getUrl) {
          // If the URL exists, return the existing short URL
          return res.json({ original_url: getUrl.original_url, short_url: getUrl.short_url });
        }

        // If the URL does not exist, create a new short URL
        const shortUrl = Math.floor(Math.random() * 9999) + 1;
        const newURL = new UrlShortner({ original_url: url, short_url: shortUrl });

        // Save the new URL to the database
        await newURL.save();

        // Send the response with the new short URL
        res.json({ original_url: url, short_url: shortUrl });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get('/api/shorturl/:shorturl',async(req,res)=>{
  const {shorturl} = req.params;
  const getUrl = await UrlShortner.findOne({short_url:shorturl});
  if(getUrl){
    res.redirect(getUrl.original_url)
  }else{
    res.json({error:"No short URL found for the give input"})
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
