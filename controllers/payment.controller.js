const dotenv = require('dotenv');
const Flutterwave = require('flutterwave-node-v3');


// Load environment variables
dotenv.config();

// Initialize Flutterwave
const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);

// Card Charge Payment
const chargeCard = async (req, res) => {
    try {
        // Validate the request body for required fields
        const requiredFields = [
            "card_number", "cvv", "expiry_month", "expiry_year",
            "currency", "amount", "redirect_url", "fullname",
            "email", "phone_number", "tx_ref"
        ];

        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `Missing required field: ${field}` });
            }
        }

        const payload = {
            card_number: req.body.card_number,
            cvv: req.body.cvv,
            expiry_month: req.body.expiry_month,
            expiry_year: req.body.expiry_year,
            currency: req.body.currency,
            amount: req.body.amount,
            redirect_url: req.body.redirect_url,
            fullname: req.body.fullname,
            email: req.body.email,
            phone_number: req.body.phone_number,
            enckey: process.env.FLW_ENCRYPTION_KEY, // Ensure this is securely configured in your environment
            tx_ref: req.body.tx_ref,
        };

        // Make the card charge request
        const response = await flw.Charge.card(payload);

        // Handle the authorization requirements
        if (response.meta?.authorization?.mode === 'pin') {
            const pinPayload = {
                ...payload,
                authorization: { mode: 'pin', pin: req.body.pin }
            };

            const reCallCharge = await flw.Charge.card(pinPayload);

            if (reCallCharge.status !== 'success') {
                return res.status(400).json({ error: 'PIN authentication failed.' });
            }

            const validateResponse = await flw.Charge.validate({
                otp: req.body.otp,
                flw_ref: reCallCharge.data.flw_ref,
            });

            if (validateResponse.status === 'success') {
                return res.json({ message: 'Card charged successfully!', data: validateResponse });
            } else {
                return res.status(400).json({ error: 'OTP validation failed.' });
            }
        }

        if (response.meta?.authorization?.mode === 'redirect') {
            // If redirect is required, send the redirect URL
            return res.json({ redirectUrl: response.meta.authorization.redirect });
        }

        // If charge succeeds without additional authorization
        if (response.status === 'success') {
            return res.json({ message: 'Card charged successfully!', data: response });
        } else {
            // Handle charge failure
            return res.status(400).json({ error: response.message || 'Card charge failed. Please try again.' });
        }
    } catch (error) {
        console.error('Error charging card:', error);

        if (error.response) {
            // Handle API response errors
            return res.status(error.response.status || 500).json({
                error: error.response.data.message || 'An error occurred with the payment service.',
            });
        } else if (error.request) {
            // Handle network errors
            return res.status(503).json({ error: 'Unable to connect to the payment service. Please try again later.' });
        } else {
            // Handle unexpected runtime errors
            return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
        }
    }
};



// Mobile Money Payment for Rwanda (Updated)
const rw_mobile_money = async (req, res) => {
    try {
        // Validate the request body
        if (!req.body.email || !req.body.phone_number || !req.body.fullname) {
            return res.status(400).json({ error: 'Missing required fields: email, phone_number, or fullname.' });
        }

        // Prepare the payload for the payment
        const payload = {
            "tx_ref": `MC-${Date.now()}`,
            "order_id": "ORDER-123456",
            "amount": "200",
            "currency": "RWF",
            "email": req.body.email,
            "phone_number": req.body.phone_number,
            "fullname": req.body.fullname
        };

        // Make the mobile money request
        const response = await flw.MobileMoney.rwanda(payload);

        // Handle different authorization modes
        if (response.meta?.authorization?.mode === 'redirect') {
            return res.json({ redirectUrl: response.meta.authorization.redirect });
        } else if (response.status === 'success') {
            return res.json({
                message: 'Payment initiated successfully.',
                data: response
            });
        } else {
            // Handle specific response errors
            return res.status(400).json({
                error: response.message || 'Payment request failed. Please try again later.'
            });
        }
    } catch (error) {
        // Check for specific error cases
        if (error.response) {
            // If the error has a response (e.g., from an API)
            console.error('API error:', error.response.data);
            return res.status(error.response.status || 500).json({
                error: error.response.data.message || 'An error occurred with the payment service.'
            });
        } else if (error.request) {
            // If the error occurred while making the request
            console.error('Network error:', error.request);
            return res.status(503).json({ error: 'Unable to connect to the payment service. Please try again later.' });
        } else {
            // Handle unexpected errors
            console.error('Unexpected error:', error.message);
            return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
        }
    }
};

const reimburseMobileMoney = async (req, res) => {
    try {
        // Validate the required fields
        const { account_bank, account_number, amount, narration, currency, phone_number } = req.body;
        if (!account_bank || !account_number || !amount || !narration || !currency || !phone_number) {
            return res.status(400).json({
                error: "Missing required fields: account_bank, account_number, amount, narration, currency, phone_number."
            });
        }

        // Prepare the payload for the transfer
        const payload = {
            account_bank, // Bank or mobile money operator code (e.g., "MPS" for MTN Rwanda)
            account_number, // Recipient's phone number or account number
            amount, // Amount to send
            narration, // Transaction description
            currency, // Currency (e.g., "RWF")
            reference: `REF-${Date.now()}`, // Unique transaction reference
            callback_url: "https://yourdomain.com/callback-url" // Optional callback URL for webhook notifications
        };

        // Initiate the transfer
        const response = await flw.Transfer.initiate(payload);

        // Handle success or failure
        if (response.status === "success") {
            return res.status(200).json({
                message: "Reimbursement sent successfully!",
                data: response.data
            });
        } else {
            return res.status(400).json({
                error: response.message || "Failed to send reimbursement."
            });
        }
    } catch (error) {
        console.error("Error initiating reimbursement:", error);

        // Handle API or network errors
        if (error.response) {
            return res.status(error.response.status || 500).json({
                error: error.response.data.message || "An error occurred with the payment service."
            });
        } else if (error.request) {
            return res.status(503).json({ error: "Unable to connect to the payment service. Please try again later." });
        } else {
            return res.status(500).json({ error: "An unexpected error occurred. Please try again." });
        }
    }
};

module.exports = { chargeCard, rw_mobile_money };