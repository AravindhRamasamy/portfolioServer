const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); 
const axios = require('axios'); 
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

app.use(express.json());

const ipDataFilePath = path.join(__dirname, 'ips.json');

const readIpsFromFile = () => {
  try {
    const data = fs.readFileSync(ipDataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeIpsToFile = (ips) => {
  fs.writeFileSync(ipDataFilePath, JSON.stringify(ips, null, 2), 'utf-8');
};

app.post('/store-ip', async (req, res) => {
  const token = process.env.IPINFO_TOKEN;; 
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (!ip) {
    return res.status(400).json({ error: 'IP is required' });
  }

  try {
    console.log(`Using IPINFO_TOKEN: ${token}`);
    console.log(`IP: ${ip}`);
    const response = await axios.get(`https://ipinfo.io/${ip}?token=${token}`);
    const { ip: fetchedIp, city, loc } = response.data;
    
    if (!loc) {
      return res.status(400).json({ error: 'Location data not available' });
    }

    const existingIps = readIpsFromFile();

    const ipExists = existingIps.some((entry) => entry.ip === fetchedIp);
    if (ipExists) {
      return res.status(400).json({ error: 'IP address already stored' });
    }

    const [lat, lon] = loc.split(',');
    const newIpEntry = {
      ip: fetchedIp,
      city,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      date: new Date().toISOString(),
    };
    existingIps.push(newIpEntry);

    writeIpsToFile(existingIps);

    res.status(200).json({ message: 'IP address stored successfully', data: newIpEntry });
  } catch (error) {
    console.error('Error fetching IP info:', error.message);
    res.status(500).json({ error: 'Failed to fetch IP information' });
  }
});

app.get('/ips', (req, res) => {
  const storedIps = readIpsFromFile();
  res.status(200).json(storedIps);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
