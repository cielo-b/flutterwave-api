// Import dependencies
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const Flutterwave = require('flutterwave-node-v3');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize Flutterwave
const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);

// Mobile Money Payment for Rwanda
// Mobile Money Payment for Rwanda (Updated)
const rw_mobile_money = async (req, res) => {
    try {
      const payload = {
        "tx_ref": `MC-${Date.now()}`,
        "order_id": "ORDER-123456",
        "amount": "200",
        "currency": "RWF",
        "email": req.body.email, // Dynamically use the data sent by the frontend
        "phone_number": req.body.phone_number,
        "fullname": req.body.fullname
      };
  
      const response = await flw.MobileMoney.rwanda(payload);
  
      if (response.meta.authorization.mode === 'redirect') {
        // Send the redirect URL back to the frontend
        res.json({ redirectUrl: response.meta.authorization.redirect });
      } else {
        // Handle success or any other modes (e.g., PIN or OTP)
        res.json(response);
      }
    } catch (error) {
      console.log(error);
      res.status(500).send({ error: 'Payment request failed.' });
    }
  };
  

// Card Charge Payment
const chargeCard = async (req, res) => {
  try {
    const payload = {
      "card_number": req.body.card_number,
      "cvv": req.body.cvv,
      "expiry_month": req.body.expiry_month,
      "expiry_year": req.body.expiry_year,
      "currency": req.body.currency,
      "amount": req.body.amount,
      "redirect_url": req.body.redirect_url,
      "fullname": req.body.fullname,
      "email": req.body.email,
      "phone_number": req.body.phone_number,
      "enckey": process.env.FLW_ENCRYPTION_KEY,
      "tx_ref": req.body.tx_ref,
    };

    const response = await flw.Charge.card(payload);
    res.json(response);

    // Handle further authorization if required (PIN, OTP, etc.)
    if (response.meta.authorization.mode === 'pin') {
      let payload2 = { ...payload, authorization: { mode: 'pin', pin: req.body.pin }};
      const reCallCharge = await flw.Charge.card(payload2);

      const callValidate = await flw.Charge.validate({
        otp: req.body.otp,
        flw_ref: reCallCharge.data.flw_ref
      });
      console.log(callValidate);
      res.json(callValidate);
    }

    if (response.meta.authorization.mode === 'redirect') {
      const redirectUrl = response.meta.authorization.redirect;
      res.json({ redirectUrl });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: 'Payment failed.' });
  }
};

// Routes
app.post('/mobile-money', rw_mobile_money);
app.post('/charge-card', chargeCard);

// Listen on port 5000
app.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
});
