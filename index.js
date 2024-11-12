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
    const hostname = new URL(url).hostname;

    dns.lookup(hostname, async (err, address) => {
      if (err) {
        return res.status(400).json({ error: "Invalid hostname" });
      }

      const getUrl = await UrlShortner.findOne({ original_url: url });
      if (getUrl) {
        return res.json({ original_url: getUrl.original_url, short_url: getUrl.short_url });
      }

      const count = await UrlShortner.countDocuments();
      const shortUrl = count + 1;

      const newURL = new UrlShortner({ original_url: url, short_url: shortUrl });
      await newURL.save();

      res.json({ original_url: url, short_url: shortUrl });
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
