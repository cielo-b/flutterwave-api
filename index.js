// Import dependencies
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const router = require('./routes/payment.routes');


// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Routes
app.use("/", router)

// Listen on port 5000
app.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
});
