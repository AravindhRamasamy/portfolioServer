const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import CORS middleware
const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all requests (you can specify specific origins if needed)
app.use(cors());

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Path to the JSON file where IP data will be stored
const ipDataFilePath = path.join(__dirname, 'ips.json');

// Utility function to read IPs from the file
const readIpsFromFile = () => {
  try {
    const data = fs.readFileSync(ipDataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Utility function to write IPs to the file
const writeIpsToFile = (ips) => {
  fs.writeFileSync(ipDataFilePath, JSON.stringify(ips, null, 2), 'utf-8');
};

// Route to handle storing an IP address and location
app.post('/store-ip', (req, res) => {
  const { ip, city } = req.body;

  if (!ip || !city) {
    return res.status(400).json({ error: 'IP and city are required' });
  }

  // Read the existing IP addresses from the file
  const existingIps = readIpsFromFile();

  // Check if the IP already exists
  const ipExists = existingIps.some((entry) => entry.ip === ip);
  if (ipExists) {
    return res.status(400).json({ error: 'IP address already stored' });
  }

  // Add the new IP and city to the array
  const newIpEntry = { ip, city, date: new Date().toISOString() };
  existingIps.push(newIpEntry);

  // Write the updated IPs back to the file
  writeIpsToFile(existingIps);

  res.status(200).json({ message: 'IP address stored successfully', data: newIpEntry });
});

// Route to retrieve all stored IP addresses
app.get('/ips', (req, res) => {
  const storedIps = readIpsFromFile();
  res.status(200).json(storedIps);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
