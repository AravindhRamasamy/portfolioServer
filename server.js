const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose'); 
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch((err) => console.error('Error connecting to MongoDB:', err));

const ipSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true },
  city: { type: String },
  lat: { type: Number },
  lon: { type: Number },
  date: { type: Date, default: Date.now },
});

const IpModel = mongoose.model('IP', ipSchema);

app.post('/store-ip', async (req, res) => {
  const token = process.env.IPINFO_TOKEN;
  const forwardedIps = req.headers['x-forwarded-for'];
  const ip = forwardedIps ? forwardedIps.split(',')[0].trim() : req.connection.remoteAddress;

  if (!ip) {
    return res.status(400).json({ error: 'IP is required' });
  }

  try {
    console.log(`IP: ${ip}`);
    
    const response = await axios.get(`https://ipinfo.io/${ip}?token=${token}`);
    const { ip: fetchedIp, city, loc } = response.data;

    if (!loc) {
      return res.status(400).json({ error: 'Location data not available' });
    }

    const [lat, lon] = loc.split(',');

    // Check if the IP already exists
    let ipEntry = await IpModel.findOne({ ip: fetchedIp });
    
    if (ipEntry) {
      console.log('IP address already stored:', fetchedIp);
      return res.status(200).json({
        message: 'IP address already stored, but sending data',
        data: ipEntry,
      });
    }

    // Create a new entry if the IP does not exist
    ipEntry = new IpModel({
      ip: fetchedIp,
      city,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
    });

    await ipEntry.save();

    res.status(200).json({ message: 'IP address stored successfully', data: ipEntry });
  } catch (error) {
    console.error('Error fetching IP info:', error.message);
    res.status(500).json({ error: 'Failed to fetch IP information' });
  }
});

// Route to get all stored IPs
// app.get('/ips', async (req, res) => {
//   try {
//     const storedIps = await IpModel.find();
//     res.status(200).json(storedIps);
//   } catch (error) {
//     console.error('Error fetching stored IPs:', error.message);
//     res.status(500).json({ error: 'Failed to fetch stored IPs' });
//   }
// });

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
